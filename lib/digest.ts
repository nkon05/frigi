// Client-side daily digest: what needs attention in the pantry today.
import { daysLeft, todayISO, type PantryItem } from "@/lib/pantry";

export const DIGEST_WINDOW_DAYS = 3;

export type Digest = {
  expired: number;
  today: number;
  tomorrow: number;
  soon: number; // everything expired or within the window
  top: { name: string; label: string }[]; // 3 soonest
  text: string; // notification text
  urgent: { id: string; name: string; days: number }[]; // all items needing attention, soonest first
};

function whenLabel(d: number): string {
  if (d < 0) return "expired";
  if (d === 0) return "today";
  if (d === 1) return "tomorrow";
  return `in ${d} days`;
}

// Frozen items only count when they're actually within the window, like everything else
export function computeDigest(items: PantryItem[]): Digest {
  const urgent = items
    .filter((i) => i.quantityPercent > 0 && daysLeft(i) <= DIGEST_WINDOW_DAYS)
    .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
  const days = urgent.map(daysLeft);
  const top = urgent.slice(0, 3).map((i) => ({ name: i.name, label: whenLabel(daysLeft(i)) }));
  const n = urgent.length;
  const text = n
    ? `${n} item${n === 1 ? "" : "s"} need${n === 1 ? "s" : ""} attention: ${top.map((t) => `${t.name} (${t.label})`).join(", ")}${n > 3 ? ` and ${n - 3} more` : ""}`
    : `All good! Nothing expiring in the next ${DIGEST_WINDOW_DAYS} days.`;
  return {
    expired: days.filter((d) => d < 0).length,
    today: days.filter((d) => d === 0).length,
    tomorrow: days.filter((d) => d === 1).length,
    soon: n,
    top,
    text,
    urgent: urgent.map((i) => ({ id: i.id, name: i.name, days: daysLeft(i) })),
  };
}

const joinNames = (names: string[]) =>
  names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;

function verb(days: number, plural: boolean): string {
  if (days < 0) return "expired";
  const v = plural ? "expire" : "expires";
  if (days === 0) return `${v} today`;
  if (days === 1) return `${v} tomorrow`;
  return `${v} in ${days} days`;
}

// Card line, e.g. "Chicken Breast and Ground Beef expire tomorrow" or
// "Baby Spinach expired, Blueberries expires tomorrow +2 more". At most 3 names.
export function digestHeadline(d: Digest): string {
  const shown = d.urgent.slice(0, 3);
  const groups: { days: number; names: string[] }[] = [];
  for (const u of shown) {
    const key = u.days < 0 ? -1 : u.days; // all expired items share one group
    const last = groups.at(-1);
    if (last && last.days === key) last.names.push(u.name);
    else groups.push({ days: key, names: [u.name] });
  }
  const line = groups.map((g) => `${joinNames(g.names)} ${verb(g.days, g.names.length > 1)}`).join(", ");
  const more = d.urgent.length - shown.length;
  return more > 0 ? `${line} +${more} more` : line;
}

// ---- Settings & per-day state (localStorage) ------------------------------

export type DigestSettings = { enabled: boolean; time: string }; // time "HH:MM", local
const SETTINGS_KEY = "frigi.digest";
const LAST_SENT_KEY = "frigi.lastDigestDate";
const DISMISSED_KEY = "frigi.digestDismissed";

export const DEFAULT_DIGEST: DigestSettings = { enabled: false, time: "08:00" };

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

export function loadDigestSettings(): DigestSettings {
  try {
    const s = JSON.parse(read(SETTINGS_KEY) || "{}");
    return {
      enabled: s.enabled === true,
      time: typeof s.time === "string" && /^\d{2}:\d{2}$/.test(s.time) ? s.time : DEFAULT_DIGEST.time,
    };
  } catch {
    return DEFAULT_DIGEST;
  }
}

export function saveDigestSettings(s: DigestSettings) {
  write(SETTINGS_KEY, JSON.stringify(s));
}

export const sentToday = () => read(LAST_SENT_KEY) === todayISO();
export const markSentToday = () => write(LAST_SENT_KEY, todayISO());
export const dismissedToday = () => read(DISMISSED_KEY) === todayISO();
export const dismissToday = () => write(DISMISSED_KEY, todayISO());

// Today's chosen time as a Date (local)
export function digestTimeToday(time: string): Date {
  const [h, m] = time.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}
