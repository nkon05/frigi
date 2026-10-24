"use client";

import { useState } from "react";
import { Check, ChefHat, ChevronDown, Clock, Sparkles } from "lucide-react";
import { Banner, CARD, EmptyState, LoadingCard } from "@/components/ui";
import { daysLeft, type PantryItem } from "@/lib/pantry";
import { pickItemsForRecipes, type Recipe } from "@/lib/recipes";
import { RESTRICTIONS, type RestrictionId } from "@/lib/restrictions";

export default function RecipesScreen({
  items,
  restrictions,
  onMade,
  onEditSettings,
}: {
  items: PantryItem[];
  restrictions: RestrictionId[];
  onMade: (recipe: Recipe) => string[]; // returns names of pantry items that were reduced
  onEditSettings: () => void;
}) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [made, setMade] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const picked = pickItemsForRecipes(items, restrictions);
  const labels = RESTRICTIONS.filter((r) => restrictions.includes(r.id)).map((r) => r.label);

  async function findRecipes() {
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: picked.map((i) => ({ name: i.name, category: i.category, daysLeft: daysLeft(i) })),
          restrictions,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setRecipes(data.recipes);
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
    setNotice(
      updated.length
        ? `Nice! Used 25% of ${updated.join(", ")}.`
        : "Nice! Nothing left in the pantry to update for this one."
    );
  }

  if (picked.length === 0 && recipes.length === 0) {
    return (
      <EmptyState
        icon={ChefHat}
        title="Nothing to cook with yet"
        body={
          items.length
            ? "None of your pantry items are fresh and allowed by your diet settings."
            : "Scan a receipt first, then come back for recipe ideas that use up what's expiring."
        }
      />
    );
  }

  return (
    <div>
      <div className={`${CARD} mb-4 p-4`}>
        <button
          onClick={findRecipes}
          disabled={loading || picked.length === 0}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 font-semibold text-white shadow-md shadow-green-600/20 transition active:scale-95 disabled:opacity-60"
        >
          <Sparkles size={18} />
          {recipes.length ? "Get new ideas" : "What can I make?"}
        </button>
        <p className="mt-3 text-sm text-stone-500">
          Using your {picked.length} soonest-expiring item{picked.length === 1 ? "" : "s"}:{" "}
          <span className="text-stone-700">{picked.map((i) => i.name).join(", ")}</span>
        </p>
        <button onClick={onEditSettings} className="-mx-1 mt-1 min-h-11 px-1 text-left text-sm">
          {labels.length ? (
            <span className="text-stone-500">
              Diet: <span className="font-medium text-green-700">{labels.join(", ")}</span>{" "}
              <span className="text-stone-400">· Edit</span>
            </span>
          ) : (
            <span className="text-stone-400">No allergies or diet set · <span className="text-green-700">Add</span></span>
          )}
        </button>
      </div>

      {loading && (
        <div className="mb-4 space-y-3">
          <LoadingCard title="Cooking up ideas..." subtitle="Finding recipes for your soonest-expiring food" />
          {[0, 1, 2].map((i) => (
            <div key={i} className={`${CARD} animate-pulse space-y-3 p-4`}>
              <div className="h-5 w-3/4 rounded bg-stone-100" />
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

      {!loading && (
        <ul className="space-y-3">
          {recipes.map((r, i) => (
            <RecipeCard key={`${r.title}-${i}`} recipe={r} made={made.includes(i)} onMade={() => markMade(i)} />
          ))}
        </ul>
      )}
    </div>
  );
}

function RecipeCard({ recipe, made, onMade }: { recipe: Recipe; made: boolean; onMade: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <li className={`${CARD} animate-fade-up p-4`}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold leading-snug text-stone-900">{recipe.title}</h3>
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600">
          <Clock size={12} />
          {recipe.timeMinutes} min
        </span>
      </div>

      {recipe.ingredientsUsed.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-stone-400">From your pantry</p>
          <div className="flex flex-wrap gap-1.5">
            {recipe.ingredientsUsed.map((n) => (
              <span key={n} className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-800">
                {n}
              </span>
            ))}
          </div>
        </div>
      )}

      {recipe.extraIngredients.length > 0 && (
        <div className="mt-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-400">You&apos;ll also need</p>
          <p className="text-sm text-stone-600">{recipe.extraIngredients.join(", ")}</p>
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        className="-mx-1 mt-2 flex min-h-11 items-center gap-1 px-1 text-sm font-medium text-stone-600"
      >
        {open ? "Hide" : "Show"} steps ({recipe.steps.length})
        <ChevronDown size={16} className={`transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ol className="animate-fade-up mb-2 space-y-2">
          {recipe.steps.map((s, i) => (
            <li key={i} className="flex gap-3 text-sm leading-relaxed text-stone-700">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-100 text-xs font-semibold text-stone-500">
                {i + 1}
              </span>
              {s}
            </li>
          ))}
        </ol>
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
