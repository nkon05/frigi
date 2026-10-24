"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Bell, Camera, ChevronLeft, ChevronRight, Leaf } from "lucide-react";
import DonateSheet from "@/components/DonateSheet";
import ItemCard from "@/components/ItemCard";
import RecipesScreen from "@/components/RecipesScreen";
import SettingsScreen from "@/components/SettingsScreen";
import TabBar, { type Tab } from "@/components/TabBar";
import { Banner, CARD, EmptyState, LoadingCard } from "@/components/ui";
import { fileToResizedBase64 } from "@/lib/image";
import { demoPantry } from "@/lib/demo";
import { notificationPermission, notifyExpiring, requestNotifications } from "@/lib/notify";
import { daysLeft, incrementDonatedCount, loadPantry, savePantry, toPantryItem, type PantryItem, type ParsedItem } from "@/lib/pantry";
import { applyRecipeMade, type Recipe } from "@/lib/recipes";
import { loadRestrictions, saveRestrictions, type RestrictionId } from "@/lib/restrictions";

const TITLES: Record<Tab, string> = {
  pantry: "Your pantry",
  recipes: "Recipes",
  settings: "Settings",
};

export default function Home() {
  const [tab, setTab] = useState<Tab>("pantry");
  const [dietOpen, setDietOpen] = useState(false); // allergies & diet sub-screen inside the Recipes tab
  const [items, setItems] = useState<PantryItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [restrictions, setRestrictions] = useState<RestrictionId[]>([]);
  const [notifPerm, setNotifPerm] = useState<string>("unsupported");
  const [donating, setDonating] = useState<PantryItem | null>(null);

  useEffect(() => {
    setItems(loadPantry());
    setRestrictions(loadRestrictions());
    setNotifPerm(notificationPermission());
    setLoaded(true);
  }, []);

  // Expired or expiring within 2 days, and not used up
  const expiring = items
    .filter((i) => i.quantityPercent > 0 && daysLeft(i) <= 2)
    .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
  const expiringNames = expiring.map((i) => i.name);
  const expiringKey = expiringNames.join("|");

  useEffect(() => {
    if (loaded && expiringKey) notifyExpiring(expiringKey.split("|")); // at most once a day
  }, [loaded, expiringKey]);

  async function enableNotifications() {
    const perm = await requestNotifications();
    setNotifPerm(perm);
    if (perm === "granted") notifyExpiring(expiringNames, { force: true });
  }

  function markDonated(item: PantryItem) {
    update(items.filter((i) => i.id !== item.id));
    incrementDonatedCount();
    setDonating(null);
    setError(null);
    setNotice(`Thanks for donating ${item.name} 💚`);
  }

  function loadDemo() {
    if (items.length && !confirm("Replace your pantry with demo data?")) return;
    update(demoPantry());
    goTab("pantry");
    setError(null);
    setNotice("Demo pantry loaded 🎉");
  }

  // Switching tabs always lands on the tab's main screen
  function goTab(t: Tab) {
    setTab(t);
    setDietOpen(false);
  }

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
    goTab("pantry");
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

  const showDiet = tab === "recipes" && dietOpen;

  return (
    <div className="mx-auto flex h-dvh max-w-[480px] flex-col bg-cream sm:shadow-2xl">
      <div className="relative flex min-h-0 flex-1 flex-col">
        <header className="pt-safe z-10 bg-cream/90 px-5 pb-3 backdrop-blur-lg">
          {showDiet ? (
            <button
              onClick={() => setDietOpen(false)}
              className="-ml-2 -my-2.5 flex min-h-11 items-center gap-0.5 rounded-full pl-1 pr-3 text-sm font-semibold text-green-700 transition active:scale-95 active:bg-green-50"
            >
              <ChevronLeft size={20} strokeWidth={2.5} />
              Back
            </button>
          ) : (
            <div className="flex items-center gap-1.5 text-green-700">
              <Leaf size={16} strokeWidth={2.5} />
              <span className="text-sm font-bold tracking-tight">FreshTrack</span>
            </div>
          )}
          <div className="mt-1 flex items-baseline justify-between">
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">
              {showDiet ? "Allergies & diet" : TITLES[tab]}
            </h1>
            {tab === "pantry" && items.length > 0 && (
              <span className="text-sm text-stone-400">{items.length} items</span>
            )}
          </div>
          {expiring.length > 0 && (
            <ExpiringBanner
              names={expiringNames}
              canEnableNotifications={notifPerm === "default"}
              onOpen={() => goTab("recipes")}
              onEnableNotifications={enableNotifications}
            />
          )}
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
                <>
                  <EmptyState
                    icon={Camera}
                    title="Scan a receipt to get started"
                    body="Tap the green Scan button and snap your grocery receipt. We'll list your food and when it goes bad."
                  />
                  <div className="mt-4 flex justify-center">
                    <button
                      onClick={loadDemo}
                      className="min-h-11 rounded-full px-4 text-sm font-medium text-green-700 transition active:scale-95 active:bg-green-50"
                    >
                      or load demo data
                    </button>
                  </div>
                </>
              ) : (
                <ul className="space-y-3">
                  {sorted.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      onChange={(next) => update(items.map((i) => (i.id === next.id ? next : i)))}
                      onDelete={() => update(items.filter((i) => i.id !== item.id))}
                      onDonate={() => setDonating(item)}
                    />
                  ))}
                  {items.length > 0 && (
                    <li className="px-2 pt-2 text-center text-xs text-stone-400">
                      🛒 Reorder opens Google Shopping. Real store integration is planned.
                      <br />
                      Shelf life from USDA FoodKeeper where available, otherwise AI-estimated.
                    </li>
                  )}
                </ul>
              )}
          </div>

          {/* RecipesScreen stays mounted while the diet sub-screen is open, so recipes aren't lost */}
          <div className={tab === "recipes" && !dietOpen ? "animate-fade-up" : "hidden"}>
            <RecipesScreen
              items={items}
              restrictions={restrictions}
              onMade={handleMade}
              onEditSettings={() => setDietOpen(true)}
            />
          </div>

          {showDiet && (
            <div className="animate-fade-up">
              <SettingsScreen restrictions={restrictions} onChange={updateRestrictions} />
            </div>
          )}

          <div className={tab === "settings" ? "animate-fade-up" : "hidden"}>
            <SettingsScreen restrictions={restrictions} onChange={updateRestrictions} onLoadDemo={loadDemo} />
          </div>
        </main>

        <TabBar tab={tab} onTab={goTab} scanning={loading} onScan={handleFile} />

        {donating && (
          <DonateSheet item={donating} onClose={() => setDonating(null)} onDonated={() => markDonated(donating)} />
        )}
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

function ExpiringBanner({
  names,
  canEnableNotifications,
  onOpen,
  onEnableNotifications,
}: {
  names: string[];
  canEnableNotifications: boolean;
  onOpen: () => void;
  onEnableNotifications: () => void;
}) {
  return (
    <div className="animate-fade-up mt-3 overflow-hidden rounded-2xl bg-amber-50 ring-1 ring-amber-200">
      <button onClick={onOpen} className="flex min-h-12 w-full items-center gap-3 px-4 py-2.5 text-left transition active:bg-amber-100">
        <AlertTriangle size={18} className="shrink-0 text-amber-600" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-amber-900">
            {names.length} item{names.length === 1 ? "" : "s"} expiring soon
          </span>
          <span className="block truncate text-xs text-amber-800/80">{names.join(", ")}</span>
        </span>
        <span className="flex shrink-0 items-center text-xs font-medium text-amber-800">
          Recipes <ChevronRight size={14} />
        </span>
      </button>
      {canEnableNotifications && (
        <button
          onClick={onEnableNotifications}
          className="flex min-h-11 w-full items-center justify-center gap-1.5 border-t border-amber-200 text-xs font-medium text-amber-900 transition active:bg-amber-100"
        >
          <Bell size={14} /> Remind me with notifications
        </button>
      )}
    </div>
  );
}
