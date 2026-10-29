import test from "node:test";
import assert from "node:assert/strict";
import { deflateRawSync } from "node:zlib";
import { numericTotals, readCsv, readSpreadsheet, toCsv, toNumber, decodeText } from "../src/lib/spreadsheet";
import { buildStatement, headerIndex, parseRows, filterStatements } from "../src/lib/salesStatements";

/** A minimal zip writer (deflate for most entries, stored for one), enough to build a real .xlsx. */
function zip(files: Record<string, string>): Uint8Array {
  const enc = new TextEncoder();
  const locals: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  Object.entries(files).forEach(([name, text], i) => {
    const raw = Buffer.from(enc.encode(text));
    const stored = i === 0;
    const data = stored ? raw : deflateRawSync(raw);
    const n = Buffer.from(name);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(stored ? 0 : 8, 8);
    lh.writeUInt32LE(data.length, 18);
    lh.writeUInt32LE(raw.length, 22);
    lh.writeUInt16LE(n.length, 26);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0);
    ch.writeUInt16LE(stored ? 0 : 8, 10);
    ch.writeUInt32LE(data.length, 20);
    ch.writeUInt32LE(raw.length, 24);
    ch.writeUInt16LE(n.length, 28);
    ch.writeUInt32LE(offset, 42);
    locals.push(lh, n, data);
    central.push(ch, n);
    offset += lh.length + n.length + data.length;
  });
  const cd = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Object.keys(files).length, 8);
  end.writeUInt16LE(Object.keys(files).length, 10);
  end.writeUInt32LE(cd.length, 12);
  end.writeUInt32LE(offset, 16);
  return new Uint8Array(Buffer.concat([...locals, cd, end]));
}

const xlsx = zip({
  "[Content_Types].xml": "<Types/>",
  "xl/workbook.xml": `<workbook xmlns:r="r"><sheets><sheet name="مبيعات أكتوبر" sheetId="1" r:id="rId1"/><sheet name="فاضي" sheetId="2" r:id="rId2"/></sheets></workbook>`,
  "xl/_rels/workbook.xml.rels": `<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Target="/xl/worksheets/sheet2.xml"/></Relationships>`,
  "xl/sharedStrings.xml": `<sst><si><t>مؤسسة شلبي - بيان بيع</t></si><si><t>العميل</t></si><si><t>المبلغ</t></si><si><t>التاريخ</t></si><si><r><t>أحمد </t></r><r><t>علي</t></r></si><si><t>Tom &amp; Co</t></si><si><t>رقم الفاتورة</t></si></sst>`,
  "xl/styles.xml": `<styleSheet><numFmts count="1"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/></numFmts><cellXfs count="3"><xf numFmtId="0"/><xf numFmtId="164"/><xf numFmtId="14"/></cellXfs></styleSheet>`,
  "xl/worksheets/sheet1.xml": `<worksheet><sheetData>
    <row r="1"><c r="A1" t="s"><v>0</v></c></row>
    <row r="3"><c r="A3" t="s"><v>1</v></c><c r="B3" t="s"><v>2</v></c><c r="C3" t="s"><v>3</v></c><c r="D3" t="s"><v>6</v></c></row>
    <row r="4"><c r="A4" t="s"><v>4</v></c><c r="B4"><v>1500.5</v></c><c r="C4" s="1"><v>45580</v></c><c r="D4"><v>1001</v></c></row>
    <row r="5"><c r="A5" t="s"><v>5</v></c><c r="B5"><v>2500</v></c><c r="C5" s="2"><v>45581</v></c><c r="D5"><v>1002</v></c></row>
    <row r="6"><c r="A6" t="inlineStr"><is><t>نقدي</t></is></c><c r="C6" t="str"><v>بدون</v></c></row>
  </sheetData></worksheet>`,
  "xl/worksheets/sheet2.xml": `<worksheet><sheetData/></worksheet>`,
});

test("reads a real .xlsx: shared and rich strings, inline strings, dates, gaps and empty sheets", async () => {
  const res = await readSpreadsheet("october.xlsx", xlsx);
  assert.ok("sheets" in res);
  assert.equal(res.sheets.length, 1, "the empty sheet is dropped");
  const s = res.sheets[0];
  assert.equal(s.name, "مبيعات أكتوبر");
  assert.deepEqual(s.rows[0], ["مؤسسة شلبي - بيان بيع", "", "", ""]);
  assert.deepEqual(s.rows[1], ["العميل", "المبلغ", "التاريخ", "رقم الفاتورة"]);
  assert.deepEqual(s.rows[2], ["أحمد علي", "1500.5", "2024-10-15", "1001"]);
  assert.deepEqual(s.rows[3], ["Tom & Co", "2500", "2024-10-16", "1002"]);
  assert.deepEqual(s.rows[4], ["نقدي", "", "بدون", ""]);
});

test("the header row skips a title line; totals add money columns but not invoice numbers", async () => {
  const res = await readSpreadsheet("october.xlsx", xlsx);
  assert.ok("sheets" in res);
  const { statement, rows } = buildStatement(
    { title: "بيان أكتوبر", fileName: "october.xlsx", sheet: res.sheets[0], branchId: "b1", month: "2024-10" },
    "ss-1",
    { id: "u1", name: "أحمد" },
    "2024-10-20T10:00:00.000Z",
  );
  assert.equal(headerIndex(res.sheets[0].rows), 1);
  assert.deepEqual(statement.headers, ["العميل", "المبلغ", "التاريخ", "رقم الفاتورة"]);
  assert.equal(statement.rowCount, 3);
  assert.deepEqual(statement.totals, [{ column: "المبلغ", sum: 4000.5 }]);
  assert.equal(parseRows(rows).length, 3);
  assert.equal(rows.branchId, "b1");
  assert.equal(rows.uploadedById, "u1");
});

test("old .xls, unknown types and broken files get a clear reason", async () => {
  assert.deepEqual(await readSpreadsheet("a.xls", new Uint8Array([0xd0, 0xcf, 0x11, 0xe0])), { error: "xls" });
  assert.deepEqual(await readSpreadsheet("a.pdf", new Uint8Array([1, 2, 3])), { error: "unsupported" });
  assert.deepEqual(await readSpreadsheet("a.xlsx", new Uint8Array([0x50, 0x4b, 3, 4, 0, 0])), { error: "unreadable" });
  assert.deepEqual(await readSpreadsheet("a.csv", new TextEncoder().encode("\n\n")), { error: "empty" });
});

test("CSV: quotes, semicolons, BOM and Arabic Windows encoding", () => {
  const [s] = readCsv('الاسم;المبلغ\r\n"شلبي; وشركاه";"1,200"\r\n"قال ""أهلا""";300\r\n');
  assert.deepEqual(s.rows, [["الاسم", "المبلغ"], ["شلبي; وشركاه", "1,200"], ['قال "أهلا"', "300"]]);
  assert.equal(decodeText(new Uint8Array([0xef, 0xbb, 0xbf, 0x61])), "a");
  // "شلبي" in windows-1256
  assert.equal(decodeText(new Uint8Array([0xd4, 0xe1, 0xc8, 0xed])), "شلبي");
});

test("numbers in Arabic digits and with separators; CSV export opens in Excel", () => {
  assert.equal(toNumber("١٬٢٣٤٫٥"), 1234.5);
  assert.equal(toNumber("2,500 ج.م"), 2500);
  assert.equal(toNumber("abc"), null);
  assert.deepEqual(numericTotals(["الموبايل", "الإجمالي"], [["0100", "10"], ["0111", "٢٠"]]), [{ column: "الإجمالي", sum: 30 }]);
  assert.equal(toCsv(["a", "b"], [["x,y", 'q"']]), '﻿a,b\r\n"x,y","q"""');
});

test("a statement needs a title and a branch; filters by branch, month and text", () => {
  const sheet = { name: "S", rows: [["a"], ["1"]] };
  assert.throws(() => buildStatement({ title: "x", fileName: "f", sheet, branchId: "b1" }, "i", { id: "u", name: "n" }, "t"));
  assert.throws(() => buildStatement({ title: "بيان", fileName: "f", sheet, branchId: "" }, "i", { id: "u", name: "n" }, "t"));
  const a = buildStatement({ title: "بيان الجيزة", fileName: "f", sheet, branchId: "b1", month: "2024-10" }, "a", { id: "u", name: "n" }, "2024-10-01").statement;
  const b = buildStatement({ title: "بيان المعادي", fileName: "f", sheet, branchId: "b2", month: "2024-11" }, "b", { id: "u", name: "n" }, "2024-11-01").statement;
  assert.deepEqual(filterStatements([a, b], "", "", "").map((s) => s.id), ["b", "a"]);
  assert.deepEqual(filterStatements([a, b], "", "b1", "").map((s) => s.id), ["a"]);
  assert.deepEqual(filterStatements([a, b], "المعادي", "", "").map((s) => s.id), ["b"]);
  assert.deepEqual(filterStatements([a, b], "", "", "2024-10").map((s) => s.id), ["a"]);
});
