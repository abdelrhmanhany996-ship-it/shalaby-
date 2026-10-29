/**
 * Reads Excel (.xlsx) and CSV files in the browser, with no library: an .xlsx file is a zip of XML parts, unpacked with the
 * browser's own DecompressionStream. Old binary .xls files are not supported; Excel saves them as .xlsx in one step.
 */

export interface Sheet {
  name: string;
  rows: string[][];
}

export const MAX_ROWS = 5000;
export const MAX_COLS = 60;
const MAX_CELL = 300;

// ---------- zip ----------

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** The files inside a zip, by name (only the ones `want` accepts are unpacked). */
export async function unzip(buf: Uint8Array, want: (name: string) => boolean): Promise<Map<string, Uint8Array>> {
  const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65_557); i--) {
    if (v.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("bad_zip");
  const count = v.getUint16(eocd + 10, true);
  let p = v.getUint32(eocd + 16, true);
  const out = new Map<string, Uint8Array>();
  const dec = new TextDecoder();
  for (let n = 0; n < count; n++) {
    if (v.getUint32(p, true) !== 0x02014b50) throw new Error("bad_zip");
    const method = v.getUint16(p + 10, true);
    const size = v.getUint32(p + 20, true);
    const nameLen = v.getUint16(p + 28, true);
    const extraLen = v.getUint16(p + 30, true);
    const commentLen = v.getUint16(p + 32, true);
    const local = v.getUint32(p + 42, true);
    const name = dec.decode(buf.subarray(p + 46, p + 46 + nameLen));
    p += 46 + nameLen + extraLen + commentLen;
    if (!want(name)) continue;
    const start = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true);
    const raw = buf.subarray(start, start + size);
    if (method === 0) out.set(name, raw);
    else if (method === 8) out.set(name, await inflateRaw(raw));
    else throw new Error("bad_zip");
  }
  return out;
}

// ---------- xml ----------

const entities: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const unescape = (s: string) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e: string) =>
    e[0] === "#" ? String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : entities[e.toLowerCase()],
  );
const attr = (tag: string, name: string) => {
  const m = tag.match(new RegExp(`\\s${name}="([^"]*)"`));
  return m ? unescape(m[1]) : undefined;
};
/** Text of every <t> inside a fragment (rich text is split into runs). */
const texts = (xml: string) => [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => unescape(m[1])).join("");

const colIndex = (ref: string) => {
  let n = 0;
  for (const ch of ref.replace(/\d+$/, "")) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
};

// Built-in number formats that are dates: 14-22, 27-36, 45-47, 50-58.
const DATE_IDS = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 45, 46, 47, 50, 51, 52, 53, 54, 55, 56, 57, 58]);

function dateStyles(styles: string | undefined): Set<number> {
  const out = new Set<number>();
  if (!styles) return out;
  const custom = new Map<number, string>();
  for (const m of styles.matchAll(/<numFmt\s[^>]*>/g)) custom.set(Number(attr(m[0], "numFmtId")), attr(m[0], "formatCode") ?? "");
  const xfs = styles.match(/<cellXfs[^>]*>([\s\S]*?)<\/cellXfs>/)?.[1] ?? "";
  [...xfs.matchAll(/<xf\s[^>]*?\/?>/g)].forEach((m, i) => {
    const id = Number(attr(m[0], "numFmtId") ?? 0);
    const code = (custom.get(id) ?? "").replace(/"[^"]*"|\[[^\]]*\]|\\./g, "");
    if (DATE_IDS.has(id) || /[dy]/i.test(code) || (/m/i.test(code) && !/[h:s]/i.test(code) && /[dy/]/i.test(code))) out.add(i);
  });
  return out;
}

const serialToDate = (n: number) => {
  const d = new Date(Math.round((n - 25569) * 86_400_000));
  return Number.isNaN(d.getTime()) ? String(n) : d.toISOString().slice(0, 10);
};

const clip = (s: string) => (s.length > MAX_CELL ? s.slice(0, MAX_CELL) : s);

export async function readXlsx(buf: Uint8Array): Promise<Sheet[]> {
  const files = await unzip(buf, (n) => n === "xl/workbook.xml" || n === "xl/_rels/workbook.xml.rels" || n === "xl/sharedStrings.xml" || n === "xl/styles.xml" || /^xl\/worksheets\/[^/]+\.xml$/.test(n));
  const dec = new TextDecoder();
  const text = (n: string) => (files.has(n) ? dec.decode(files.get(n)) : undefined);
  const workbook = text("xl/workbook.xml");
  if (!workbook) throw new Error("bad_zip");
  const shared = [...(text("xl/sharedStrings.xml") ?? "").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => texts(m[1]));
  const dates = dateStyles(text("xl/styles.xml"));
  const rels = new Map<string, string>();
  for (const m of (text("xl/_rels/workbook.xml.rels") ?? "").matchAll(/<Relationship\s[^>]*>/g)) {
    const target = attr(m[0], "Target") ?? "";
    rels.set(attr(m[0], "Id") ?? "", target.startsWith("/") ? target.slice(1) : `xl/${target}`);
  }
  const sheets: Sheet[] = [];
  for (const m of workbook.matchAll(/<sheet\s[^>]*>/g)) {
    const path = rels.get(attr(m[0], "r:id") ?? "") ?? "";
    const xml = text(path);
    if (!xml) continue;
    const rows: string[][] = [];
    for (const r of xml.matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
      if (rows.length > MAX_ROWS) break;
      const rowNo = Number(attr(r[0], "r") ?? rows.length + 1) - 1;
      const row: string[] = [];
      let next = 0;
      for (const c of (r[2] ?? "").matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const tag = `<c${c[1]}>`;
        const ref = attr(tag, "r");
        const col = ref ? colIndex(ref) : next;
        next = col + 1;
        if (col >= MAX_COLS) continue;
        const t = attr(tag, "t");
        const body = c[2] ?? "";
        const v = body.match(/<v>([\s\S]*?)<\/v>/)?.[1];
        let value = "";
        if (t === "s") value = shared[Number(v)] ?? "";
        else if (t === "inlineStr") value = texts(body);
        else if (t === "b") value = v === "1" ? "TRUE" : "FALSE";
        else if (v !== undefined) {
          value = unescape(v);
          const num = Number(value);
          if (t !== "str" && t !== "e" && Number.isFinite(num) && dates.has(Number(attr(tag, "s") ?? -1))) value = serialToDate(num);
        }
        row[col] = clip(value.trim());
      }
      while (rows.length < rowNo && rows.length < MAX_ROWS) rows.push([]);
      rows.push(Array.from(row, (x) => x ?? ""));
    }
    sheets.push({ name: attr(m[0], "name") ?? `Sheet${sheets.length + 1}`, rows: tidy(rows) });
  }
  return sheets;
}

// ---------- csv ----------

export function decodeText(buf: Uint8Array): string {
  const utf8 = new TextDecoder("utf-8").decode(buf);
  // Excel on Arabic Windows saves CSV as windows-1256, which reads as broken characters in UTF-8.
  if (utf8.includes("�")) {
    try {
      return new TextDecoder("windows-1256").decode(buf);
    } catch {
      /* the browser does not know that encoding */
    }
  }
  return utf8.replace(/^﻿/, "");
}

export function readCsv(text: string): Sheet[] {
  const first = text.split(/\r?\n/, 1)[0] ?? "";
  const delim = [",", ";", "\t"].map((d) => [d, first.split(d).length] as const).sort((a, b) => b[1] - a[1])[0][0];
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') (cell += '"'), i++;
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell === "") quoted = true;
    else if (ch === delim) row.push(cell), (cell = "");
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell), rows.push(row), (row = []), (cell = "");
      if (rows.length > MAX_ROWS) break;
    } else cell += ch;
  }
  if (cell !== "" || row.length) row.push(cell), rows.push(row);
  return [{ name: "CSV", rows: tidy(rows.map((r) => r.slice(0, MAX_COLS).map((c) => clip(c.trim())))) }];
}

/** Drops empty rows and empty trailing columns, and squares the table. */
export function tidy(rows: string[][]): string[][] {
  const kept = rows.filter((r) => r.some((c) => c !== ""));
  const width = kept.reduce((w, r) => Math.max(w, r.reduce((last, c, i) => (c !== "" ? i + 1 : last), 0)), 0);
  return kept.map((r) => Array.from({ length: width }, (_, i) => r[i] ?? ""));
}

export type ReadError = "unsupported" | "xls" | "unreadable" | "empty";
export const readErrorText: Record<ReadError, string> = {
  unsupported: "نوع الملف مش مدعوم. ارفع ملف Excel ‏(.xlsx) أو CSV.",
  xls: "الملف بصيغة Excel القديمة (.xls). افتحه في Excel واحفظه باسم «Excel Workbook (.xlsx)» وارفعه تاني.",
  unreadable: "الملف ده مش قادر أقراه. اتأكد إنه ملف Excel سليم ومش محمي بباسورد.",
  empty: "الملف فاضي، مفيش فيه بيانات.",
};

export async function readSpreadsheet(name: string, buf: Uint8Array): Promise<{ sheets: Sheet[] } | { error: ReadError }> {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  const isZip = buf[0] === 0x50 && buf[1] === 0x4b;
  const isOle = buf[0] === 0xd0 && buf[1] === 0xcf;
  let sheets: Sheet[];
  try {
    if (isZip && ["xlsx", "xlsm"].includes(ext)) sheets = await readXlsx(buf);
    else if (isOle || ext === "xls") return { error: "xls" };
    else if (["csv", "txt", "tsv"].includes(ext)) sheets = readCsv(decodeText(buf));
    else return { error: "unsupported" };
  } catch {
    return { error: "unreadable" };
  }
  sheets = sheets.filter((s) => s.rows.length);
  return sheets.length ? { sheets } : { error: "empty" };
}

// ---------- numbers ----------

/** A cell as a number: Arabic digits, thousands separators and a currency word are accepted. */
export function toNumber(cell: string): number | null {
  const s = cell
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[٫]/g, ".")
    .replace(/[,٬\s]/g, "")
    .replace(/(ج\.?م\.?|جنيه|EGP|LE)$/i, "");
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  return Number(s);
}

/** Columns where (nearly) every filled cell is a number, with their sum. */
export function numericTotals(headers: string[], rows: string[][]): { column: string; sum: number }[] {
  const out: { column: string; sum: number }[] = [];
  headers.forEach((h, i) => {
    const filled = rows.map((r) => r[i] ?? "").filter((c) => c !== "");
    if (filled.length < 1) return;
    const nums = filled.map(toNumber).filter((n): n is number => n !== null);
    // Serial numbers and phone numbers are numbers too; skip columns whose title says they are ids.
    if (nums.length / filled.length < 0.8 || /كود|رقم|هاتف|موبايل|تليفون|id|code|phone|mobile|serial|#/i.test(h)) return;
    out.push({ column: h || `عمود ${i + 1}`, sum: Math.round(nums.reduce((a, b) => a + b, 0) * 100) / 100 });
  });
  return out.slice(0, 8);
}

/** The table as CSV text (UTF-8 with BOM, so Excel shows Arabic correctly). */
export function toCsv(headers: string[], rows: string[][]): string {
  const esc = (c: string) => (/[",\n\r]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c);
  return "﻿" + [headers, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
}
