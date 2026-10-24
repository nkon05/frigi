export const CATEGORIES = [
  "produce",
  "dairy",
  "meat",
  "seafood",
  "bakery",
  "pantry",
  "frozen",
  "other",
] as const;

export type Category = (typeof CATEGORIES)[number];

// usda = USDA FoodKeeper match, ai = model estimate, manual = user edited the expiry date
export type ShelfLifeSource = "usda" | "ai" | "manual";

// Shape returned by /api/parse-receipt
export type ParsedItem = {
  rawName: string;
  name: string;
  category: Category;
  price: number | null;
  shelfLifeDays: number;
  shelfLifeSource: ShelfLifeSource;
  freezerShelfLifeDays: number | null; // from FoodKeeper when matched, for a future "freeze to extend"
  storageTip: string;
};

export type PantryItem = ParsedItem & {
  id: string;
  purchaseDate: string; // YYYY-MM-DD
  expiryDate: string; // YYYY-MM-DD
  quantityPercent: number;
};

const STORAGE_KEY = "frigi.pantry";

export function loadPantry(): PantryItem[] {
  try {
    const items: PantryItem[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    // Items saved before shelf-life sources existed were all AI estimates
    return items.map((i) => ({ ...i, shelfLifeSource: i.shelfLifeSource ?? "ai", freezerShelfLifeDays: i.freezerShelfLifeDays ?? null }));
  } catch {
    return [];
  }
}

export function savePantry(items: PantryItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

// Dates are handled as local YYYY-MM-DD strings to avoid timezone drift.
export function todayISO(): string {
  return toISO(new Date());
}

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fromISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, days: number): string {
  const d = fromISO(iso);
  d.setDate(d.getDate() + days);
  return toISO(d);
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((fromISO(toIso).getTime() - fromISO(fromIso).getTime()) / 86400000);
}

export function daysLeft(item: PantryItem): number {
  return daysBetween(todayISO(), item.expiryDate);
}

export function formatDate(iso: string): string {
  return fromISO(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function makeId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function toPantryItem(p: ParsedItem, purchaseDate = todayISO()): PantryItem {
  return {
    ...p,
    id: makeId(),
    purchaseDate,
    expiryDate: addDays(purchaseDate, p.shelfLifeDays),
    quantityPercent: 100,
  };
}

// Number of items marked as donated (for a future impact stats screen)
const DONATED_KEY = "frigi.donatedCount";

export function incrementDonatedCount(): number {
  try {
    const next = (Number(localStorage.getItem(DONATED_KEY)) || 0) + 1;
    localStorage.setItem(DONATED_KEY, String(next));
    return next;
  } catch {
    return 0;
  }
}
