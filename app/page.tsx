"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Bell, Camera, ChevronLeft, ChevronRight, Leaf, Snowflake } from "lucide-react";
import DonateSheet from "@/components/DonateSheet";
import ImpactScreen from "@/components/ImpactScreen";
import ItemCard from "@/components/ItemCard";
import RecipesScreen from "@/components/RecipesScreen";
import RemoveSheet from "@/components/RemoveSheet";
import SettingsScreen from "@/components/SettingsScreen";
import TabBar, { type Tab } from "@/components/TabBar";
import { Banner, CARD, EmptyState, LoadingCard } from "@/components/ui";
import { fileToResizedBase64 } from "@/lib/image";
import { demoPantry } from "@/lib/demo";
import { historyEntry, loadHistory, saveHistory, type HistoryEntry, type Outcome } from "@/lib/history";
import { notificationPermission, notifyExpiring, requestNotifications } from "@/lib/notify";
import {
  addDays,
  daysBetween,
  daysLeft,
  freezeDays,
  humanDays,
  loadPantry,
  savePantry,
  todayISO,
  toPantryItem,
  type PantryItem,
  type ParsedItem,
} from "@/lib/pantry";
import { applyRecipeMade, type Recipe } from "@/lib/recipes";
import { loadRestrictions, saveRestrictions, type RestrictionId } from "@/lib/restrictions";

const TITLES: Record<Tab, string> = {
  pantry: "Your pantry",
  recipes: "Recipes",
  impact: "Your impact",
  settings: "Settings",
};

const THAWED_DAYS = 3;

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
  const [removing, setRemoving] = useState<PantryItem | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [toast, setToast] = useState<{ text: string; key: number } | null>(null);
  const [pantryView, setPantryView] = useState<"main" | "freezer">("main");

  useEffect(() => {
    setItems(loadPantry());
    setHistory(loadHistory());
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

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  function addHistory(entries: HistoryEntry[]) {
    setHistory((h) => {
      const next = [...h, ...entries];
      saveHistory(next);
      return next;
    });
  }

  // The one place items leave the pantry with an outcome (removal sheet, donate sheet, used up)
  function logRemoval(item: PantryItem, outcome: Exclude<Outcome, "frozen">) {
    update(items.filter((i) => i.id !== item.id));
    addHistory([historyEntry(item, outcome)]);
    setRemoving(null);
    setDonating(null);
    const text = {
      used: `Nice, you used up the ${item.name}!`,
      tossed: `Logged ${item.name} as tossed`,
      donated: `Thanks for donating ${item.name} 💚`,
    }[outcome];
    setToast({ text, key: Date.now() });
  }

  function markDonated(item: PantryItem) {
    logRemoval(item, "donated");
  }

  // Quantity edits: reaching 0% means it was used up
  function changeItem(next: PantryItem) {
    if (next.quantityPercent <= 0) logRemoval(next, "used");
    else update(items.map((i) => (i.id === next.id ? next : i)));
  }

  // Move to the freezer: new expiry = today + freezer shelf life; logged as "frozen" (not a removal)
  function freezeItem(item: PantryItem) {
    const days = freezeDays(item);
    if (days == null) return;
    const expiryDate = addDays(todayISO(), days);
    const daysAdded = Math.max(0, daysBetween(item.expiryDate, expiryDate));
    update(
      items.map((i) =>
        i.id === item.id
          ? {
              ...i,
              location: "freezer",
              expiryDate,
              shelfLifeDays: daysBetween(i.purchaseDate, expiryDate),
              shelfLifeSource: i.freezerShelfLifeDays != null ? "usda" : "ai",
              thawed: false,
            }
          : i
      )
    );
    addHistory([historyEntry(item, "frozen", { daysAdded })]);
    setToast({ text: `Frozen! Added ~${humanDays(daysAdded)} to the ${item.name} ❄️`, key: Date.now() });
  }

  // Thawed food spoils faster: back to the fridge with a short, fixed expiry
  function thawItem(item: PantryItem) {
    const expiryDate = addDays(todayISO(), THAWED_DAYS);
    update(
      items.map((i) =>
        i.id === item.id
          ? { ...i, location: "fridge", expiryDate, shelfLifeDays: daysBetween(i.purchaseDate, expiryDate), thawed: true }
          : i
      )
    );
    setToast({ text: `${item.name} thawed. Use within ${THAWED_DAYS} days`, key: Date.now() });
  }

  function resetStats() {
    setHistory([]);
    saveHistory([]);
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
    const usedUp = next.filter((i) => i.quantityPercent <= 0);
    update(next.filter((i) => i.quantityPercent > 0));
    if (usedUp.length) {
      addHistory(usedUp.map((i) => historyEntry(i, "used")));
      const names = usedUp.map((i) => i.name).join(", ");
      setToast({ text: `Nice, you used up the ${names}!`, key: Date.now() });
    }
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
      const toFreezer = parsed.filter((p) => p.location === "freezer").length;
      setNotice(
        `Added ${parsed.length} item${parsed.length === 1 ? "" : "s"} 🎉` +
          (toFreezer ? ` (${toFreezer} in the freezer)` : "")
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const sorted = [...items].sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
  const freezerItems = sorted.filter((i) => i.location === "freezer");
  const mainItems = sorted.filter((i) => i.location !== "freezer");
  const visible = pantryView === "freezer" ? freezerItems : mainItems;

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
                <>
                <Segmented
                  value={pantryView}
                  onChange={setPantryView}
                  options={[
                    { value: "main", label: "Fridge & Pantry", count: mainItems.length },
                    { value: "freezer", label: "Freezer", count: freezerItems.length },
                  ]}
                />
                {visible.length === 0 && (
                  <EmptyState
                    icon={pantryView === "freezer" ? Snowflake : Camera}
                    title={pantryView === "freezer" ? "Nothing in the freezer" : "Fridge & pantry are empty"}
                    body={
                      pantryView === "freezer"
                        ? "Tap Freeze on an item that's about to expire to keep it for months."
                        : "Scan a receipt to add more food."
                    }
                  />
                )}
                <ul className="space-y-3">
                  {visible.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      onChange={changeItem}
                      onDelete={() => setRemoving(item)}
                      onDonate={() => setDonating(item)}
                      onFreeze={() => freezeItem(item)}
                      onThaw={() => thawItem(item)}
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
                </>
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

          <div className={tab === "impact" ? "animate-fade-up" : "hidden"}>
            <ImpactScreen history={history} onReset={resetStats} />
          </div>

          <div className={tab === "settings" ? "animate-fade-up" : "hidden"}>
            <SettingsScreen restrictions={restrictions} onChange={updateRestrictions} onLoadDemo={loadDemo} />
          </div>
        </main>

        <TabBar tab={tab} onTab={goTab} scanning={loading} onScan={handleFile} />

        {toast && (
          <div
            key={toast.key}
            role="status"
            className="animate-fade-up pointer-events-none absolute inset-x-0 bottom-28 z-20 flex justify-center px-6"
          >
            <p className="rounded-full bg-stone-900/90 px-4 py-2.5 text-center text-sm font-medium text-white shadow-lg">
              {toast.text}
            </p>
          </div>
        )}

        {removing && (
          <RemoveSheet
            item={removing}
            onChoose={(outcome) => (outcome === "donated" ? markDonated(removing) : logRemoval(removing, outcome))}
            onJustDelete={() => {
              update(items.filter((i) => i.id !== removing.id));
              setRemoving(null);
            }}
            onClose={() => setRemoving(null)}
          />
        )}

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

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; count: number }[];
}) {
  return (
    <div role="tablist" className="mb-3 flex rounded-2xl bg-stone-200/60 p-1">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.value)}
            className={`flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold transition active:scale-[0.98] ${
              on ? (o.value === "freezer" ? "bg-white text-sky-700 shadow-sm" : "bg-white text-green-800 shadow-sm") : "text-stone-500"
            }`}
          >
            {o.value === "freezer" && <Snowflake size={14} />}
            {o.label}
            <span className={`rounded-full px-1.5 text-xs tabular-nums ${on ? "bg-stone-100" : "bg-stone-200/80"}`}>{o.count}</span>
          </button>
        );
      })}
    </div>
  );
}
