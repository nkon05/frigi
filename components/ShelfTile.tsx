"use client";

import CategoryIcon from "@/components/CategoryIcon";
import { daysLeft, expiryLabel, shortExpiryLabel, urgency, type PantryItem, type Urgency } from "@/lib/pantry";

// Expiry pill colors (shared with the item sheet)
export const PILL: Record<Urgency, string> = {
  red: "bg-[#F3D2C4] text-terra",
  yellow: "bg-[#F6E2B0] text-[#5E4300]",
  green: "bg-[#DCE5C3] text-[#3A4A1A]",
};

const SOURCE_SHORT = { usda: "USDA", ai: "AI est.", manual: "Edited" };
const SOURCE_COLOR = { usda: "text-olive-text", ai: "text-[#8A5A1E]", manual: "text-muted" };

export function QtyBar({ percent, height }: { percent: number; height: number }) {
  return (
    <div className="w-full overflow-hidden rounded-full bg-[#E6D9BC]" style={{ height }}>
      <div className="h-full rounded-full bg-[#7E8F4A] transition-all duration-300" style={{ width: `${percent}%` }} />
    </div>
  );
}

export default function ShelfTile({ item, onOpen }: { item: PantryItem; onOpen: () => void }) {
  const d = daysLeft(item);
  return (
    <button
      onClick={onOpen}
      aria-label={`${item.name}, ${expiryLabel(d).toLowerCase()}, ${item.quantityPercent}% left`}
      className="flex min-w-0 flex-col items-start rounded-[12px_12px_4px_4px] bg-paper p-2 text-left shadow-[0_2px_0_rgba(0,0,0,.08)] transition active:scale-95"
    >
      <CategoryIcon item={item} />
      <span className="mt-1 line-clamp-2 h-[30px] w-full font-display text-[13px] font-bold leading-[15px] text-ink">{item.name}</span>
      <span className="mt-1.5 flex flex-wrap items-center gap-x-1 gap-y-0.5">
        <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-extrabold leading-tight ${PILL[urgency(item)]}`}>{shortExpiryLabel(d)}</span>
        {item.thawed ? (
          <span className="text-[9px] font-bold text-[#8A5A1E]">Thawed</span>
        ) : (
          <span className={`text-[9px] font-bold ${SOURCE_COLOR[item.shelfLifeSource] ?? SOURCE_COLOR.ai}`}>
            {SOURCE_SHORT[item.shelfLifeSource] ?? SOURCE_SHORT.ai}
          </span>
        )}
      </span>
      <span className="mt-2 w-full">
        <QtyBar percent={item.quantityPercent} height={5} />
      </span>
      <span className="mt-1 text-[11px] font-bold text-muted">{item.quantityPercent}% left</span>
    </button>
  );
}
