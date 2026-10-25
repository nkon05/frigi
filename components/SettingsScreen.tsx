"use client";

import { Check, Sparkles } from "lucide-react";
import { CARD } from "@/components/ui";
import { RESTRICTIONS, type RestrictionId } from "@/lib/restrictions";

export default function SettingsScreen({
  restrictions,
  onChange,
  onLoadDemo,
}: {
  restrictions: RestrictionId[];
  onChange: (r: RestrictionId[]) => void;
  onLoadDemo?: () => void; // omit to hide the Demo section (e.g. on the Recipes diet sub-screen)
}) {
  function toggle(id: RestrictionId) {
    onChange(restrictions.includes(id) ? restrictions.filter((r) => r !== id) : [...restrictions, id]);
  }

  return (
    <div>
      <h2 className="px-1 text-sm font-semibold uppercase tracking-wide text-stone-400">Allergies & diet</h2>
      <p className="mb-3 mt-1 px-1 text-sm text-stone-500">Recipe ideas will strictly avoid anything you check here.</p>

      <ul className={`${CARD} divide-y divide-stone-100 overflow-hidden`}>
        {RESTRICTIONS.map((r) => {
          const on = restrictions.includes(r.id);
          return (
            <li key={r.id}>
              <label className="flex min-h-14 cursor-pointer items-center gap-3 px-4 transition active:bg-stone-50">
                <input type="checkbox" className="sr-only" checked={on} onChange={() => toggle(r.id)} />
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition ${
                    on ? "border-green-600 bg-green-600 text-white" : "border-stone-300 bg-white"
                  }`}
                >
                  {on && <Check size={16} strokeWidth={3} />}
                </span>
                <span className="font-medium text-stone-800">{r.label}</span>
              </label>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 px-1 text-xs text-stone-400">Saved on this device.</p>

      {onLoadDemo && (
        <>
          <h2 className="mt-8 px-1 text-sm font-semibold uppercase tracking-wide text-stone-400">Demo</h2>
          <button
            onClick={onLoadDemo}
            className={`${CARD} mt-3 flex min-h-14 w-full items-center gap-3 px-4 text-left transition active:scale-[0.98]`}
          >
            <Sparkles size={20} className="shrink-0 text-green-600" />
            <span>
              <span className="block font-medium text-stone-800">Load demo data</span>
              <span className="block text-xs text-stone-500">Replaces your pantry and impact history with sample data</span>
            </span>
          </button>
        </>
      )}
    </div>
  );
}
