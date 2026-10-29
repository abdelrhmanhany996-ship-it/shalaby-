import type { SalesStatement, SalesStatementRows } from "../types/crm";
import { numericTotals, type Sheet } from "./spreadsheet";

/** Firestore keeps a document under 1 MiB; the rows stay well below that. */
export const MAX_ROWS_JSON = 900_000;

/**
 * The header row: the first of the top rows that is (nearly) as wide as the table. Statements often start with a title or the
 * company name in the first cell, above the real column names.
 */
export function headerIndex(rows: string[][]): number {
  const filled = (r: string[]) => r.filter((c) => c !== "").length;
  const top = rows.slice(0, 10);
  const widest = Math.max(0, ...top.map(filled));
  const i = top.findIndex((r) => filled(r) >= Math.max(1, Math.ceil(widest * 0.6)));
  return i < 0 ? 0 : i;
}

export interface StatementInput {
  title: string;
  fileName: string;
  sheet: Sheet;
  branchId: string;
  branchName?: string;
  month?: string;
  note?: string;
}

export function buildStatement(input: StatementInput, id: string, by: { id: string; name: string }, now: string): { statement: SalesStatement; rows: SalesStatementRows } {
  const title = input.title.trim();
  if (title.length < 2 || title.length > 120) throw new Error("اكتب اسم للبيان (من حرفين لـ 120).");
  if (!input.branchId) throw new Error("اختار الفرع.");
  if (input.month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(input.month)) throw new Error("الشهر غير صحيح.");
  const h = headerIndex(input.sheet.rows);
  const headers = (input.sheet.rows[h] ?? []).map((c, i) => c || `عمود ${i + 1}`);
  const body = input.sheet.rows.slice(h + 1);
  if (!headers.length) throw new Error("الملف فاضي، مفيش فيه بيانات.");
  const rowsJson = JSON.stringify(body);
  if (rowsJson.length > MAX_ROWS_JSON) throw new Error("الملف كبير جدًا. قسّمه لأكتر من ملف (كل ملف أقل من حوالي 5000 صف).");
  const note = input.note?.trim().slice(0, 300);
  const statement: SalesStatement = {
    id,
    title,
    fileName: input.fileName.slice(0, 160),
    sheetName: input.sheet.name.slice(0, 80),
    branchId: input.branchId,
    ...(input.branchName ? { branchName: input.branchName } : {}),
    ...(input.month ? { month: input.month } : {}),
    ...(note ? { note } : {}),
    headers,
    rowCount: body.length,
    totals: numericTotals(headers, body),
    uploadedById: by.id,
    uploadedByName: by.name,
    createdAt: now,
  };
  return { statement, rows: { id, branchId: input.branchId, uploadedById: by.id, rowsJson } };
}

/** The stored rows, or an empty table when the document is damaged. */
export function parseRows(doc: Pick<SalesStatementRows, "rowsJson"> | null | undefined): string[][] {
  try {
    const v = JSON.parse(doc?.rowsJson ?? "[]");
    return Array.isArray(v) ? v.filter(Array.isArray).map((r) => r.map((c: unknown) => String(c ?? ""))) : [];
  } catch {
    return [];
  }
}

export function filterStatements(list: SalesStatement[], q: string, branchId: string, month: string): SalesStatement[] {
  const text = q.trim().toLowerCase();
  return list
    .filter((s) => (!branchId || s.branchId === branchId) && (!month || s.month === month) && (!text || `${s.title} ${s.fileName} ${s.uploadedByName} ${s.note ?? ""}`.toLowerCase().includes(text)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
