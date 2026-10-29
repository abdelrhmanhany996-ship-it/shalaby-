// Builds a small real .xlsx (a zip of XML parts) for the browser test.
import { deflateRawSync } from "node:zlib";

export function makeXlsx(rows) {
  const strings = [];
  const si = (s) => (strings.includes(s) ? strings.indexOf(s) : strings.push(s) - 1);
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const col = (i) => String.fromCharCode(65 + i);
  const sheet = rows
    .map((r, ri) => `<row r="${ri + 1}">${r.map((c, ci) => (typeof c === "number" ? `<c r="${col(ci)}${ri + 1}"><v>${c}</v></c>` : `<c r="${col(ci)}${ri + 1}" t="s"><v>${si(c)}</v></c>`)).join("")}</row>`)
    .join("");
  const files = {
    "[Content_Types].xml": "<Types/>",
    "xl/workbook.xml": '<workbook xmlns:r="r"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>',
    "xl/_rels/workbook.xml.rels": '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>',
    "xl/worksheets/sheet1.xml": `<worksheet><sheetData>${sheet}</sheetData></worksheet>`,
    "xl/sharedStrings.xml": `<sst>${strings.map((s) => `<si><t>${esc(s)}</t></si>`).join("")}</sst>`,
  };
  const locals = [];
  const central = [];
  let offset = 0;
  for (const [name, text] of Object.entries(files)) {
    const raw = Buffer.from(text);
    const data = deflateRawSync(raw);
    const n = Buffer.from(name);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(8, 8);
    lh.writeUInt32LE(data.length, 18);
    lh.writeUInt32LE(raw.length, 22);
    lh.writeUInt16LE(n.length, 26);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0);
    ch.writeUInt16LE(8, 10);
    ch.writeUInt32LE(data.length, 20);
    ch.writeUInt32LE(raw.length, 24);
    ch.writeUInt16LE(n.length, 28);
    ch.writeUInt32LE(offset, 42);
    locals.push(lh, n, data);
    central.push(ch, n);
    offset += lh.length + n.length + data.length;
  }
  const cd = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(central.length / 2, 8);
  end.writeUInt16LE(central.length / 2, 10);
  end.writeUInt32LE(cd.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, end]);
}
