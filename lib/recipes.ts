import { daysLeft, type Category, type PantryItem } from "@/lib/pantry";
import { allowedByCategory, type RestrictionId } from "@/lib/restrictions";

export type Recipe = {
  title: string;
  ingredientsUsed: string[]; // names matching pantry items
  extraIngredients: string[];
  steps: string[];
  timeMinutes: number;
};

// What the client sends to /api/recipes for each pantry item
export type RecipeInputItem = { name: string; category: Category; daysLeft: number; frozen?: boolean };

const MAX_ITEMS = 8;

const URGENT_DAYS = 5;

// Soonest-expiring items that are still usable and allowed by the restrictions.
// Fresh (non-freezer) items about to expire always come first, so frozen food never outranks them.
export function pickItemsForRecipes(items: PantryItem[], restrictions: RestrictionId[]): PantryItem[] {
  const urgentFresh = (i: PantryItem) => i.location !== "freezer" && daysLeft(i) <= URGENT_DAYS;
  return items
    .filter((i) => i.quantityPercent > 0 && daysLeft(i) >= 0 && allowedByCategory(i.category, restrictions))
    .sort((a, b) => Number(urgentFresh(b)) - Number(urgentFresh(a)) || a.expiryDate.localeCompare(b.expiryDate))
    .slice(0, MAX_ITEMS);
}

// "I made this": take 25% off each used ingredient. If several pantry items share
// a name (e.g. milk from two receipts), only the soonest-expiring one is used.
export function applyRecipeMade(items: PantryItem[], recipe: Recipe): { next: PantryItem[]; updated: string[] } {
  const ids = new Set<string>();
  const updated: string[] = [];
  for (const name of recipe.ingredientsUsed) {
    const match = items
      .filter((i) => i.name.toLowerCase() === name.toLowerCase() && i.quantityPercent > 0 && !ids.has(i.id))
      .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate))[0];
    if (match) {
      ids.add(match.id);
      updated.push(match.name);
    }
  }
  const next = items.map((i) =>
    ids.has(i.id) ? { ...i, quantityPercent: Math.max(0, i.quantityPercent - 25) } : i
  );
  return { next, updated };
}
