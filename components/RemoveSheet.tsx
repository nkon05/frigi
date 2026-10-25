"use client";

import { HeartHandshake, Trash, Utensils, type LucideIcon } from "lucide-react";
import Sheet from "@/components/Sheet";
import type { Outcome } from "@/lib/history";
import type { PantryItem } from "@/lib/pantry";

const CHOICES: { outcome: Exclude<Outcome, "frozen">; label: string; hint: string; icon: LucideIcon; cls: string }[] = [
  { outcome: "used", label: "Used it", hint: "Ate or cooked it", icon: Utensils, cls: "bg-green-50 text-green-800" },
  { outcome: "tossed", label: "Tossed it", hint: "Went bad or wasn't eaten", icon: Trash, cls: "bg-red-50 text-red-700" },
  { outcome: "donated", label: "Donated it", hint: "Gave it to someone who'll use it", icon: HeartHandshake, cls: "bg-amber-50 text-amber-900" },
];

export default function RemoveSheet({
  item,
  onChoose,
  onJustDelete,
  onClose,
}: {
  item: PantryItem;
  onChoose: (outcome: Exclude<Outcome, "frozen">) => void;
  onJustDelete: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet title="What happened to this?" subtitle={item.name} onClose={onClose}>
      <div className="mt-4 space-y-2.5">
        {CHOICES.map(({ outcome, label, hint, icon: Icon, cls }) => (
          <button
            key={outcome}
            onClick={() => onChoose(outcome)}
            className={`flex min-h-16 w-full items-center gap-3 rounded-2xl px-4 text-left transition active:scale-[0.98] ${cls}`}
          >
            <Icon size={22} className="shrink-0" />
            <span>
              <span className="block font-semibold">{label}</span>
              <span className="block text-xs opacity-75">{hint}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="mb-2 mt-3 flex items-center justify-between">
        <button onClick={onClose} className="-ml-2 min-h-11 px-2 text-sm font-medium text-stone-600 active:opacity-60">
          Cancel
        </button>
        <button onClick={onJustDelete} className="-mr-2 min-h-11 px-2 text-xs text-stone-400 active:opacity-60">
          Just delete (mistake)
        </button>
      </div>
    </Sheet>
  );
}
