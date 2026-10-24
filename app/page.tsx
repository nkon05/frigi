"use client";

import { useEffect, useState } from "react";
import { Camera, ChefHat, Leaf, Settings as SettingsIcon, type LucideIcon } from "lucide-react";
import ItemCard from "@/components/ItemCard";
import TabBar, { type Tab } from "@/components/TabBar";
import { fileToResizedBase64 } from "@/lib/image";
import { loadPantry, savePantry, toPantryItem, type PantryItem, type ParsedItem } from "@/lib/pantry";

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

  useEffect(() => {
    setItems(loadPantry());
    setLoaded(true);
  }, []);

  function update(next: PantryItem[]) {
    setItems(next);
    savePantry(next);
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
          {tab === "pantry" && (
            <div key="pantry" className="animate-fade-up">
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
          )}

          {tab === "recipes" && (
            <div key="recipes" className="animate-fade-up">
              <EmptyState
                icon={ChefHat}
                title="Recipes coming soon"
                body="Soon you'll get recipe ideas that use up what's expiring first."
              />
            </div>
          )}

          {tab === "settings" && (
            <div key="settings" className="animate-fade-up">
              <EmptyState
                icon={SettingsIcon}
                title="Settings coming soon"
                body="Allergies and diet preferences will live here."
              />
            </div>
          )}
        </main>

        <TabBar tab={tab} onTab={setTab} scanning={loading} onScan={handleFile} />
      </div>
    </div>
  );
}

function ScanningState() {
  return (
    <div className="mb-4 space-y-3">
      <div className="flex items-center gap-3 rounded-2xl bg-green-600 p-4 text-white shadow-lg shadow-green-600/20">
        <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-white border-t-transparent" />
        <div>
          <p className="font-semibold">Reading your receipt...</p>
          <p className="text-sm text-green-100">Finding food items and expiry dates</p>
        </div>
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex animate-pulse gap-3 rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(28,25,23,0.06)]">
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

function Banner({
  tone,
  children,
  onClose,
}: {
  tone: "error" | "success";
  children: React.ReactNode;
  onClose: () => void;
}) {
  const cls = tone === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-800";
  return (
    <button
      onClick={onClose}
      className={`animate-fade-up mb-3 flex min-h-11 w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left text-sm transition active:scale-[0.98] ${cls}`}
    >
      <span>{children}</span>
      <span className="text-lg leading-none opacity-50">×</span>
    </button>
  );
}

function EmptyState({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center px-6 pt-16 text-center">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-green-100 text-green-700">
        <Icon size={36} />
      </div>
      <h2 className="text-lg font-semibold text-stone-800">{title}</h2>
      <p className="mt-1 max-w-xs text-sm leading-relaxed text-stone-500">{body}</p>
    </div>
  );
}
