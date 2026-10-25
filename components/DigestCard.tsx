"use client";

import { ChefHat, Sun, X } from "lucide-react";
import type { Digest } from "@/lib/digest";

export default function DigestCard({
  digest,
  onSeeRecipes,
  onDismiss,
}: {
  digest: Digest;
  onSeeRecipes: () => void;
  onDismiss: () => void;
}) {
  const attention = digest.soon > 0;
  const counts = [
    [digest.expired, "expired"],
    [digest.today, "today"],
    [digest.tomorrow, "tomorrow"],
  ].filter(([n]) => n) as [number, string][];

  return (
    <div className={`animate-fade-up mb-3 rounded-2xl p-4 ring-1 ${attention ? "bg-amber-50 ring-amber-200" : "bg-green-50 ring-green-200"}`}>
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white ${attention ? "text-amber-600" : "text-green-600"}`}>
          <Sun size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-xs font-semibold uppercase tracking-wide ${attention ? "text-amber-700/70" : "text-green-700/70"}`}>
            Today&apos;s digest
          </p>
          <p className={`mt-0.5 text-sm font-medium leading-snug ${attention ? "text-amber-950" : "text-green-900"}`}>{digest.text}</p>
          {counts.length > 0 && (
            <p className="mt-1 text-xs text-amber-800/80">{counts.map(([n, label]) => `${n} ${label}`).join(" · ")}</p>
          )}
        </div>
        <button
          onClick={onDismiss}
          aria-label="Dismiss today's digest"
          className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-stone-400 transition active:scale-95 active:bg-white/70"
        >
          <X size={18} />
        </button>
      </div>
      {attention && (
        <button
          onClick={onSeeRecipes}
          className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-amber-500 text-sm font-semibold text-white shadow-sm transition active:scale-95"
        >
          <ChefHat size={16} />
          See recipes
        </button>
      )}
    </div>
  );
}
