"use client";

import { useState } from "react";
import { BadgeCheck, Minus, Pencil, Plus, Sparkles, ThermometerSun } from "lucide-react";
import { SheetFrame } from "@/components/Sheet";
import { QtyBar } from "@/components/ShelfTile";
import { URGENCY_PILL } from "@/components/ui";
import {
  canFreeze,
  daysBetween,
  daysLeft,
  expiryLabel,
  formatDate,
  freezeDays,
  humanDays,
  urgency,
  type PantryItem,
} from "@/lib/pantry";

const SOURCE = {
  usda: { label: "USDA FoodKeeper", icon: BadgeCheck, cls: "text-olive-text" },
  ai: { label: "AI estimate", icon: Sparkles, cls: "text-ai" },
  manual: { label: "Edited", icon: Pencil, cls: "text-muted" },
};


export default function ItemSheet({
  item,
  onClose,
  onChange,
  onFreeze,
  onThaw,
  onDonate,
  onRemove,
  onSeeRecipes,
}: {
  item: PantryItem;
  onClose: () => void;
  onChange: (item: PantryItem) => void; // quantity / expiry edits (0% = used up, handled by the page)
  onFreeze: () => void;
  onThaw: () => void;
  onDonate: () => void;
  onRemove: () => void;
  onSeeRecipes: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const d = daysLeft(item);
  const frozen = item.location === "freezer";
  const source = SOURCE[item.shelfLifeSource] ?? SOURCE.ai;
  const SourceIcon = source.icon;
  const setQty = (q: number) => onChange({ ...item, quantityPercent: Math.min(100, Math.max(0, q)) });

  return (
    <SheetFrame label={item.name} onClose={onClose}>
      <h2 className="font-display text-[26px] font-bold leading-tight text-ink">{item.name}</h2>
      <p className="mt-0.5 text-xs font-bold uppercase text-muted">
        {item.rawName}
        {item.price != null && ` · $${item.price.toFixed(2)}`}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className={`pill px-3 py-1 text-sm ${URGENCY_PILL[urgency(item)]}`}>{expiryLabel(d)}</span>
        {editing ? (
          <input
            type="date"
            autoFocus
            defaultValue={item.expiryDate}
            onBlur={() => setEditing(false)}
            onChange={(e) => {
              const v = e.target.value;
              if (!v) return;
              onChange({ ...item, expiryDate: v, shelfLifeDays: daysBetween(item.purchaseDate, v), shelfLifeSource: "manual", thawed: false });
            }}
            className="field"
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            title="Edit expiry date"
            className="-mx-1 flex min-h-11 items-center gap-1 px-1 text-sm font-bold text-muted underline decoration-dotted underline-offset-4"
          >
            Est. {formatDate(item.expiryDate)}
            <Pencil size={12} />
          </button>
        )}
        {item.thawed ? (
          <span className="flex items-center gap-1 text-[11px] font-bold text-ai">
            <ThermometerSun size={13} />
            Thawed · use within 3 days
          </span>
        ) : (
          <span className={`flex items-center gap-1 text-[11px] font-bold ${source.cls}`}>
            <SourceIcon size={13} />
            {source.label}
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={() => setQty(item.quantityPercent - 25)}
          aria-label={`Less ${item.name}`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-wood bg-white text-brown transition active:scale-95"
        >
          <Minus size={18} strokeWidth={2.5} />
        </button>
        <div className="flex-1">
          <QtyBar percent={item.quantityPercent} height={10} />
          <p className="mt-1 text-xs font-bold text-muted">{item.quantityPercent}% left</p>
        </div>
        <button
          onClick={() => setQty(item.quantityPercent + 25)}
          disabled={item.quantityPercent >= 100}
          aria-label={`More ${item.name}`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-wood bg-white text-brown transition active:scale-95 disabled:opacity-40"
        >
          <Plus size={18} strokeWidth={2.5} />
        </button>
      </div>

      {item.storageTip && (
        <p className="mt-4 rounded-xl bg-tip px-3.5 py-3 text-sm font-bold leading-snug text-brown">Storage tip: {item.storageTip}</p>
      )}

      {frozen ? (
        <button onClick={onThaw} className="btn btn-freeze mt-4 h-[54px] w-full text-base">
          Thaw · move to fridge
        </button>
      ) : canFreeze(item) ? (
        <button onClick={onFreeze} className="btn btn-freeze mt-4 h-[54px] w-full text-base">
          Freeze it · keeps ~{humanDays(freezeDays(item) ?? 0)}
        </button>
      ) : null}

      <div className="mt-3 grid grid-cols-3 gap-2">
        <button onClick={onDonate} className="btn btn-outline h-12 bg-soon-bg px-1">
          Donate
        </button>
        <a href={`https://www.google.com/search?tbm=shop&q=${encodeURIComponent(item.name)}`} target="_blank" rel="noopener noreferrer" className="btn btn-outline h-12 px-1">
          Reorder
        </a>
        <button onClick={onRemove} className="btn btn-outline h-12 bg-urgent-bg px-1">
          Remove
        </button>
      </div>

      <button onClick={onSeeRecipes} className="btn btn-primary mb-5 mt-3 h-[50px] w-full">
        see recipes using this
      </button>
    </SheetFrame>
  );
}
