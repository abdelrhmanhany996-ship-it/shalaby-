import type { TelegramGroup } from "../types/crm";

/**
 * Telegram group links. Only real Telegram links are accepted, so a link on this page can never send
 * someone to another site: https://t.me/..., https://telegram.me/... or tg://join?invite=...
 */
const WEB = /^https:\/\/(t\.me|telegram\.me)\/[A-Za-z0-9_+\-/]{2,100}$/;
const APP = /^tg:\/\/(join\?invite|resolve\?domain)=[A-Za-z0-9_\-]{2,100}$/;

/** The cleaned link, or null when it is not a Telegram link. Accepts "t.me/xyz" and "@name" typed by hand. */
export function normalizeTelegramLink(input: string): string | null {
  let s = input.trim();
  if (!s) return null;
  if (APP.test(s)) return s;
  if (/^@[A-Za-z0-9_]{4,32}$/.test(s)) s = `https://t.me/${s.slice(1)}`;
  else if (/^(t\.me|telegram\.me)\//i.test(s)) s = `https://${s}`;
  // tracking parameters and fragments are dropped; only the path identifies the group
  s = s.replace(/^http:\/\//i, "https://").replace(/[?#].*$/, "").replace(/\/$/, "");
  return WEB.test(s) ? s : null;
}

export interface GroupInput {
  name: string;
  link: string;
  description?: string;
  branchId?: string;
  /** The bot's chat for this group; null unlinks it. */
  chatId?: string | null;
  chatTitle?: string;
}

const CHAT_ID = /^-?\d{3,20}$/;

export function newGroup(input: GroupInput, id: string, by: { id: string; name: string }, now: string): TelegramGroup {
  const name = input.name.trim();
  if (name.length < 2 || name.length > 80) throw new Error("اكتب اسم الجروب (من حرفين لـ 80).");
  const chatId = input.chatId && CHAT_ID.test(input.chatId) ? input.chatId : undefined;
  if (input.chatId && !chatId) throw new Error("الشات ده مش صحيح.");
  const link = input.link.trim() ? normalizeTelegramLink(input.link) : chatId ? "" : null;
  if (link === null) throw new Error("اللينك لازم يكون لينك تليجرام (t.me/… أو @اسم).");
  const description = input.description?.trim().slice(0, 300);
  return {
    id,
    name,
    link,
    ...(description ? { description } : {}),
    ...(input.branchId ? { branchId: input.branchId } : {}),
    ...(chatId ? { chatId, ...(input.chatTitle ? { chatTitle: input.chatTitle.slice(0, 120) } : {}) } : {}),
    active: true,
    createdAt: now,
    createdById: by.id,
    createdByName: by.name,
  };
}

/** The group with the edited fields; the link is checked again. */
export function edited(group: TelegramGroup, input: GroupInput, now: string): TelegramGroup {
  // The chat link is kept unless the input changes it (undefined keeps, null unlinks).
  const chat = input.chatId === undefined ? { chatId: group.chatId, chatTitle: group.chatTitle } : { chatId: input.chatId ?? undefined, chatTitle: input.chatId ? input.chatTitle : undefined };
  const next = newGroup({ ...input, chatId: chat.chatId, chatTitle: chat.chatTitle }, group.id, { id: group.createdById, name: group.createdByName }, group.createdAt);
  return { ...group, name: next.name, link: next.link, description: next.description, branchId: next.branchId, chatId: next.chatId, chatTitle: next.chatTitle, updatedAt: now };
}

export function filterGroups(groups: TelegramGroup[], q: string, branchId: string): TelegramGroup[] {
  const text = q.trim().toLowerCase();
  return groups
    .filter((g) => (!branchId || (branchId === "none" ? !g.branchId : g.branchId === branchId)) && (!text || `${g.name} ${g.description ?? ""}`.toLowerCase().includes(text)))
    .sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name, "ar"));
}
