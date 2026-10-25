import { daysLeft, type Category, type PantryItem } from "@/lib/pantry";

export type Recipe = {
  title: string;
  description: string;
  timeMinutes: number;
  ingredients: string[]; // full list with amounts, e.g. "2 cups baby spinach"
  ingredientsUsed: string[]; // pantry item ids
  extraIngredients: string[]; // things to buy
  steps: string[];
};

// What the client sends to /api/recipes for each pantry item
export type RecipeInputItem = { id: string; name: string; category: Category; daysLeft: number; frozen: boolean };

export const PRESELECT_DAYS = 3;

export const toRecipeInput = (i: PantryItem): RecipeInputItem => ({
  id: i.id,
  name: i.name,
  category: i.category,
  daysLeft: daysLeft(i),
  frozen: i.location === "freezer",
});

// Picker default: anything still good that expires within 3 days
export function defaultSelection(items: PantryItem[]): string[] {
  return items.filter((i) => i.quantityPercent > 0 && daysLeft(i) >= 0 && daysLeft(i) <= PRESELECT_DAYS).map((i) => i.id);
}

// ---- Ranking (in code, not the model) ---------------------------------------

// Urgency weight per pantry item used: frozen 0.5; else expired / within 2 days 4, within 5 days 2, later 1
export function urgencyWeight(i: PantryItem): number {
  if (i.location === "freezer") return 0.5;
  const d = daysLeft(i);
  if (d <= 2) return 4;
  if (d <= 5) return 2;
  return 1;
}

const EXTRA_PENALTY = 0.4;

export const isExpiringSoon = (i: PantryItem) => i.location !== "freezer" && daysLeft(i) <= PRESELECT_DAYS;

export type RankedRecipe = Recipe & { score: number; usedCount: number; expiringCount: number };

export function rankRecipes(recipes: Recipe[], items: PantryItem[]): RankedRecipe[] {
  const byId = new Map(items.map((i) => [i.id, i]));
  return recipes
    .map((r) => {
      const used = r.ingredientsUsed.map((id) => byId.get(id)).filter((i): i is PantryItem => !!i);
      return {
        ...r,
        score: used.reduce((s, i) => s + urgencyWeight(i), 0) - EXTRA_PENALTY * r.extraIngredients.length,
        usedCount: used.length,
        expiringCount: used.filter(isExpiringSoon).length,
      };
    })
    .sort((a, b) => b.score - a.score);
}

// "I made this": take 25% off each pantry item the recipe used (by id)
export function applyRecipeMade(items: PantryItem[], recipe: Recipe): { next: PantryItem[]; updated: string[] } {
  const ids = new Set(recipe.ingredientsUsed);
  const updated = items.filter((i) => ids.has(i.id) && i.quantityPercent > 0).map((i) => i.name);
  const next = items.map((i) =>
    ids.has(i.id) && i.quantityPercent > 0 ? { ...i, quantityPercent: Math.max(0, i.quantityPercent - 25) } : i
  );
  return { next, updated };
}
