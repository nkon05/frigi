"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Bell, ChevronLeft, ChevronRight } from "lucide-react";
import DigestCard from "@/components/DigestCard";
import DigestSettings from "@/components/DigestSettings";
import DonateSheet from "@/components/DonateSheet";
import ImpactScreen from "@/components/ImpactScreen";
import ItemSheet from "@/components/ItemSheet";
import RecipesScreen from "@/components/RecipesScreen";
import RemoveSheet from "@/components/RemoveSheet";
import { ConfirmSheet } from "@/components/Sheet";
import Shelves, { Plank } from "@/components/Shelf";
import SettingsScreen from "@/components/SettingsScreen";
import TabBar, { type Tab } from "@/components/TabBar";
import { Banner, LoadingCard, Toast } from "@/components/ui";
import { fileToResizedBase64 } from "@/lib/image";
import { demoHistory, demoPantry } from "@/lib/demo";
import { historyEntry, loadHistory, saveHistory, type HistoryEntry, type Outcome } from "@/lib/history";
import {
  computeDigest,
  digestTimeToday,
  dismissedToday,
  dismissToday,
  loadDigestSettings,
  markSentToday,
  saveDigestSettings,
  sentToday,
  DEFAULT_DIGEST,
  type DigestSettings as DigestSettingsT,
} from "@/lib/digest";
import { isIOSNotInstalled, notifyStatus, registerServiceWorker, requestNotifications, showNotification, type NotifyStatus } from "@/lib/notify";
import {
  addDays,
  daysBetween,
  daysLeft,
  freezeDays,
  humanDays,
  loadPantry,
  savePantry,
  sortByExpiry,
  todayISO,
  toPantryItem,
  type PantryItem,
  type ParsedItem,
} from "@/lib/pantry";
import { applyRecipeMade, type Recipe } from "@/lib/recipes";
import { loadRestrictions, saveRestrictions, type RestrictionId } from "@/lib/restrictions";

const TITLES: Record<Tab, string> = {
  pantry: "your kitchen",
  recipes: "recipes",
  impact: "your impact",
  settings: "settings",
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
  const [notifStatus, setNotifStatus] = useState<NotifyStatus>("unsupported");
  const [digestSettings, setDigestSettings] = useState<DigestSettingsT>(DEFAULT_DIGEST);
  const [digestDismissed, setDigestDismissed] = useState(false);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [iosNeedsInstall, setIosNeedsInstall] = useState(false);
  const [donating, setDonating] = useState<PantryItem | null>(null);
  const [removing, setRemoving] = useState<PantryItem | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [toast, setToast] = useState<{ text: string; key: number } | null>(null);
  const [pantryView, setPantryView] = useState<"main" | "freezer">("main");
  // A new key resets the recipe picker to these ids (null = items expiring soon)
  const [recipesFocus, setRecipesFocus] = useState<{ key: number; ids: string[] | null }>({ key: 0, ids: null });
  const [openItemId, setOpenItemId] = useState<string | null>(null); // item sheet
  const [confirming, setConfirming] = useState<"demo" | "reset" | null>(null);

  useEffect(() => {
    setItems(loadPantry());
    setHistory(loadHistory());
    setRestrictions(loadRestrictions());
    setNotifStatus(notifyStatus());
    setDigestSettings(loadDigestSettings());
    setDigestDismissed(dismissedToday());
    setIosNeedsInstall(isIOSNotInstalled());
    setLoaded(true);
    registerServiceWorker();

    // Opened from a notification: /?tab=pantry, or a message from the service worker if already open
    const urlTab = new URLSearchParams(window.location.search).get("tab");
    if (urlTab === "pantry") window.history.replaceState(null, "", "/");
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === "open-tab" && e.data.tab === "pantry") {
        setTab("pantry");
        setDietOpen(false);
      }
    };
    navigator.serviceWorker?.addEventListener("message", onMessage);
    return () => navigator.serviceWorker?.removeEventListener("message", onMessage);
  }, []);

  // Expired or expiring within 2 days, and not used up
  const expiring = items
    .filter((i) => i.quantityPercent > 0 && daysLeft(i) <= 2)
    .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
  const expiringNames = expiring.map((i) => i.name);

  // ---- Daily digest (client-side only: runs when the app is open) ----
  const digest = computeDigest(items);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const maybeSendDigest = useCallback(async () => {
    if (!digestSettings.enabled || sentToday() || !itemsRef.current.length) return;
    if (new Date() < digestTimeToday(digestSettings.time)) return;
    if (await showNotification("FreshTrack daily digest", computeDigest(itemsRef.current).text)) markSentToday();
  }, [digestSettings]);

  // On open, whenever the app becomes visible again, and at the chosen time if the app is still open
  useEffect(() => {
    if (!loaded) return;
    maybeSendDigest();
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      setNotifStatus(notifyStatus()); // permission may have changed in browser settings
      maybeSendDigest();
    };
    document.addEventListener("visibilitychange", onVisible);
    const msUntil = digestTimeToday(digestSettings.time).getTime() - Date.now();
    const timer = msUntil > 0 ? setTimeout(maybeSendDigest, msUntil) : undefined;
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      clearTimeout(timer);
    };
  }, [loaded, maybeSendDigest, digestSettings.time]);

  // Recipes tab with these items pre-selected (null = the default: items expiring soon)
  function seeRecipes(ids: string[] | null = null) {
    setRecipesFocus((f) => ({ key: f.key + 1, ids }));
    goTab("recipes");
  }

  function updateDigestSettings(next: DigestSettingsT) {
    setDigestSettings(next);
    saveDigestSettings(next);
  }

  async function toggleDigest(enabled: boolean) {
    if (enabled && notifyStatus() === "default") setNotifStatus(await requestNotifications());
    updateDigestSettings({ ...digestSettings, enabled });
  }

  async function sendTestDigest() {
    let status = notifyStatus();
    if (status === "default") status = await requestNotifications();
    setNotifStatus(status);
    const shown = status === "granted" && (await showNotification("FreshTrack daily digest", digest.text));
    setTestMessage(
      shown
        ? "Sent! Check your notifications."
        : status === "denied"
          ? "Notifications are blocked for this site, so the test couldn't be sent."
          : status === "unsupported"
            ? "This browser can't show notifications."
            : "Couldn't show the notification. Try again."
    );
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
      donated: `Thanks for donating ${item.name}!`,
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
    setToast({ text: `Frozen! Added ~${humanDays(daysAdded)} to the ${item.name}`, key: Date.now() });
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

  // Never overwrite real data without asking
  function loadDemo() {
    if (items.length || history.length) setConfirming("demo");
    else replaceWithDemo();
  }

  function replaceWithDemo() {
    setConfirming(null);
    update(demoPantry());
    const demo = demoHistory();
    setHistory(demo);
    saveHistory(demo);
    setPantryView("main");
    goTab("pantry");
    setError(null);
    setNotice("Demo data loaded. Check the Freezer and Impact tabs too.");
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
        `Added ${parsed.length} item${parsed.length === 1 ? "" : "s"} to your shelves` +
          (toFreezer ? ` (${toFreezer} in the freezer)` : "")
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const sorted = sortByExpiry(items);
  const freezerItems = sorted.filter((i) => i.location === "freezer");
  const mainItems = sorted.filter((i) => i.location !== "freezer");
  const visible = pantryView === "freezer" ? freezerItems : mainItems;
  const openItem = openItemId ? items.find((i) => i.id === openItemId) : undefined;

  const showDiet = tab === "recipes" && dietOpen;

  return (
    <div className="wallpaper mx-auto flex h-dvh max-w-[480px] flex-col sm:shadow-2xl">
      <div className="relative flex min-h-0 flex-1 flex-col">
        <header className="pt-safe z-10 px-5 pb-3">
          {showDiet ? (
            <button
              onClick={() => setDietOpen(false)}
              className="-ml-2 -my-2.5 flex min-h-11 items-center gap-0.5 rounded-full pl-1 pr-3 text-[13px] font-extrabold text-olive transition active:scale-95 active:bg-tip"
            >
              <ChevronLeft size={20} strokeWidth={2.5} />
              Back
            </button>
          ) : (
            <p className="text-[13px] font-extrabold text-olive">frigi.</p>
          )}
          <div className="mt-1 flex items-baseline justify-between">
            <h1 className="font-display text-[30px] font-normal leading-tight text-heading">
              {showDiet ? "allergies & diet" : TITLES[tab]}
            </h1>
            {tab === "pantry" && items.length > 0 && (
              <span className="text-[11px] font-bold text-muted">
                {items.length} item{items.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
          {/* On Pantry, the digest card covers this */}
          {expiring.length > 0 && tab !== "pantry" && (
            <ExpiringBanner
              names={expiringNames}
              canEnableNotifications={!digestSettings.enabled && notifStatus !== "unsupported" && notifStatus !== "denied"}
              onOpen={() => seeRecipes()}
              onEnableNotifications={async () => {
                await toggleDigest(true);
                setToast({ text: "Daily digest is on. Change the time in Settings.", key: Date.now() });
              }}
            />
          )}
        </header>

        <main className="flex-1 overflow-y-auto overscroll-contain pb-32 pt-2">
          {/* All screens stay mounted (just hidden) so in-progress state survives tab switches */}
          <div className={tab === "pantry" ? "animate-fade-up" : "hidden"}>
            {loading && <ScanningState />}

            <div className="px-4">
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
            </div>

            {loaded && items.length > 0 && !digestDismissed && (
              <DigestCard
                digest={digest}
                onSeeRecipes={() => seeRecipes(digest.urgent.map((u) => u.id))}
                onDismiss={() => {
                  dismissToday();
                  setDigestDismissed(true);
                }}
              />
            )}

            {loaded && items.length > 0 && (
              <Segmented
                value={pantryView}
                onChange={setPantryView}
                options={[
                  { value: "main", label: "Fridge & Pantry", count: mainItems.length },
                  { value: "freezer", label: "Freezer", count: freezerItems.length },
                ]}
              />
            )}

            {loaded && !loading && visible.length === 0 ? (
              <EmptyShelf
                text={
                  items.length === 0
                    ? "Your shelves are empty. Scan a receipt to stock them."
                    : pantryView === "freezer"
                      ? "Nothing in the freezer yet. Freeze food that's about to expire to keep it for months."
                      : "Nothing in the fridge or pantry. Scan a receipt to stock them."
                }
                onLoadDemo={items.length === 0 ? loadDemo : undefined}
              />
            ) : (
              <Shelves items={visible} onOpen={(item) => setOpenItemId(item.id)} />
            )}

            {items.length > 0 && (
              <p className="px-6 pt-2 text-center text-xs text-muted/80">
                Reorder opens Google Shopping. Real store integration is planned.
                <br />
                Shelf life from USDA FoodKeeper where available, otherwise AI-estimated.
              </p>
            )}
          </div>

          {/* RecipesScreen stays mounted while the diet sub-screen is open, so recipes aren't lost */}
          <div className={tab === "recipes" && !dietOpen ? "animate-fade-up px-4" : "hidden"}>
            <RecipesScreen
              items={items}
              restrictions={restrictions}
              onMade={handleMade}
              onEditSettings={() => setDietOpen(true)}
              focus={recipesFocus}
            />
          </div>

          {showDiet && (
            <div className="animate-fade-up px-4">
              <SettingsScreen restrictions={restrictions} onChange={updateRestrictions} />
            </div>
          )}

          <div className={tab === "impact" ? "animate-fade-up px-4" : "hidden"}>
            <ImpactScreen history={history} onReset={() => setConfirming("reset")} />
          </div>

          <div className={tab === "settings" ? "animate-fade-up px-4" : "hidden"}>
            <SettingsScreen
              restrictions={restrictions}
              onChange={updateRestrictions}
              onLoadDemo={loadDemo}
              extra={
                <DigestSettings
                  settings={digestSettings}
                  status={notifStatus}
                  iosNeedsInstall={iosNeedsInstall}
                  testMessage={testMessage}
                  onToggle={toggleDigest}
                  onTime={(time) => updateDigestSettings({ ...digestSettings, time })}
                  onTest={sendTestDigest}
                />
              }
            />
          </div>
        </main>

        <TabBar tab={tab} onTab={goTab} scanning={loading} onScan={handleFile} />

        {toast && <Toast key={toast.key} text={toast.text} />}

        {confirming === "demo" && (
          <ConfirmSheet
            title="load demo data?"
            body="This replaces your pantry and impact history with sample data. It can't be undone."
            confirmLabel="replace"
            onConfirm={replaceWithDemo}
            onClose={() => setConfirming(null)}
          />
        )}
        {confirming === "reset" && (
          <ConfirmSheet
            title="reset your stats?"
            body="This clears your impact history: money saved, waste and freezing. Your pantry stays as it is. It can't be undone."
            confirmLabel="reset"
            onConfirm={() => {
              setConfirming(null);
              resetStats();
            }}
            onClose={() => setConfirming(null)}
          />
        )}

        {openItem && (
          <ItemSheet
            item={openItem}
            onClose={() => setOpenItemId(null)}
            onChange={changeItem}
            onFreeze={() => {
              setOpenItemId(null);
              freezeItem(openItem);
            }}
            onThaw={() => {
              setOpenItemId(null);
              thawItem(openItem);
            }}
            onDonate={() => {
              setOpenItemId(null);
              setDonating(openItem);
            }}
            onRemove={() => {
              setOpenItemId(null);
              setRemoving(openItem);
            }}
            onSeeRecipes={() => {
              setOpenItemId(null);
              seeRecipes([openItem.id]);
            }}
          />
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
    <div className="mb-4">
      <div className="mb-4 px-4">
        <LoadingCard title="reading your receipt..." subtitle="Finding food items and expiry dates" />
      </div>
      <div className="grid grid-cols-3 gap-2 px-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[112px] animate-pulse rounded-[12px_12px_4px_4px] bg-paper/80 p-2">
            <div className="h-5 w-5 rounded-full bg-sand/60" />
            <div className="mt-2 h-3 w-3/4 rounded bg-sand/60" />
            <div className="mt-3 h-4 w-1/2 rounded-full bg-sand/60" />
          </div>
        ))}
      </div>
      <Plank />
    </div>
  );
}

function EmptyShelf({ text, onLoadDemo }: { text: string; onLoadDemo?: () => void }) {
  return (
    <div className="pt-6">
      <p className="mx-auto mb-3 max-w-[280px] px-4 text-center font-display text-lg leading-snug text-ink">{text}</p>
      <Plank />
      {onLoadDemo && (
        <div className="flex justify-center">
          <button onClick={onLoadDemo} className="min-h-11 rounded-full px-4 text-sm font-bold text-olive-text transition active:scale-95">
            or load demo data
          </button>
        </div>
      )}
    </div>
  );
}

// Shown at the top of non-Pantry tabs (Pantry has the digest card instead)
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
    <div className="animate-fade-up mt-3 overflow-hidden rounded-2xl border-2 border-terra bg-paper">
      <button onClick={onOpen} className="flex min-h-12 w-full items-center gap-3 px-3 py-2.5 text-left transition active:bg-tip">
        <AlertTriangle size={18} className="shrink-0 text-terra" />
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-extrabold text-ink">
            {names.length} item{names.length === 1 ? "" : "s"} expiring soon
          </span>
          <span className="block truncate text-xs font-bold text-muted">{names.join(", ")}</span>
        </span>
        <span className="pill shrink-0 bg-urgent-bg px-2.5 py-1.5 text-[13px] text-terra">
          see recipes <ChevronRight size={14} />
        </span>
      </button>
      {canEnableNotifications && (
        <button
          onClick={onEnableNotifications}
          className="flex min-h-11 w-full items-center justify-center gap-1.5 border-t-2 border-wall text-xs font-extrabold text-brown transition active:bg-tip"
        >
          <Bell size={14} /> get a daily digest
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
    <div role="tablist" className="mx-4 mb-4 flex rounded-full bg-sand p-1">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.value)}
            className={`min-h-11 flex-1 rounded-full text-[13px] font-extrabold text-ink transition active:scale-[0.98] ${on ? "bg-paper shadow-sm" : ""}`}
          >
            {o.label} ({o.count})
          </button>
        );
      })}
    </div>
  );
}
