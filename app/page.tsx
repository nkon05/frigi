"use client";

import { useEffect, useRef, useState } from "react";
import ItemCard from "@/components/ItemCard";
import { fileToResizedBase64 } from "@/lib/image";
import { loadPantry, savePantry, toPantryItem, type PantryItem, type ParsedItem } from "@/lib/pantry";

export default function Home() {
  const [items, setItems] = useState<PantryItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setItems(loadPantry());
    setLoaded(true);
  }, []);

  function update(next: PantryItem[]) {
    setItems(next);
    savePantry(next);
  }

  async function handleFile(file: File) {
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
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const sorted = [...items].sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));

  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 pb-16 pt-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-emerald-700">frigi</h1>
        <p className="text-sm text-slate-500">Snap a receipt. Eat it before it goes bad.</p>
      </header>

      <label
        className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl px-4 py-4 text-lg font-semibold text-white shadow-md transition active:scale-[0.98] ${
          loading ? "pointer-events-none bg-emerald-400" : "bg-emerald-600 hover:bg-emerald-700"
        }`}
      >
        {loading ? (
          <>
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Reading your receipt…
          </>
        ) : (
          <>📷 Scan a receipt</>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          disabled={loading}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
      </label>

      {error && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {notice && <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}

      <section className="mt-8">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Your pantry</h2>
          {items.length > 0 && <span className="text-sm text-slate-400">{items.length} items</span>}
        </div>

        {loaded && items.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center text-slate-400">
            Nothing here yet. Scan a grocery receipt to get started.
          </div>
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
      </section>
    </main>
  );
}
