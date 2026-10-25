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

export type Location = "fridge" | "pantry" | "freezer";

// Shape returned by /api/parse-receipt
export type ParsedItem = {
  rawName: string;
  name: string;
  category: Category;
  price: number | null;
  location: Location;
  shelfLifeDays: number;
  shelfLifeSource: ShelfLifeSource;
  freezerShelfLifeDays: number | null; // USDA FoodKeeper freezer days, when matched
  freezable: boolean;
  frozenShelfLifeDays: number | null; // AI's conservative freezer estimate (used when FoodKeeper has none)
  storageTip: string;
};

export type PantryItem = ParsedItem & {
  id: string;
  purchaseDate: string; // YYYY-MM-DD
  expiryDate: string; // YYYY-MM-DD
  quantityPercent: number;
  thawed?: boolean; // moved out of the freezer; short fixed expiry
};

// Safety net on top of the model's "freezable": foods that freeze badly or unsafely
const DONT_FREEZE = /lettuce|salad|cucumber|radish|celery|sprouts|brie|camembert|ricotta|cottage cheese|cream cheese|mascarpone|feta|mayo|eggs?\b(?!.*(white|yolk))|egg\s*\d|watermelon/i;

export function freezeDays(item: PantryItem): number | null {
  return item.freezerShelfLifeDays ?? item.frozenShelfLifeDays ?? null;
}

export function canFreeze(item: PantryItem): boolean {
  return item.location !== "freezer" && !item.thawed && item.freezable && freezeDays(item) != null && !DONT_FREEZE.test(item.name);
}

function defaultLocation(category: Category): Location {
  if (category === "frozen") return "freezer";
  if (category === "pantry" || category === "bakery") return "pantry";
  return "fridge";
}

const STORAGE_KEY = "frigi.pantry";

export function loadPantry(): PantryItem[] {
  try {
    const items: PantryItem[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    // Fill in fields that older saved items don't have
    return items.map((i) => {
      const freezerShelfLifeDays = i.freezerShelfLifeDays ?? null;
      return {
        ...i,
        shelfLifeSource: i.shelfLifeSource ?? "ai", // before sources existed, everything was an AI estimate
        freezerShelfLifeDays,
        location: i.location ?? defaultLocation(i.category),
        freezable: i.freezable ?? freezerShelfLifeDays != null, // only FoodKeeper freezer data says so
        frozenShelfLifeDays: i.frozenShelfLifeDays ?? null,
      };
    });
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

// "3 days", "2 weeks", "3 months", "1 year" (rounded, for friendly messages)
export function humanDays(n: number): string {
  const plural = (v: number, unit: string) => `${v} ${unit}${v === 1 ? "" : "s"}`;
  if (n < 14) return plural(n, "day");
  if (n < 60) return plural(Math.round(n / 7), "week");
  if (n < 365) return plural(Math.round(n / 30), "month");
  return plural(Math.round(n / 365), "year");
}
