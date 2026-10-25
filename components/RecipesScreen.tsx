"use client";

import { useEffect, useState } from "react";
import { Award, Check, ChefHat, ChevronDown, Clock, Search, ShoppingBasket, Snowflake, Sparkles } from "lucide-react";
import { urgency } from "@/components/ItemCard";
import { Banner, CARD, EmptyState, LoadingCard } from "@/components/ui";
import { type PantryItem } from "@/lib/pantry";
import { defaultSelection, rankRecipes, toRecipeInput, type RankedRecipe, type Recipe } from "@/lib/recipes";
import { allowedByCategory, RESTRICTIONS, type RestrictionId } from "@/lib/restrictions";

const DOT = { red: "bg-red-500", yellow: "bg-amber-400", green: "bg-green-500" };
const CHIP = { red: "bg-red-100 text-red-800", yellow: "bg-amber-100 text-amber-900", green: "bg-green-100 text-green-800" };

export default function RecipesScreen({
  items,
  restrictions,
  onMade,
  onEditSettings,
  focusKey,
}: {
  items: PantryItem[];
  restrictions: RestrictionId[];
  onMade: (recipe: Recipe) => string[]; // returns names of pantry items that were reduced
  onEditSettings: () => void;
  focusKey: number; // changes when "See recipes" is tapped: reset the picker to the expiring items
}) {
  const [search, setSearch] = useState("");
  const [chosen, setChosen] = useState<string[] | null>(null); // null = default (expiring within 3 days)
  const [recipes, setRecipes] = useState<RankedRecipe[]>([]);
  const [made, setMade] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => setChosen(null), [focusKey]);

  const sorted = [...items].filter((i) => i.quantityPercent > 0).sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
  const allowed = (i: PantryItem) => allowedByCategory(i.category, restrictions);
  const selected = new Set((chosen ?? defaultSelection(items)).filter((id) => sorted.some((i) => i.id === id && allowed(i))));
  const labels = RESTRICTIONS.filter((r) => restrictions.includes(r.id)).map((r) => r.label);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setChosen([...next]);
  }

  async function findRecipes() {
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pantry: sorted.map(toRecipeInput), selectedIds: [...selected], search, restrictions }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setRecipes(rankRecipes(data.recipes, items));
      setMade([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function markMade(index: number) {
    const updated = onMade(recipes[index]);
    setMade([...made, index]);
    setNotice(updated.length ? `Nice! Used 25% of ${updated.join(", ")}.` : "Nice! Nothing left in the pantry to update for this one.");
  }

  if (sorted.length === 0 && recipes.length === 0) {
    return (
      <EmptyState
        icon={ChefHat}
        title="Nothing to cook with yet"
        body="Scan a receipt first, then come back for recipe ideas that use up what's expiring."
      />
    );
  }

  return (
    <div>
      <div className={`${CARD} mb-4 p-4`}>
        <label className="flex min-h-12 items-center gap-2 rounded-xl bg-stone-100 px-3 focus-within:ring-2 focus-within:ring-green-500">
          <Search size={18} className="shrink-0 text-stone-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !loading && findRecipes()}
            placeholder="pasta, high protein, quick dinner..."
            className="min-w-0 flex-1 bg-transparent py-2 text-stone-800 outline-none placeholder:text-stone-400"
          />
        </label>

        <div className="mt-4 flex items-baseline justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Cook with</p>
          <div className="flex gap-3 text-xs font-medium">
            <button onClick={() => setChosen(null)} className="min-h-8 text-green-700">
              Expiring
            </button>
            <button onClick={() => setChosen([])} className="min-h-8 text-stone-500">
              Clear
            </button>
          </div>
        </div>
        <div className="mt-2 flex max-h-44 flex-wrap gap-1.5 overflow-y-auto">
          {sorted.map((i) => {
            const on = selected.has(i.id);
            const ok = allowed(i);
            return (
              <button
                key={i.id}
                onClick={() => ok && toggle(i.id)}
                disabled={!ok}
                aria-pressed={on}
                title={ok ? undefined : "Not allowed by your diet settings"}
                className={`flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm transition active:scale-95 ${
                  !ok
                    ? "border-stone-200 text-stone-300 line-through"
                    : on
                      ? "border-green-600 bg-green-50 font-medium text-green-900"
                      : "border-stone-200 bg-white text-stone-600"
                }`}
              >
                <span className={`h-2 w-2 shrink-0 rounded-full ${DOT[urgency(i)]}`} />
                {i.location === "freezer" && <Snowflake size={12} className="text-sky-500" />}
                {i.name}
                {on && <Check size={14} strokeWidth={3} className="text-green-700" />}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-stone-500">
          {selected.size
            ? `${selected.size} selected`
            : search.trim()
              ? "Nothing selected: recipes will match your search using any pantry items."
              : "Nothing selected: we'll use everything in your pantry."}
        </p>

        <button onClick={onEditSettings} className="-mx-1 min-h-11 px-1 text-left text-sm">
          {labels.length ? (
            <span className="text-stone-500">
              Diet: <span className="font-medium text-green-700">{labels.join(", ")}</span> <span className="text-stone-400">· Edit</span>
            </span>
          ) : (
            <span className="text-stone-400">
              No allergies or diet set · <span className="text-green-700">Add</span>
            </span>
          )}
        </button>

        <button
          onClick={findRecipes}
          disabled={loading}
          className="mt-1 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 font-semibold text-white shadow-md shadow-green-600/20 transition active:scale-95 disabled:opacity-60"
        >
          <Sparkles size={18} />
          Find recipes
        </button>
      </div>

      {loading && (
        <div className="mb-4 space-y-3">
          <LoadingCard title="Finding the best recipes for your pantry..." subtitle="Ranking them by what they use up" />
          {[0, 1, 2].map((i) => (
            <div key={i} className={`${CARD} animate-pulse space-y-3 p-4`}>
              <div className="h-5 w-3/4 rounded bg-stone-100" />
              <div className="h-4 w-1/2 rounded bg-stone-100" />
              <div className="flex gap-2">
                <div className="h-7 w-20 rounded-full bg-stone-100" />
                <div className="h-7 w-24 rounded-full bg-stone-100" />
              </div>
              <div className="h-11 rounded-xl bg-stone-100" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <Banner tone="error" onClose={() => setError(null)}>
          {error}
        </Banner>
      )}
      {notice && (
        <Banner tone="success" onClose={() => setNotice(null)}>
          {notice}
        </Banner>
      )}

      {!loading && recipes.length > 0 && (
        <>
          <p className="mb-2 px-1 text-xs text-stone-500">Ranked by how much of your expiring food each recipe uses.</p>
          <ul className="space-y-3">
            {recipes.map((r, i) => (
              <RecipeCard key={`${r.title}-${i}`} recipe={r} items={items} best={i === 0} made={made.includes(i)} onMade={() => markMade(i)} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function RecipeCard({
  recipe,
  items,
  best,
  made,
  onMade,
}: {
  recipe: RankedRecipe;
  items: PantryItem[];
  best: boolean;
  made: boolean;
  onMade: () => void;
}) {
  const [open, setOpen] = useState(false);
  const used = recipe.ingredientsUsed.map((id) => items.find((i) => i.id === id)).filter((i): i is PantryItem => !!i);
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

  return (
    <li className={`${CARD} animate-fade-up p-4 ${best ? "ring-2 ring-green-500" : ""}`}>
      {best && (
        <p className="mb-2 inline-flex items-center gap-1 rounded-full bg-green-600 px-2.5 py-1 text-xs font-semibold text-white">
          <Award size={13} />
          Best match: uses {plural(recipe.usedCount, "item")}
          {recipe.expiringCount > 0 && `, ${recipe.expiringCount} expiring`}
        </p>
      )}
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold leading-snug text-stone-900">{recipe.title}</h3>
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600">
          <Clock size={12} />
          {recipe.timeMinutes} min
        </span>
      </div>
      {recipe.description && <p className="mt-1 text-sm text-stone-600">{recipe.description}</p>}

      <p className="mt-3 text-xs font-semibold text-stone-700">
        Uses {recipe.usedCount} of your items
        {recipe.expiringCount > 0 && <span className="text-red-700"> · {recipe.expiringCount} expiring soon</span>}
      </p>
      {used.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {used.map((i) => (
            <span
              key={i.id}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                i.location === "freezer" ? "bg-sky-100 text-sky-800" : CHIP[urgency(i)]
              }`}
            >
              {i.location === "freezer" ? <Snowflake size={11} /> : <span className={`h-1.5 w-1.5 rounded-full ${DOT[urgency(i)]}`} />}
              {i.name}
            </span>
          ))}
        </div>
      )}

      {recipe.extraIngredients.length > 0 && (
        <p className="mt-3 flex gap-1.5 text-sm text-stone-600">
          <ShoppingBasket size={15} className="mt-0.5 shrink-0 text-stone-400" />
          <span>
            <span className="font-medium text-stone-700">To buy: </span>
            {recipe.extraIngredients.join(", ")}
          </span>
        </p>
      )}

      <button onClick={() => setOpen(!open)} className="-mx-1 mt-2 flex min-h-11 items-center gap-1 px-1 text-sm font-medium text-stone-600">
        {open ? "Hide" : "Show"} ingredients & steps
        <ChevronDown size={16} className={`transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="animate-fade-up mb-2 space-y-3">
          {recipe.ingredients.length > 0 && (
            <ul className="list-disc space-y-0.5 pl-5 text-sm text-stone-700">
              {recipe.ingredients.map((ing, i) => (
                <li key={i}>{ing}</li>
              ))}
            </ul>
          )}
          <ol className="space-y-2">
            {recipe.steps.map((s, i) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed text-stone-700">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-100 text-xs font-semibold text-stone-500">
                  {i + 1}
                </span>
                {s}
              </li>
            ))}
          </ol>
        </div>
      )}

      <button
        onClick={onMade}
        disabled={made}
        className={`mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition active:scale-95 ${
          made ? "bg-green-50 text-green-700" : "border-2 border-green-600 text-green-700 active:bg-green-50"
        }`}
      >
        {made ? (
          <>
            <Check size={16} strokeWidth={3} /> Made it! Pantry updated
          </>
        ) : (
          "I made this"
        )}
      </button>
    </li>
  );
}
