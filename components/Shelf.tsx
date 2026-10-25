import ShelfTile from "@/components/ShelfTile";
import type { PantryItem } from "@/lib/pantry";

const PER_SHELF = 3;

export function Plank() {
  return (
    <div
      aria-hidden
      className="mx-2 mb-3.5 h-3.5 rounded-[3px] bg-gradient-to-b from-wood to-wood-dark shadow-[0_6px_8px_-4px_rgba(60,35,15,.35)]"
    />
  );
}

// One row of up to 3 tiles on a plank. Fixed 3 columns, so a short last row keeps normal widths.
function Shelf({ items, onOpen }: { items: PantryItem[]; onOpen: (item: PantryItem) => void }) {
  return (
    <div>
      <div className="grid grid-cols-3 gap-2 px-4">
        {items.map((item) => (
          <ShelfTile key={item.id} item={item} onOpen={() => onOpen(item)} />
        ))}
      </div>
      <Plank />
    </div>
  );
}

// Items (already sorted) split into shelves of 3
export default function Shelves({ items, onOpen }: { items: PantryItem[]; onOpen: (item: PantryItem) => void }) {
  const rows: PantryItem[][] = [];
  for (let i = 0; i < items.length; i += PER_SHELF) rows.push(items.slice(i, i + PER_SHELF));
  return (
    <div>
      {rows.map((row) => (
        <Shelf key={row[0].id} items={row} onOpen={onOpen} />
      ))}
    </div>
  );
}
