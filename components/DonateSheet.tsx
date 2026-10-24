"use client";

import { ExternalLink, HeartHandshake, Info, MapPin, X } from "lucide-react";
import type { PantryItem } from "@/lib/pantry";

const FOOD_BANKS_URL = "https://www.feedingamerica.org/find-your-local-foodbank";
const MAPS_URL = "https://www.google.com/maps/search/food+pantry+near+me";

export default function DonateSheet({
  item,
  onClose,
  onDonated,
}: {
  item: PantryItem;
  onClose: () => void;
  onDonated: () => void;
}) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end" role="dialog" aria-modal="true" aria-label={`Donate ${item.name}`}>
      <button aria-label="Close" onClick={onClose} className="animate-fade-in absolute inset-0 bg-stone-900/40" />

      <div className="animate-sheet-up pb-safe relative rounded-t-3xl bg-cream px-5 pt-3 shadow-2xl">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-stone-300" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-stone-900">Donate {item.name}</h2>
            <p className="mt-1 text-sm text-stone-600">Won&apos;t finish it? Someone nearby could use it.</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-stone-400 transition active:scale-95 active:bg-stone-100"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mt-4 space-y-2.5">
          <a
            href={FOOD_BANKS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-12 items-center gap-3 rounded-2xl bg-white px-4 font-medium text-stone-800 shadow-[0_2px_12px_rgba(28,25,23,0.06)] transition active:scale-[0.98]"
          >
            <HeartHandshake size={20} className="shrink-0 text-green-600" />
            <span className="flex-1">Find food banks near me</span>
            <ExternalLink size={16} className="text-stone-400" />
          </a>
          <a
            href={MAPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-12 items-center gap-3 rounded-2xl bg-white px-4 font-medium text-stone-800 shadow-[0_2px_12px_rgba(28,25,23,0.06)] transition active:scale-[0.98]"
          >
            <MapPin size={20} className="shrink-0 text-green-600" />
            <span className="flex-1">Search food pantries on Maps</span>
            <ExternalLink size={16} className="text-stone-400" />
          </a>
        </div>

        <p className="mt-3 flex gap-1.5 text-xs leading-snug text-stone-500">
          <Info size={14} className="mt-px shrink-0" />
          Policies vary. Many food banks only accept unopened, unexpired items, so call ahead.
        </p>

        <button
          onClick={onDonated}
          className="mb-3 mt-4 flex min-h-12 w-full items-center justify-center rounded-xl bg-green-600 font-semibold text-white shadow-md shadow-green-600/20 transition active:scale-95"
        >
          Mark as donated
        </button>
      </div>
    </div>
  );
}
