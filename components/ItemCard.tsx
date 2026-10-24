"use client";

import { useState } from "react";
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
  red: { border: "border-l-red-500", badge: "bg-red-100 text-red-700" },
  yellow: { border: "border-l-amber-400", badge: "bg-amber-100 text-amber-800" },
  green: { border: "border-l-emerald-500", badge: "bg-emerald-100 text-emerald-700" },
};

function relative(d: number) {
  if (d < 0) return `expired ${-d}d ago`;
  if (d === 0) return "today";
  if (d === 1) return "tomorrow";
  return `in ${d} days`;
}

export default function ItemCard({
  item,
  onChange,
  onDelete,
}: {
  item: PantryItem;
  onChange: (item: PantryItem) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const style = STYLES[urgency(item)];
  const d = daysLeft(item);

  return (
    <li className={`rounded-2xl border-l-4 bg-white p-4 shadow-sm ${style.border}`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none">{CATEGORY_EMOJI[item.category] ?? "🛒"}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-slate-900">{item.name}</h3>
            {item.price != null && (
              <span className="shrink-0 text-sm text-slate-500">${item.price.toFixed(2)}</span>
            )}
          </div>
          <p className="truncate text-xs text-slate-400">{item.rawName}</p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {editing ? (
              <input
                type="date"
                autoFocus
                defaultValue={item.expiryDate}
                onBlur={() => setEditing(false)}
                onChange={(e) => {
                  const v = e.target.value;
                  if (!v) return;
                  onChange({
                    ...item,
                    expiryDate: v,
                    shelfLifeDays: daysBetween(item.purchaseDate, v),
                  });
                }}
                className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
              />
            ) : (
              <button
                onClick={() => setEditing(true)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${style.badge}`}
                title="Tap to edit expiry date"
              >
                Est. {formatDate(item.expiryDate)} · {relative(d)} ✎
              </button>
            )}
            <button
              onClick={onDelete}
              className="ml-auto rounded-full px-2 py-1 text-xs text-slate-400 hover:bg-slate-100 hover:text-red-600"
              aria-label={`Delete ${item.name}`}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}
