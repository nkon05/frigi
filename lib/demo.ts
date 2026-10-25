import { addDays, makeId, todayISO, type Category, type PantryItem } from "@/lib/pantry";

// [name, rawName, category, price, boughtDaysAgo, daysLeft, quantityPercent, storageTip]
const DEMO: [string, string, Category, number, number, number, number, string][] = [
  ["Baby Spinach", "BBY SPNCH 5OZ", "produce", 3.49, 5, -1, 50, "Store dry with a paper towel in the container."],
  ["Organic Blueberries", "ORG BLBRY 6OZ", "produce", 3.99, 4, 1, 75, "Keep unwashed in the fridge until ready to eat."],
  ["Chicken Thighs", "BNLS CKN THGH", "meat", 7.49, 1, 1, 100, "Keep on the bottom shelf of the fridge in its packaging."],
  ["Salmon Fillet", "ATL SLMN FLT", "seafood", 9.99, 1, 2, 100, "Keep in the coldest part of the fridge and cook within two days."],
  ["Greek Yogurt", "CHBN GRK YGT", "dairy", 1.29, 6, 4, 100, "Keep sealed and refrigerated."],
  ["Sourdough Bread", "SRDGH LOAF", "bakery", 5.0, 2, 3, 75, "Store cut-side down in a bread bag at room temperature."],
  ["Avocados", "HASS AVO 4CT", "produce", 4.99, 2, 4, 100, "Ripen on the counter, then refrigerate once soft."],
  ["2% Milk", "GV 2% MLK GAL", "dairy", 3.68, 3, 7, 100, "Keep on a fridge shelf, not in the door."],
  ["Cheddar Cheese", "TLMK SHRP CHDR", "dairy", 4.29, 3, 21, 100, "Wrap tightly after opening to keep it from drying out."],
  ["Frozen Peas", "BE FRZ PEAS", "frozen", 1.99, 3, 90, 100, "Keep frozen and reseal the bag tightly after use."],
];

export function demoPantry(): PantryItem[] {
  const today = todayISO();
  return DEMO.map(([name, rawName, category, price, ago, left, quantityPercent, storageTip]) => {
    const purchaseDate = addDays(today, -ago);
    return {
      id: makeId(),
      name,
      rawName,
      category,
      price,
      purchaseDate,
      shelfLifeDays: ago + left,
      shelfLifeSource: "ai",
      freezerShelfLifeDays: null,
      location: category === "frozen" ? "freezer" : category === "bakery" ? "pantry" : "fridge",
      freezable: false,
      frozenShelfLifeDays: null,
      expiryDate: addDays(today, left),
      storageTip,
      quantityPercent,
    };
  });
}
