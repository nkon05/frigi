import { CATEGORIES, daysBetween, daysLeft, makeId, todayISO, type Category, type PantryItem } from "@/lib/pantry";

// "frozen" is logged when an item is moved to the freezer; it never counts as used/tossed/donated
export type Outcome = "used" | "tossed" | "donated" | "frozen";
const OUTCOMES: Outcome[] = ["used", "tossed", "donated", "frozen"];

export type HistoryEntry = {
  id: string;
  name: string;
  category: Category;
  price: number | null;
  quantityPercent: number; // what was left when it was removed
  outcome: Outcome;
  date: string; // YYYY-MM-DD
  daysBeforeExpiry: number; // negative if already expired
  daysAdded?: number; // "frozen" only: shelf life added by freezing
};

const HISTORY_KEY = "frigi.history";
const OLD_DONATED_KEY = "frigi.donatedCount"; // pre-history counter, migrated into entries

export function historyEntry(item: PantryItem, outcome: Outcome, extra: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    id: makeId(),
    name: item.name,
    category: item.category,
    price: item.price,
    quantityPercent: item.quantityPercent,
    outcome,
    date: todayISO(),
    daysBeforeExpiry: daysLeft(item),
    ...extra,
  };
}

function normalize(e: Partial<HistoryEntry>): HistoryEntry | null {
  if (!e || !OUTCOMES.includes(e.outcome as Outcome) || typeof e.date !== "string") return null;
  return {
    id: e.id || makeId(),
    name: e.name || "Item",
    category: CATEGORIES.includes(e.category as Category) ? (e.category as Category) : "other",
    price: typeof e.price === "number" ? e.price : null,
    quantityPercent: typeof e.quantityPercent === "number" ? e.quantityPercent : 100,
    outcome: e.outcome as Outcome,
    date: e.date,
    daysBeforeExpiry: typeof e.daysBeforeExpiry === "number" ? e.daysBeforeExpiry : 0,
    ...(typeof e.daysAdded === "number" ? { daysAdded: e.daysAdded } : {}),
  };
}

export function loadHistory(): HistoryEntry[] {
  let history: HistoryEntry[] = [];
  try {
    const raw = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    history = Array.isArray(raw) ? raw.map(normalize).filter((e): e is HistoryEntry => !!e) : [];

    // One-time migration: the old donatedCount becomes "donated" entries (no price, date unknown -> today)
    const oldCount = Math.floor(Number(localStorage.getItem(OLD_DONATED_KEY)) || 0);
    if (oldCount > 0) {
      for (let i = 0; i < oldCount; i++) {
        history.push({ id: makeId(), name: "Donated item", category: "other", price: null, quantityPercent: 100, outcome: "donated", date: todayISO(), daysBeforeExpiry: 0 });
      }
      saveHistory(history);
    }
    localStorage.removeItem(OLD_DONATED_KEY);
  } catch {
    // Unreadable storage: start fresh rather than crash
  }
  return history;
}

export function saveHistory(history: HistoryEntry[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {}
}

// ---- Stats ----------------------------------------------------------------

// Rough, illustrative kg CO2e avoided per whole item rescued, by category.
// These are ballpark figures for a typical grocery-sized package (e.g. meat ~0.5kg), NOT measured data.
const CO2_KG_PER_ITEM: Record<Category, number> = {
  meat: 6,
  seafood: 2.5,
  dairy: 1.5,
  frozen: 1,
  bakery: 0.5,
  pantry: 0.5,
  produce: 0.3,
  other: 0.5,
};

export type ImpactStats = {
  moneySaved: number;
  moneyWasted: number;
  itemsRescued: number; // used + donated
  itemsUsed: number;
  itemsDonated: number;
  itemsTossed: number;
  rescuedByCategory: { category: Category; count: number }[]; // most first
  wasteRate: number | null; // tossed / (used + tossed + donated), null with no data
  streakDays: number; // days since last tossed item (or since the first entry if never)
  co2Kg: number;
  thisWeek: { used: number; tossed: number };
  lastWeek: { used: number; tossed: number };
  frozenItems: number;
  frozenDaysAdded: number;
  hasData: boolean;
};

export function computeStats(history: HistoryEntry[]): ImpactStats {
  const today = todayISO();
  const removals = history.filter((e) => e.outcome !== "frozen");
  const frozen = history.filter((e) => e.outcome === "frozen");
  const used = removals.filter((e) => e.outcome === "used");
  const tossed = removals.filter((e) => e.outcome === "tossed");
  const donated = removals.filter((e) => e.outcome === "donated");

  // Money: the share tossed (what was left) is wasted; everything else of the item's price was saved.
  // Items are reduced as they're eaten (e.g. "I made this"), so an item used up at 0% saves its full price,
  // and a half-eaten item that's tossed counts half saved, half wasted.
  const wastedShare = (e: HistoryEntry) => (e.outcome === "tossed" ? Math.min(100, Math.max(0, e.quantityPercent)) / 100 : 0);
  let moneySaved = 0;
  let moneyWasted = 0;
  let co2Kg = 0;
  for (const e of removals) {
    const price = e.price ?? 0;
    moneyWasted += price * wastedShare(e);
    moneySaved += price * (1 - wastedShare(e));
    if (e.outcome !== "tossed") co2Kg += CO2_KG_PER_ITEM[e.category];
  }

  const lastTossed = tossed.map((e) => e.date).sort().at(-1);
  const firstEntry = removals.map((e) => e.date).sort()[0];
  const streakFrom = lastTossed ?? firstEntry;

  const week = (fromDaysAgo: number, toDaysAgo: number) => {
    const inRange = (e: HistoryEntry) => {
      const ago = daysBetween(e.date, today);
      return ago >= fromDaysAgo && ago <= toDaysAgo;
    };
    return { used: used.filter(inRange).length, tossed: tossed.filter(inRange).length };
  };

  const total = used.length + tossed.length + donated.length;
  return {
    moneySaved,
    moneyWasted,
    itemsRescued: used.length + donated.length,
    itemsUsed: used.length,
    itemsDonated: donated.length,
    itemsTossed: tossed.length,
    rescuedByCategory: CATEGORIES.map((category) => ({
      category,
      count: [...used, ...donated].filter((e) => e.category === category).length,
    }))
      .filter((c) => c.count > 0)
      .sort((a, b) => b.count - a.count),
    wasteRate: total ? tossed.length / total : null,
    streakDays: streakFrom ? Math.max(0, daysBetween(streakFrom, today)) : 0,
    co2Kg,
    thisWeek: week(0, 6), // rolling: today and the 6 days before
    lastWeek: week(7, 13),
    frozenItems: frozen.length,
    frozenDaysAdded: frozen.reduce((sum, e) => sum + (e.daysAdded ?? 0), 0),
    hasData: removals.length > 0 || frozen.length > 0,
  };
}
