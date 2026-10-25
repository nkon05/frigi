"use client";

import { HeartHandshake, Trash, Utensils, type LucideIcon } from "lucide-react";
import Sheet from "@/components/Sheet";
import type { Outcome } from "@/lib/history";
import type { PantryItem } from "@/lib/pantry";

const CHOICES: { outcome: Exclude<Outcome, "frozen">; label: string; hint: string; icon: LucideIcon; cls: string }[] = [
  { outcome: "used", label: "used it", hint: "Ate or cooked it", icon: Utensils, cls: "bg-fine-bg" },
  { outcome: "tossed", label: "tossed it", hint: "Went bad or wasn't eaten", icon: Trash, cls: "bg-urgent-bg" },
  { outcome: "donated", label: "donated it", hint: "Gave it to someone who'll use it", icon: HeartHandshake, cls: "bg-soon-bg" },
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
    <Sheet title="what happened to this?" subtitle={item.name} onClose={onClose}>
      <div className="mt-4 space-y-2.5">
        {CHOICES.map(({ outcome, label, hint, icon: Icon, cls }) => (
          <button
            key={outcome}
            onClick={() => onChoose(outcome)}
            className={`btn btn-outline min-h-16 w-full justify-start gap-3 px-4 text-left ${cls}`}
          >
            <Icon size={22} className="shrink-0" />
            <span>
              <span className="block text-base">{label}</span>
              <span className="block text-xs font-bold opacity-75">{hint}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="mb-3 mt-3 flex items-center justify-between">
        <button onClick={onClose} className="-ml-2 min-h-11 px-2 text-sm font-extrabold text-brown active:opacity-60">
          cancel
        </button>
        <button onClick={onJustDelete} className="-mr-2 min-h-11 px-2 text-xs font-bold text-muted active:opacity-60">
          just delete (mistake)
        </button>
      </div>
    </Sheet>
  );
}
