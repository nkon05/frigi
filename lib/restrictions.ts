import type { Category } from "@/lib/pantry";

export const RESTRICTIONS = [
  { id: "nut-free", label: "Nut-free", rule: "no peanuts or tree nuts of any kind, including nut butters, nut milks, nut oils and nut flours" },
  { id: "dairy-free", label: "Dairy-free", rule: "no milk, butter, cheese, yogurt, cream, ghee, whey or any other dairy product" },
  { id: "gluten-free", label: "Gluten-free", rule: "no wheat, barley, rye, regular pasta, regular bread, flour tortillas, couscous, or regular soy sauce" },
  { id: "vegetarian", label: "Vegetarian", rule: "no meat, poultry, fish, seafood, gelatin or meat-based stock" },
  { id: "vegan", label: "Vegan", rule: "no animal products at all: no meat, fish, seafood, dairy, eggs, honey, gelatin" },
  { id: "shellfish-free", label: "Shellfish-free", rule: "no shrimp, prawns, crab, lobster, crayfish, clams, mussels, oysters, scallops or squid" },
] as const;

export type RestrictionId = (typeof RESTRICTIONS)[number]["id"];

const IDS = RESTRICTIONS.map((r) => r.id) as string[];

export function isRestrictionId(x: unknown): x is RestrictionId {
  return typeof x === "string" && IDS.includes(x);
}

// Hard filter applied before the model sees the pantry, as a safety net on top of the prompt
const EXCLUDED_CATEGORIES: Partial<Record<RestrictionId, Category[]>> = {
  vegetarian: ["meat", "seafood"],
  vegan: ["meat", "seafood", "dairy"],
  "dairy-free": ["dairy"],
};

export function allowedByCategory(category: Category, restrictions: RestrictionId[]): boolean {
  return !restrictions.some((r) => EXCLUDED_CATEGORIES[r]?.includes(category));
}

const STORAGE_KEY = "frigi.restrictions";

export function loadRestrictions(): RestrictionId[] {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(data) ? data.filter(isRestrictionId) : [];
  } catch {
    return [];
  }
}

export function saveRestrictions(r: RestrictionId[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(r));
}
