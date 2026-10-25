"use client";

import { Sparkles } from "lucide-react";
import { Switch } from "@/components/ui";
import { RESTRICTIONS, type RestrictionId } from "@/lib/restrictions";

export default function SettingsScreen({
  restrictions,
  onChange,
  onLoadDemo,
  extra,
}: {
  restrictions: RestrictionId[];
  onChange: (r: RestrictionId[]) => void;
  onLoadDemo?: () => void; // omit to hide the Demo section (e.g. on the Recipes diet sub-screen)
  extra?: React.ReactNode; // more settings sections, shown before Demo
}) {
  function toggle(id: RestrictionId) {
    onChange(restrictions.includes(id) ? restrictions.filter((r) => r !== id) : [...restrictions, id]);
  }

  return (
    <div>
      <h2 className="section-label px-1">Allergies & diet</h2>
      <p className="mb-3 mt-1 px-1 text-sm text-muted">Recipe ideas will strictly avoid anything you turn on here.</p>

      <ul className="card divide-y-2 divide-wall overflow-hidden">
        {RESTRICTIONS.map((r) => {
          const on = restrictions.includes(r.id);
          return (
            <li key={r.id}>
              <label className="flex min-h-14 cursor-pointer items-center justify-between gap-3 px-4 transition active:bg-tip">
                <span className="font-bold text-ink">{r.label}</span>
                <input type="checkbox" role="switch" className="sr-only" checked={on} onChange={() => toggle(r.id)} />
                <Switch on={on} />
              </label>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 px-1 text-xs text-muted">Saved on this device.</p>

      {extra}

      {onLoadDemo && (
        <>
          <h2 className="section-label mt-8 px-1">Demo</h2>
          <button onClick={onLoadDemo} className="card mt-3 flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left transition active:scale-[0.98]">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tip text-olive">
              <Sparkles size={20} />
            </span>
            <span>
              <span className="block font-bold text-ink">load demo data</span>
              <span className="block text-xs text-muted">Replaces your pantry and impact history with sample data</span>
            </span>
          </button>
        </>
      )}
    </div>
  );
}
