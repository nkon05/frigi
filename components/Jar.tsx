"use client";

import CategoryIcon from "@/components/CategoryIcon";
import { QtyBar, URGENCY_PILL } from "@/components/ui";
import { daysLeft, expiryLabel, shortExpiryLabel, urgency, type PantryItem, type Urgency } from "@/lib/pantry";

const SOURCE_SHORT = { usda: "USDA", ai: "AI est.", manual: "Edited" };
const SOURCE_COLOR = { usda: "text-olive-text", ai: "text-ai", manual: "text-muted" };

// Lid color repeats the urgency (the pill text states it too, so color is never the only cue)
const LID: Record<Urgency, string> = { expired: "bg-brown", red: "bg-dot-urgent", yellow: "bg-[#C9923A]", green: "bg-fill" };

// Empty jar outline (lid, neck, body). Widths are percentages so jars shrink with the screen.
export function JarFrame({ lid, children }: { lid: string; children: React.ReactNode }) {
  return (
    <>
      <span
        aria-hidden
        className={`block h-[11px] w-[75%] rounded border-2 border-olive-dark ${lid}`}
        style={{ backgroundImage: "repeating-linear-gradient(135deg, rgba(0,0,0,.16) 0 2px, transparent 2px 5px)" }}
      />
      <span aria-hidden className="relative block h-[7px] w-[70%] border-x-2 border-olive-dark bg-paper">
        {/* Covers the body's top border under the neck, so the neck opens into the body */}
        <span className="absolute left-0 top-0.5 h-[9px] w-full bg-paper" />
      </span>
      <span className="-mt-px block w-full rounded-[22px_22px_13px_13px] border-2 border-olive-dark bg-paper px-2 pb-[7px] pt-2 text-left">
        {children}
      </span>
    </>
  );
}

export default function Jar({ item, onOpen }: { item: PantryItem; onOpen: () => void }) {
  const d = daysLeft(item);
  const level = urgency(item);
  return (
    <button
      onClick={onOpen}
      aria-label={`${item.name}, ${expiryLabel(d).toLowerCase()}, ${item.quantityPercent}% left`}
      className="flex w-full min-w-0 flex-col items-center rounded-[22px_22px_13px_13px] transition active:scale-95"
    >
      <JarFrame lid={LID[level]}>
        <CategoryIcon category={item.category} name={item.name} />
        <span className="mb-[5px] mt-1.5 line-clamp-2 h-[30px] hyphens-auto break-words font-display text-[13px] font-bold leading-[1.15] text-ink">{item.name}</span>
        <span className="flex flex-wrap items-center gap-1">
          <span className={`pill px-1.5 py-0.5 ${URGENCY_PILL[level]}`}>{shortExpiryLabel(d)}</span>
          {item.thawed ? (
            <span className="text-[8px] font-semibold text-ai">Thawed</span>
          ) : (
            <span className={`text-[8px] font-semibold ${SOURCE_COLOR[item.shelfLifeSource] ?? SOURCE_COLOR.ai}`}>
              {SOURCE_SHORT[item.shelfLifeSource] ?? SOURCE_SHORT.ai}
            </span>
          )}
        </span>
        <span className="mb-[5px] mt-[7px] block">
          <QtyBar percent={item.quantityPercent} height={5} />
        </span>
        <span className="block text-[11px] font-bold text-muted">{item.quantityPercent}% left</span>
      </JarFrame>
    </button>
  );
}
