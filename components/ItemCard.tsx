"use client";

import { useState } from "react";
import { HeartHandshake, Lightbulb, Minus, Pencil, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { daysBetween, daysLeft, formatDate, type PantryItem } from "@/lib/pantry";

const CATEGORY_EMOJI: Record<string, string> = {
  produce: "🥬",
  dairy: "🥛",
  meat: "🥩",
  seafood: "🐟",
  bakery: "🍞",
  pantry: "🥫",
  frozen: "🧊",
  other: "🛒",
};

export function urgency(item: PantryItem) {
  const d = daysLeft(item);
  if (d <= 2) return "red";
  if (d <= 5) return "yellow";
  return "green";
}

const STYLES = {
  red: { pill: "bg-red-100 text-red-700", emoji: "bg-red-50" },
  yellow: { pill: "bg-amber-100 text-amber-800", emoji: "bg-amber-50" },
  green: { pill: "bg-green-100 text-green-800", emoji: "bg-green-50" },
};

function expiresLabel(d: number) {
  if (d < 0) return `Expired ${-d} day${d === -1 ? "" : "s"} ago`;
  if (d === 0) return "Expires today";
  if (d === 1) return "Expires tomorrow";
  return `Expires in ${d} days`;
}

export default function ItemCard({
  item,
  onChange,
  onDelete,
  onDonate,
}: {
  item: PantryItem;
  onChange: (item: PantryItem) => void;
  onDelete: () => void;
  onDonate: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const level = urgency(item);
  const style = STYLES[level];
  const setQty = (q: number) => onChange({ ...item, quantityPercent: Math.min(100, Math.max(0, q)) });

  return (
    <li className="animate-fade-up rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(28,25,23,0.06)]">
      <div className="flex gap-3">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl ${style.emoji}`}>
          {CATEGORY_EMOJI[item.category] ?? "🛒"}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold leading-tight text-stone-900">{item.name}</h3>
              <p className="truncate text-xs text-stone-400">
                {item.rawName}
                {item.price != null && ` · $${item.price.toFixed(2)}`}
              </p>
            </div>
            <div className="-mr-2 -mt-2 flex shrink-0">
              <a
                href={`https://www.google.com/search?tbm=shop&q=${encodeURIComponent(item.name)}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Reorder ${item.name}`}
                title="Reorder on Google Shopping"
                className="flex h-11 w-11 items-center justify-center rounded-full text-stone-400 transition hover:text-green-700 active:scale-95 active:bg-green-50"
              >
                <ShoppingCart size={18} />
              </a>
              <button
                onClick={onDelete}
                aria-label={`Delete ${item.name}`}
                className="flex h-11 w-11 items-center justify-center rounded-full text-stone-300 transition hover:text-red-500 active:scale-95 active:bg-red-50"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>

          <div className="mt-2">
            {editing ? (
              <input
                type="date"
                autoFocus
                defaultValue={item.expiryDate}
                onBlur={() => setEditing(false)}
                onChange={(e) => {
                  const v = e.target.value;
                  if (!v) return;
                  onChange({ ...item, expiryDate: v, shelfLifeDays: daysBetween(item.purchaseDate, v) });
                }}
                className="min-h-11 rounded-xl border border-stone-200 bg-stone-50 px-3"
              />
            ) : (
              <button
                onClick={() => setEditing(true)}
                title="Tap to edit expiry date"
                className={`relative inline-flex min-h-9 items-center whitespace-nowrap after:absolute after:-inset-1.5 after:content-[''] gap-1.5 rounded-full px-3 text-xs font-semibold transition active:scale-95 ${style.pill}`}
              >
                {expiresLabel(daysLeft(item))}
                <span className="font-normal opacity-70">· Est. {formatDate(item.expiryDate)}</span>
                <Pencil size={12} className="opacity-60" />
              </button>
            )}
          </div>

          <div className="-ml-3 mt-1 flex items-center gap-1">
            <QtyButton label={`Less ${item.name}`} disabled={item.quantityPercent <= 0} onClick={() => setQty(item.quantityPercent - 25)}>
              <Minus size={16} />
            </QtyButton>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-stone-100">
              <div
                className="h-full rounded-full bg-green-500 transition-all duration-300"
                style={{ width: `${item.quantityPercent}%` }}
              />
            </div>
            <QtyButton label={`More ${item.name}`} disabled={item.quantityPercent >= 100} onClick={() => setQty(item.quantityPercent + 25)}>
              <Plus size={16} />
            </QtyButton>
            <span className="w-14 text-right text-xs font-medium tabular-nums text-stone-500">
              {item.quantityPercent > 0 ? `${item.quantityPercent}% left` : "Used up"}
            </span>
          </div>

          {item.storageTip && (
            <p className="mt-2.5 flex gap-1.5 text-[13px] leading-snug text-stone-500">
              <Lightbulb size={14} className="mt-0.5 shrink-0 text-green-600" />
              {item.storageTip}
            </p>
          )}

          {/* Donate: prominent when expired or expiring within 2 days, subtle otherwise */}
          {level === "red" ? (
            <button
              onClick={onDonate}
              className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-amber-100 text-sm font-semibold text-amber-900 transition active:scale-95"
            >
              <HeartHandshake size={16} />
              Donate it
            </button>
          ) : (
            <div className="-mb-2 mt-1 flex justify-end">
              <button
                onClick={onDonate}
                className="-mr-2 flex min-h-11 items-center gap-1 rounded-full px-2 text-xs font-medium text-stone-400 transition active:scale-95 active:bg-stone-100"
              >
                <HeartHandshake size={14} />
                Donate
              </button>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

function QtyButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-stone-500 transition active:scale-95 active:bg-stone-100 disabled:opacity-30"
    >
      {children}
    </button>
  );
}
