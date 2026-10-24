"use client";

import { useEffect, useState } from "react";
import { Camera, Leaf } from "lucide-react";
import ItemCard from "@/components/ItemCard";
import RecipesScreen from "@/components/RecipesScreen";
import SettingsScreen from "@/components/SettingsScreen";
import TabBar, { type Tab } from "@/components/TabBar";
import { Banner, CARD, EmptyState, LoadingCard } from "@/components/ui";
import { fileToResizedBase64 } from "@/lib/image";
import { loadPantry, savePantry, toPantryItem, type PantryItem, type ParsedItem } from "@/lib/pantry";
import { applyRecipeMade, type Recipe } from "@/lib/recipes";
import { loadRestrictions, saveRestrictions, type RestrictionId } from "@/lib/restrictions";

const TITLES: Record<Tab, string> = {
  pantry: "Your pantry",
  recipes: "Recipes",
  settings: "Settings",
};

export default function Home() {
  const [tab, setTab] = useState<Tab>("pantry");
  const [items, setItems] = useState<PantryItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [restrictions, setRestrictions] = useState<RestrictionId[]>([]);

  useEffect(() => {
    setItems(loadPantry());
    setRestrictions(loadRestrictions());
    setLoaded(true);
  }, []);

  function update(next: PantryItem[]) {
    setItems(next);
    savePantry(next);
  }

  function updateRestrictions(next: RestrictionId[]) {
    setRestrictions(next);
    saveRestrictions(next);
  }

  function handleMade(recipe: Recipe): string[] {
    const { next, updated } = applyRecipeMade(items, recipe);
    update(next);
    return updated;
  }

  async function handleFile(file: File) {
    setTab("pantry");
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const image = await fileToResizedBase64(file);
      const res = await fetch("/api/parse-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, mediaType: "image/jpeg" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      const parsed: ParsedItem[] = data.items;
      if (!parsed.length) {
        setError("No food items found. Try a clearer photo of the receipt.");
        return;
      }
      update([...items, ...parsed.map((p) => toPantryItem(p))]);
      setNotice(`Added ${parsed.length} item${parsed.length === 1 ? "" : "s"} 🎉`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const sorted = [...items].sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));

  return (
    <div className="mx-auto flex h-dvh max-w-[480px] flex-col bg-cream sm:shadow-2xl">
      <div className="relative flex min-h-0 flex-1 flex-col">
        <header className="pt-safe z-10 bg-cream/90 px-5 pb-3 backdrop-blur-lg">
          <div className="flex items-center gap-1.5 text-green-700">
            <Leaf size={16} strokeWidth={2.5} />
            <span className="text-sm font-bold tracking-tight">FreshTrack</span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">{TITLES[tab]}</h1>
            {tab === "pantry" && items.length > 0 && (
              <span className="text-sm text-stone-400">{items.length} items</span>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overscroll-contain px-4 pb-32 pt-2">
          {/* All screens stay mounted (just hidden) so in-progress state survives tab switches */}
          <div className={tab === "pantry" ? "animate-fade-up" : "hidden"}>
              {loading && <ScanningState />}

              {error && (
                <Banner tone="error" onClose={() => setError(null)}>
                  {error}
                </Banner>
              )}
              {notice && !loading && (
                <Banner tone="success" onClose={() => setNotice(null)}>
                  {notice}
                </Banner>
              )}

              {loaded && items.length === 0 && !loading ? (
                <EmptyState
                  icon={Camera}
                  title="Scan a receipt to get started"
                  body="Tap the green Scan button and snap your grocery receipt. We'll list your food and when it goes bad."
                />
              ) : (
                <ul className="space-y-3">
                  {sorted.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      onChange={(next) => update(items.map((i) => (i.id === next.id ? next : i)))}
                      onDelete={() => update(items.filter((i) => i.id !== item.id))}
                    />
                  ))}
                </ul>
              )}
          </div>

          <div className={tab === "recipes" ? "animate-fade-up" : "hidden"}>
            <RecipesScreen
              items={items}
              restrictions={restrictions}
              onMade={handleMade}
              onEditSettings={() => setTab("settings")}
            />
          </div>

          <div className={tab === "settings" ? "animate-fade-up" : "hidden"}>
            <SettingsScreen restrictions={restrictions} onChange={updateRestrictions} />
          </div>
        </main>

        <TabBar tab={tab} onTab={setTab} scanning={loading} onScan={handleFile} />
      </div>
    </div>
  );
}

function ScanningState() {
  return (
    <div className="mb-4 space-y-3">
      <LoadingCard title="Reading your receipt..." subtitle="Finding food items and expiry dates" />
      {[0, 1, 2].map((i) => (
        <div key={i} className={`${CARD} flex animate-pulse gap-3 p-4`}>
          <div className="h-12 w-12 rounded-xl bg-stone-100" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-4 w-2/3 rounded bg-stone-100" />
            <div className="h-3 w-1/3 rounded bg-stone-100" />
            <div className="h-6 w-1/2 rounded-full bg-stone-100" />
          </div>
        </div>
      ))}
    </div>
  );
}
