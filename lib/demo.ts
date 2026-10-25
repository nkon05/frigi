import { addDays, makeId, todayISO, type Category, type Location, type PantryItem } from "@/lib/pantry";
import type { HistoryEntry, Outcome } from "@/lib/history";

type DemoItem = {
  name: string;
  rawName: string;
  category: Category;
  price: number;
  location: Location;
  ago: number; // bought this many days ago
  left: number; // days until expiry (negative = expired)
  qty: number;
  tip: string;
  freezable: boolean;
  fkFreezer: number | null; // real USDA FoodKeeper freezer days for this kind of product
  aiFrozen?: number; // only where FoodKeeper has no freezer value
};

// Sample pantry: expired, expiring and long-life items, with freezable fridge items
// expiring in 1-2 days (so "Freeze it" shows) and a few things already in the freezer.
const DEMO: DemoItem[] = [
  { name: "Baby Spinach", rawName: "BBY SPNCH 5OZ", category: "produce", price: 3.49, location: "fridge", ago: 5, left: -1, qty: 50, tip: "Store dry with a paper towel in the container.", freezable: false, fkFreezer: null },
  { name: "Organic Blueberries", rawName: "ORG BLBRY 6OZ", category: "produce", price: 3.99, location: "fridge", ago: 4, left: 1, qty: 75, tip: "Keep unwashed in the fridge until ready to eat.", freezable: true, fkFreezer: 300 },
  { name: "Chicken Thighs", rawName: "BNLS CKN THGH", category: "meat", price: 7.49, location: "fridge", ago: 1, left: 1, qty: 100, tip: "Keep on the bottom shelf of the fridge in its packaging.", freezable: true, fkFreezer: 270 },
  { name: "Salmon Fillet", rawName: "ATL SLMN FLT", category: "seafood", price: 9.99, location: "fridge", ago: 1, left: 2, qty: 100, tip: "Keep in the coldest part of the fridge and cook within two days.", freezable: true, fkFreezer: 75 },
  { name: "Sourdough Bread", rawName: "SRDGH LOAF", category: "bakery", price: 5.0, location: "pantry", ago: 2, left: 3, qty: 75, tip: "Store cut-side down in a bread bag at room temperature.", freezable: true, fkFreezer: 120 },
  { name: "Greek Yogurt", rawName: "CHBN GRK YGT", category: "dairy", price: 1.29, location: "fridge", ago: 6, left: 4, qty: 100, tip: "Keep sealed and refrigerated.", freezable: true, fkFreezer: 45 },
  { name: "Avocados", rawName: "HASS AVO 4CT", category: "produce", price: 4.99, location: "pantry", ago: 2, left: 4, qty: 100, tip: "Ripen on the counter, then refrigerate once soft.", freezable: false, fkFreezer: null },
  { name: "2% Milk", rawName: "GV 2% MLK GAL", category: "dairy", price: 3.68, location: "fridge", ago: 3, left: 7, qty: 100, tip: "Keep on a fridge shelf, not in the door.", freezable: true, fkFreezer: 90 },
  { name: "Cheddar Cheese", rawName: "TLMK SHRP CHDR", category: "dairy", price: 4.29, location: "fridge", ago: 3, left: 21, qty: 100, tip: "Wrap tightly after opening to keep it from drying out.", freezable: true, fkFreezer: 180 },
  // Freezer
  { name: "Frozen Mixed Berries", rawName: "GG FRZ BERRY MIX", category: "frozen", price: 4.79, location: "freezer", ago: 20, left: 25, qty: 50, tip: "Reseal the bag tightly to prevent freezer burn.", freezable: true, fkFreezer: null, aiFrozen: 240 },
  { name: "Ice Cream", rawName: "BEN&JRY ICE CRM", category: "frozen", price: 5.99, location: "freezer", ago: 10, left: 150, qty: 75, tip: "Keep at the back of the freezer, not in the door.", freezable: true, fkFreezer: 180 },
  { name: "Frozen Chicken Breasts", rawName: "TYSN FRZ CKN BRST", category: "meat", price: 11.49, location: "freezer", ago: 30, left: 240, qty: 100, tip: "Thaw in the fridge, never on the counter.", freezable: true, fkFreezer: 270 },
];

export function demoPantry(): PantryItem[] {
  const today = todayISO();
  return DEMO.map((d) => ({
    id: makeId(),
    name: d.name,
    rawName: d.rawName,
    category: d.category,
    price: d.price,
    location: d.location,
    purchaseDate: addDays(today, -d.ago),
    shelfLifeDays: d.ago + d.left,
    shelfLifeSource: "ai", // sample data, not a real scan
    freezerShelfLifeDays: d.fkFreezer,
    freezable: d.freezable,
    frozenShelfLifeDays: d.aiFrozen ?? null,
    expiryDate: addDays(today, d.left),
    storageTip: d.tip,
    quantityPercent: d.qty,
  }));
}

// [name, category, price, outcome, daysAgo, quantityPercent at removal, daysBeforeExpiry, daysAdded (frozen only)]
const DEMO_HISTORY: [string, Category, number, Outcome, number, number, number, number?][] = [
  ["Bananas", "produce", 1.24, "used", 1, 0, 1],
  ["Rotisserie Chicken", "meat", 6.99, "used", 2, 0, 1],
  ["Strawberries", "produce", 4.49, "tossed", 3, 50, -1],
  ["Pasta Sauce", "pantry", 2.79, "used", 4, 0, 20],
  ["Large Eggs", "dairy", 4.29, "used", 5, 0, 10],
  ["Bagels", "bakery", 3.49, "donated", 6, 100, 0],
  ["Ground Beef", "meat", 6.49, "frozen", 6, 100, 1, 104],
  ["Romaine Lettuce", "produce", 3.29, "tossed", 8, 75, -2],
  ["Shredded Mozzarella", "dairy", 3.99, "used", 9, 0, 12],
  ["Flour Tortillas", "bakery", 2.99, "used", 10, 0, 5],
  ["Canned Soup", "pantry", 1.89, "donated", 11, 100, 300],
  ["Whole Wheat Bread", "bakery", 3.49, "frozen", 12, 100, 2, 118],
  ["Cilantro", "produce", 0.99, "tossed", 13, 100, -3],
  ["Salmon Fillet", "seafood", 9.99, "used", 14, 0, 1],
  ["Greek Yogurt", "dairy", 1.29, "used", 15, 0, 2],
  ["Apples", "produce", 4.99, "donated", 17, 100, 15],
  ["Bananas", "produce", 1.31, "frozen", 18, 100, 1, 74],
  ["2% Milk", "dairy", 3.68, "used", 19, 0, 0],
  ["Mushrooms", "produce", 2.49, "tossed", 20, 100, -2],
  ["Ribeye Steak", "meat", 12.99, "used", 21, 0, 1],
];

export function demoHistory(): HistoryEntry[] {
  const today = todayISO();
  return DEMO_HISTORY.map(([name, category, price, outcome, ago, quantityPercent, daysBeforeExpiry, daysAdded]) => ({
    id: makeId(),
    name,
    category,
    price,
    quantityPercent,
    outcome,
    date: addDays(today, -ago),
    daysBeforeExpiry,
    ...(daysAdded != null ? { daysAdded } : {}),
  }));
}
