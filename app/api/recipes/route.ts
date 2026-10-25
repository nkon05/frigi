import { NextResponse } from "next/server";
import { generateJSON, LLMError, llmErrorStatus } from "@/lib/llm";
import { CATEGORIES, type Category } from "@/lib/pantry";
import type { Recipe, RecipeInputItem } from "@/lib/recipes";
import { allowedByCategory, isRestrictionId, RESTRICTIONS, type RestrictionId } from "@/lib/restrictions";

export const maxDuration = 30;

const MAX_PANTRY = 60;
const RECIPE_COUNT = 6;

const SCHEMA = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      title: { type: "STRING" },
      description: { type: "STRING" },
      timeMinutes: { type: "INTEGER" },
      ingredients: { type: "ARRAY", items: { type: "STRING" } },
      ingredientsUsed: { type: "ARRAY", items: { type: "INTEGER" } },
      extraIngredients: { type: "ARRAY", items: { type: "STRING" } },
      steps: { type: "ARRAY", items: { type: "STRING" } },
    },
    required: ["title", "description", "timeMinutes", "ingredients", "ingredientsUsed", "extraIngredients", "steps"],
    propertyOrdering: ["title", "description", "timeMinutes", "ingredients", "ingredientsUsed", "extraIngredients", "steps"],
  },
};

const when = (d: number) => (d < 0 ? "expired" : d === 0 ? "expires today" : d === 1 ? "expires tomorrow" : `expires in ${d} days`);

// Pantry items are numbered #1..#N in the prompt (short, hard to mangle) and mapped back to real ids
function buildPrompt(pantry: RecipeInputItem[], selected: Set<string>, search: string, restrictions: RestrictionId[]) {
  const list = pantry
    .map((i, n) => `#${n + 1} ${selected.has(i.id) ? "[SELECTED] " : ""}${i.name} (${i.category}${i.frozen ? ", frozen" : ""}, ${when(i.daysLeft)})`)
    .join("\n");

  const rules = restrictions.length
    ? RESTRICTIONS.filter((r) => restrictions.includes(r.id))
        .map((r) => `- ${r.label}: ${r.rule}`)
        .join("\n")
    : "- None";

  const focus = selected.size
    ? "Build every recipe around the [SELECTED] items. Other pantry items may be used too."
    : "Use whatever pantry items fit best.";

  return `Suggest exactly ${RECIPE_COUNT} different home recipes for this user.

${search ? `The user is looking for: "${search}". Every recipe must match this request.\n` : ""}${focus}

Pantry items:
${list}

DIETARY RESTRICTIONS (HARD RULES - allergies or firm diets; a single violation is unacceptable):
${rules}
These apply to EVERY ingredient (pantry items and extras) and to each recipe as a whole. Never use a pantry item that breaks a restriction. When unsure whether an ingredient is safe, leave it out.

Guidelines:
- Use as many of the user's pantry items as makes sense, favoring those that expire soonest. Avoid expired items unless they are [SELECTED].
- Prefer recipes that need few extra ingredients, ideally common staples.
- ingredientsUsed: the NUMBERS (e.g. 3 for #3) of the pantry items the recipe really uses. Only list a number if that item is actually an ingredient.
- ingredients: the full ingredient list with amounts (e.g. "2 cups baby spinach").
- extraIngredients: names of anything needed that is NOT in the pantry. Do not list salt, pepper, water or cooking oil.
- description: one short line. steps: short and clear, at most 8. timeMinutes: total time.

Before responding, double-check every recipe against the dietary restrictions and the user's request, and replace any recipe that fails.`;
}

export async function POST(req: Request) {
  let pantry: RecipeInputItem[], selected: Set<string>, search: string, restrictions: RestrictionId[];
  try {
    const body = await req.json();
    restrictions = (Array.isArray(body.restrictions) ? body.restrictions : []).filter(isRestrictionId);
    search = typeof body.search === "string" ? body.search.trim().slice(0, 200) : "";
    pantry = (Array.isArray(body.pantry) ? body.pantry : [])
      .filter((i: RecipeInputItem) => i && typeof i.id === "string" && typeof i.name === "string" && i.name.trim())
      .map((i: RecipeInputItem) => ({
        id: i.id,
        name: i.name.trim().slice(0, 100),
        category: (CATEGORIES as readonly string[]).includes(i.category) ? i.category : ("other" as Category),
        daysLeft: Math.round(Number(i.daysLeft) || 0),
        frozen: i.frozen === true,
      }))
      // Safety net: items a restriction rules out by category never reach the model
      .filter((i: RecipeInputItem) => allowedByCategory(i.category, restrictions))
      .sort((a: RecipeInputItem, b: RecipeInputItem) => a.daysLeft - b.daysLeft)
      .slice(0, MAX_PANTRY);
    const ids = new Set(pantry.map((i) => i.id));
    selected = new Set((Array.isArray(body.selectedIds) ? body.selectedIds : []).filter((id: unknown) => ids.has(id as string)));
  } catch {
    return NextResponse.json({ error: "Send JSON: { pantry, selectedIds, search, restrictions }" }, { status: 400 });
  }

  // Nothing selected and no search: cook from the whole (non-expired) pantry
  if (!selected.size && !search) pantry.filter((i) => i.daysLeft >= 0).forEach((i) => selected.add(i.id));

  if (!pantry.length) {
    return NextResponse.json({ error: "Add some food to your pantry first." }, { status: 400 });
  }

  try {
    const data = await generateJSON<unknown>({ prompt: buildPrompt(pantry, selected, search, restrictions), schema: SCHEMA });
    const recipes = cleanRecipes(data, pantry);
    if (!recipes.length) {
      return NextResponse.json({ error: "Couldn't find recipes for that. Try different ingredients or a broader search." }, { status: 422 });
    }
    return NextResponse.json({ recipes });
  } catch (err) {
    if (err instanceof LLMError) {
      return NextResponse.json({ error: err.message }, { status: llmErrorStatus(err.code) });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong finding recipes." }, { status: 500 });
  }
}

// Basics everyone has: never listed as "to buy" (and so never count against a recipe's ranking)
const STAPLE = /^(salt|(black |ground )?pepper|salt (and|&) pepper|water|(cooking |olive |vegetable |canola )?oil|cooking spray)$/i;

const strings = (x: unknown): string[] =>
  Array.isArray(x) ? x.filter((s) => typeof s === "string" && s.trim()).map((s) => s.trim()) : [];

function cleanRecipes(data: unknown, pantry: RecipeInputItem[]): Recipe[] {
  if (!Array.isArray(data)) return [];
  return data
    .filter((r) => r && typeof r.title === "string" && r.title.trim())
    .slice(0, RECIPE_COUNT)
    .map((r) => ({
      title: r.title.trim(),
      description: typeof r.description === "string" ? r.description.trim() : "",
      timeMinutes: Math.max(1, Math.round(Number(r.timeMinutes) || 30)),
      ingredients: strings(r.ingredients),
      // #N -> real pantry id; anything that isn't a real item is dropped
      ingredientsUsed: [
        ...new Set(
          (Array.isArray(r.ingredientsUsed) ? r.ingredientsUsed : [])
            .map((n: unknown) => pantry[Math.round(Number(n)) - 1]?.id)
            .filter((id: string | undefined): id is string => !!id)
        ),
      ] as string[],
      extraIngredients: strings(r.extraIngredients).filter((e) => !STAPLE.test(e)),
      steps: strings(r.steps),
    }));
}
