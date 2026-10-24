import { NextResponse } from "next/server";
import { generateJSON, LLMError, llmErrorStatus } from "@/lib/llm";
import { CATEGORIES, type Category } from "@/lib/pantry";
import type { Recipe, RecipeInputItem } from "@/lib/recipes";
import { allowedByCategory, isRestrictionId, RESTRICTIONS, type RestrictionId } from "@/lib/restrictions";

export const maxDuration = 60;

const SCHEMA = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      title: { type: "STRING" },
      ingredientsUsed: { type: "ARRAY", items: { type: "STRING" } },
      extraIngredients: { type: "ARRAY", items: { type: "STRING" } },
      steps: { type: "ARRAY", items: { type: "STRING" } },
      timeMinutes: { type: "INTEGER" },
    },
    required: ["title", "ingredientsUsed", "extraIngredients", "steps", "timeMinutes"],
    propertyOrdering: ["title", "ingredientsUsed", "extraIngredients", "steps", "timeMinutes"],
  },
};

function buildPrompt(items: RecipeInputItem[], restrictions: RestrictionId[]) {
  const pantry = items
    .map((i) => `- ${i.name} (${i.category}, expires ${i.daysLeft === 0 ? "today" : `in ${i.daysLeft} days`})`)
    .join("\n");

  const rules = restrictions.length
    ? RESTRICTIONS.filter((r) => restrictions.includes(r.id))
        .map((r) => `- ${r.label}: ${r.rule}`)
        .join("\n")
    : "- None";

  return `Suggest exactly 3 different, simple home recipes that use up food from this pantry before it expires. Prioritize the items that expire soonest.

Pantry items:
${pantry}

DIETARY RESTRICTIONS (STRICT - these are allergies or firm diets; a single violation is unacceptable):
${rules}
These apply to EVERY ingredient, both pantry items and extra ingredients. If a pantry item violates a restriction, do not use it. When unsure whether an ingredient is safe, leave it out.

Rules:
- ingredientsUsed lists ONLY pantry items, copied EXACTLY as written in the list above (same spelling and capitalization). Use at least 2 pantry items per recipe when possible.
- extraIngredients lists anything else needed, kept short and common. Do not list salt, pepper, water or cooking oil.
- steps are short, clear instructions, at most 8.
- timeMinutes is the total time as a whole number.`;
}

export async function POST(req: Request) {
  let items: RecipeInputItem[], restrictions: RestrictionId[];
  try {
    const body = await req.json();
    restrictions = (Array.isArray(body.restrictions) ? body.restrictions : []).filter(isRestrictionId);
    items = (Array.isArray(body.items) ? body.items : [])
      .filter((i: RecipeInputItem) => i && typeof i.name === "string" && i.name.trim())
      .map((i: RecipeInputItem) => ({
        name: i.name.trim().slice(0, 100),
        category: (CATEGORIES as readonly string[]).includes(i.category) ? i.category : ("other" as Category),
        daysLeft: Math.max(0, Math.round(Number(i.daysLeft) || 0)),
      }))
      // Safety net: drop items a restriction rules out by category, even if the client sent them
      .filter((i: RecipeInputItem) => allowedByCategory(i.category, restrictions))
      .slice(0, 8);
  } catch {
    return NextResponse.json({ error: "Send JSON: { items, restrictions }" }, { status: 400 });
  }

  if (!items.length) {
    return NextResponse.json({ error: "Add some food to your pantry first." }, { status: 400 });
  }

  try {
    const data = await generateJSON<unknown>({ prompt: buildPrompt(items, restrictions), schema: SCHEMA });
    const recipes = cleanRecipes(data, items);
    if (!recipes.length) {
      return NextResponse.json({ error: "Couldn't come up with recipes. Try again." }, { status: 422 });
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

const strings = (x: unknown): string[] =>
  Array.isArray(x) ? x.filter((s) => typeof s === "string" && s.trim()).map((s) => s.trim()) : [];

function cleanRecipes(data: unknown, items: RecipeInputItem[]): Recipe[] {
  if (!Array.isArray(data)) return [];
  // Map model output back to the exact pantry names, dropping anything not in the pantry
  const byLower = new Map(items.map((i) => [i.name.toLowerCase(), i.name]));
  return data
    .filter((r) => r && typeof r.title === "string" && r.title.trim())
    .slice(0, 3)
    .map((r) => ({
      title: r.title.trim(),
      ingredientsUsed: [
        ...new Set(strings(r.ingredientsUsed).flatMap((n) => byLower.get(n.toLowerCase()) ?? [])),
      ],
      extraIngredients: strings(r.extraIngredients),
      steps: strings(r.steps),
      timeMinutes: Math.max(1, Math.round(Number(r.timeMinutes) || 30)),
    }));
}
