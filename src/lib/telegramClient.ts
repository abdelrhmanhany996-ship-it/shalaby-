import { auth } from "./firebase";

/** The CRM's Telegram bridge (public/api/telegram.php). The bot token lives on the server only. */
const ENDPOINT = "/api/telegram.php";

export interface TgMessage {
  id: number;
  date: number;
  fromId: string | null;
  fromName: string;
  username: string | null;
  isBot: boolean;
  kind: "text" | "photo" | "document" | "voice" | "video" | "sticker" | "location" | "service";
  text: string | null;
  fileId: string | null;
  fileName: string | null;
  replyTo: number | null;
  edited: boolean;
  /** Set when an employee sent it from the CRM. */
  sentBy: string | null;
}
export interface TgChat {
  chatId: string;
  title: string;
  type: string;
  lastAt: number;
  lastText: string;
  member: boolean;
  count: number;
}
export interface TgStatus {
  bot: { username: string | null; name: string | null; readsAllMessages: boolean };
  webhook: { connected: boolean; pending: number; lastError: string | null };
}

const errors: Record<string, string> = {
  not_configured: "البوت لسه متربطش. صاحب البيزنس يربطه من «إعداد البوت».",
  not_linked: "الجروب ده لسه مش مربوط بشات تليجرام.",
  forbidden: "مش مسموحلك تفتح الجروب ده.",
  unauthorized: "سجّل دخولك تاني.",
  bad_token: "توكن البوت غلط. انسخه زي ما هو من BotFather.",
  webhook_failed: "تليجرام رفض الربط. جرّب تاني.",
  send_failed: "الرسالة ماتبعتتش. اتأكد إن البوت لسه في الجروب.",
  cannot_save: "السيرفر مقدرش يحفظ التوكن.",
  bad_text: "الرسالة فاضية أو طويلة جدًا.",
};

async function post(body: Record<string, unknown>): Promise<Response> {
  const token = await auth.currentUser?.getIdToken();
  return fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
}

async function call<T>(body: Record<string, unknown>): Promise<T> {
  let res: Response;
  try {
    res = await post(body);
  } catch {
    throw new Error("مفيش اتصال بالسيرفر.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(errors[data?.error] ?? "حصلت مشكلة في الاتصال بتليجرام.");
  return data as T;
}

export async function telegramConfigured(): Promise<boolean> {
  try {
    const res = await fetch(`${ENDPOINT}?ping=1`, { cache: "no-store" });
    return !!(await res.json())?.configured;
  } catch {
    return false;
  }
}

export const telegramStatus = () => call<TgStatus>({ action: "status" });
export const setupTelegram = (token: string) => call<TgStatus>({ action: "setup", token });
export const telegramChats = () => call<{ chats: TgChat[] }>({ action: "chats" }).then((d) => d.chats);
export const telegramMessages = (groupId: string, after: number) => call<{ rev: number; messages: TgMessage[] }>({ action: "messages", groupId, after });
export const sendTelegram = (groupId: string, text: string) => call<{ ok: true; id: number }>({ action: "send", groupId, text });

/** A photo or file from the chat, as an object URL (revoke it when done). */
export async function telegramFile(groupId: string, fileId: string): Promise<string> {
  const res = await post({ action: "file", groupId, fileId });
  if (!res.ok) throw new Error("الملف مش متاح.");
  return URL.createObjectURL(await res.blob());
}

/** Merges a page of messages into the list (edits replace, new ones append), oldest first. */
export function mergeMessages(list: TgMessage[], page: TgMessage[]): TgMessage[] {
  if (!page.length) return list;
  const byId = new Map(list.map((m) => [m.id, m]));
  for (const m of page) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => a.id - b.id);
}
