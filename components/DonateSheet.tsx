"use client";

import { ExternalLink, HeartHandshake, Info, MapPin } from "lucide-react";
import Sheet from "@/components/Sheet";
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
    <Sheet title={`donate ${item.name}`} subtitle="Won't finish it? Someone nearby could use it." onClose={onClose}>
      <div className="mt-4 space-y-2.5">
        <a href={FOOD_BANKS_URL} target="_blank" rel="noopener noreferrer" className="btn btn-outline min-h-12 w-full justify-start gap-3 px-4">
          <HeartHandshake size={20} className="shrink-0 text-olive" />
          <span className="flex-1 text-left">find food banks near me</span>
          <ExternalLink size={16} className="text-muted" />
        </a>
        <a href={MAPS_URL} target="_blank" rel="noopener noreferrer" className="btn btn-outline min-h-12 w-full justify-start gap-3 px-4">
          <MapPin size={20} className="shrink-0 text-olive" />
          <span className="flex-1 text-left">search food pantries on maps</span>
          <ExternalLink size={16} className="text-muted" />
        </a>
      </div>

      <p className="mt-3 flex gap-1.5 rounded-xl bg-tip px-3.5 py-3 text-xs font-bold leading-snug text-brown">
        <Info size={14} className="mt-px shrink-0" />
        Policies vary. Many food banks only accept unopened, unexpired items, so call ahead.
      </p>

      <button onClick={onDonated} className="btn btn-primary mb-5 mt-4 h-[50px] w-full">
        mark as donated
      </button>
    </Sheet>
  );
}
