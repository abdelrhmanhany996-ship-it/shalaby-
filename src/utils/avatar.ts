import { User } from '../types';

// One stable color per name, so the same person always gets the same badge
const COLORS = ['#4f46e5', '#7c3aed', '#db2777', '#dc2626', '#ea580c', '#d97706', '#059669', '#0891b2', '#2563eb', '#475569'];

export const colorFor = (name: string) => {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.codePointAt(0)!) >>> 0;
  return COLORS[hash % COLORS.length];
};

const escapeXml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export const letterAvatar = (name: string) => {
  const clean = name.trim();
  const letter = clean ? Array.from(clean)[0].toUpperCase() : '?';
  const body =
    `<rect width="64" height="64" fill="${colorFor(clean || '?')}"/>` +
    `<text x="32" y="33" text-anchor="middle" dominant-baseline="central" fill="#fff" ` +
    `font-family="Cairo, 'Segoe UI', Tahoma, Arial, sans-serif" font-size="30" font-weight="700">${escapeXml(letter)}</text>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${body}</svg>`)}`;
};

// Stock placeholder photos (one woman's photo was given to everyone) become the name's first letter;
// a photo someone actually set is kept.
const isPlaceholder = (url?: string) => !url || url.includes('images.unsplash.com') || url.startsWith('data:image/svg+xml');

export const avatarFor = (user: Pick<User, 'avatar' | 'name'> | null | undefined) =>
  user && !isPlaceholder(user.avatar) ? user.avatar : letterAvatar(user?.name || '');
