"use client";

import { useEffect, useState } from "react";
import { Award, Check, ChefHat, ChevronDown, Clock, Search, ShoppingBasket, Snowflake, Sparkles } from "lucide-react";
import { Banner, EmptyState, LoadingCard, URGENCY_DOT, URGENCY_PILL } from "@/components/ui";
import { sortByExpiry, urgency, type PantryItem } from "@/lib/pantry";
import { defaultSelection, rankRecipes, toRecipeInput, type RankedRecipe, type Recipe } from "@/lib/recipes";
import { allowedByCategory, RESTRICTIONS, type RestrictionId } from "@/lib/restrictions";


export default function RecipesScreen({
  items,
  restrictions,
  onMade,
  onEditSettings,
  focus,
}: {
  items: PantryItem[];
  restrictions: RestrictionId[];
  onMade: (recipe: Recipe) => string[]; // returns names of pantry items that were reduced
  onEditSettings: () => void;
  focus: { key: number; ids: string[] | null }; // a new key resets the picker to these ids (null = expiring items)
}) {
  const [search, setSearch] = useState("");
  const [chosen, setChosen] = useState<string[] | null>(null); // null = default (expiring within 3 days)
  const [recipes, setRecipes] = useState<RankedRecipe[]>([]);
  const [made, setMade] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to a new focus request
  useEffect(() => setChosen(focus.ids), [focus.key]);

  const sorted = sortByExpiry(items.filter((i) => i.quantityPercent > 0));
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
        title="nothing to cook with yet"
        body="Scan a receipt first, then come back for recipe ideas that use up what's expiring."
      />
    );
  }

  return (
    <div>
      <div className="card mb-4 p-4">
        <label className="field flex items-center gap-2 focus-within:border-olive">
          <Search size={18} className="shrink-0 text-muted" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !loading && findRecipes()}
            placeholder="pasta, high protein, quick dinner..."
            className="min-w-0 flex-1 bg-transparent py-2 font-bold text-ink outline-none placeholder:font-medium placeholder:text-muted/70"
          />
        </label>

        <div className="mt-4 flex items-center justify-between">
          <p className="section-label">Cook with</p>
          <div className="-mr-2 flex text-xs font-extrabold">
            <button onClick={() => setChosen(null)} className="min-h-11 px-2 text-olive-text">
              expiring
            </button>
            <button onClick={() => setChosen([])} className="min-h-11 px-2 text-muted">
              clear
            </button>
          </div>
        </div>
        <div className="mt-1 flex max-h-48 flex-wrap gap-1.5 overflow-y-auto p-0.5">
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
                className={`flex min-h-10 items-center gap-1.5 rounded-full border-2 px-3 text-sm font-bold transition active:scale-95 ${
                  !ok ? "border-wall bg-wall text-muted/50 line-through" : on ? "border-olive bg-fine-bg text-fine" : "border-sand bg-paper text-brown"
                }`}
              >
                <span className={`h-2 w-2 shrink-0 rounded-full ${URGENCY_DOT[urgency(i)]}`} />
                {i.location === "freezer" && <Snowflake size={12} className="text-freeze" />}
                {i.name}
                {on && <Check size={14} strokeWidth={3} />}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs font-bold text-muted">
          {selected.size
            ? `${selected.size} selected`
            : search.trim()
              ? "Nothing selected: recipes will match your search using any pantry items."
              : "Nothing selected: we'll use everything in your pantry."}
        </p>

        <button onClick={onEditSettings} className="-mx-1 min-h-11 px-1 text-left text-sm font-bold">
          {labels.length ? (
            <span className="text-muted">
              Diet: <span className="text-olive-text">{labels.join(", ")}</span> <span className="text-muted/70">· edit</span>
            </span>
          ) : (
            <span className="text-muted">
              No allergies or diet set · <span className="text-olive-text">add</span>
            </span>
          )}
        </button>

        <button onClick={findRecipes} disabled={loading} className="btn btn-primary mb-1 mt-1 h-12 w-full">
          <Sparkles size={18} />
          find recipes
        </button>
      </div>

      {loading && (
        <div className="mb-4 space-y-3">
          <LoadingCard title="finding the best recipes for your pantry..." subtitle="Ranking them by what they use up" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="card animate-pulse space-y-3 p-4">
              <div className="h-5 w-3/4 rounded bg-tip" />
              <div className="h-4 w-1/2 rounded bg-tip" />
              <div className="flex gap-2">
                <div className="h-7 w-20 rounded-full bg-tip" />
                <div className="h-7 w-24 rounded-full bg-tip" />
              </div>
              <div className="h-11 rounded-xl bg-tip" />
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
          <p className="mb-2 px-1 text-xs font-bold text-muted">Ranked by how much of your expiring food each recipe uses.</p>
          <ul className="space-y-4">
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
    <li className={`card animate-fade-up p-4 ${best ? "ring-2 ring-olive" : ""}`}>
      {best && (
        <p className="pill mb-2 bg-olive px-2.5 py-1 text-white">
          <Award size={13} />
          best match: uses {plural(recipe.usedCount, "item")}
          {recipe.expiringCount > 0 && `, ${recipe.expiringCount} expiring`}
        </p>
      )}
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-xl font-bold leading-snug text-ink">{recipe.title}</h3>
        <span className="pill shrink-0 bg-tip px-2.5 py-1 text-brown">
          <Clock size={12} />
          {recipe.timeMinutes} min
        </span>
      </div>
      {recipe.description && <p className="mt-1 text-sm text-muted">{recipe.description}</p>}

      <p className="mt-3 text-xs font-extrabold text-ink">
        Uses {recipe.usedCount} of your items
        {recipe.expiringCount > 0 && <span className="text-terra"> · {recipe.expiringCount} expiring soon</span>}
      </p>
      {used.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {used.map((i) => (
            <span key={i.id} className={`pill px-2.5 py-1 ${i.location === "freezer" ? "pill-freeze" : URGENCY_PILL[urgency(i)]}`}>
              {i.location === "freezer" ? <Snowflake size={11} /> : <span className={`h-1.5 w-1.5 rounded-full ${URGENCY_DOT[urgency(i)]}`} />}
              {i.name}
            </span>
          ))}
        </div>
      )}

      {recipe.extraIngredients.length > 0 && (
        <p className="mt-3 flex gap-1.5 rounded-xl bg-tip px-3 py-2 text-sm text-brown">
          <ShoppingBasket size={15} className="mt-0.5 shrink-0" />
          <span>
            <span className="font-extrabold">to buy: </span>
            {recipe.extraIngredients.join(", ")}
          </span>
        </p>
      )}

      <button onClick={() => setOpen(!open)} className="-mx-1 mt-2 flex min-h-11 items-center gap-1 px-1 text-sm font-extrabold text-brown">
        {open ? "hide" : "show"} ingredients & steps
        <ChevronDown size={16} className={`transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="animate-fade-up mb-2 space-y-3">
          {recipe.ingredients.length > 0 && (
            <ul className="list-disc space-y-0.5 pl-5 text-sm text-ink marker:text-wood">
              {recipe.ingredients.map((ing, i) => (
                <li key={i}>{ing}</li>
              ))}
            </ul>
          )}
          <ol className="space-y-2">
            {recipe.steps.map((s, i) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed text-ink">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-tip text-xs font-extrabold text-brown">{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
        </div>
      )}

      <button onClick={onMade} disabled={made} className={`btn mb-1 mt-2 w-full text-sm ${made ? "bg-fine-bg text-fine" : "btn-primary"}`}>
        {made ? (
          <>
            <Check size={16} strokeWidth={3} /> made it! pantry updated
          </>
        ) : (
          <>
            <Check size={16} strokeWidth={3} /> i made this
          </>
        )}
      </button>
    </li>
  );
}
