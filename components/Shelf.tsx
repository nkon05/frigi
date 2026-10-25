import Jar from "@/components/Jar";
import type { PantryItem } from "@/lib/pantry";

const PER_SHELF = 3;

// Every jar is a third of the row (minus gaps), so a short last row keeps the same width
export const JAR_WIDTH = "min-w-0 basis-[calc((100%-16px)/3)] shrink-0 grow-0";

export function Plank() {
  return (
    <div
      aria-hidden
      className="mx-2 mb-[22px] h-3.5 rounded-[3px] bg-gradient-to-b from-wood to-wood-dark shadow-[0_6px_8px_-4px_rgba(60,35,15,.35)]"
    />
  );
}

// A row of up to 3 jars standing on a plank (the row overlaps the plank by 4px)
export function ShelfRow({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div className="relative z-[1] -mb-1 flex items-end gap-2 px-4">{children}</div>
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
        <ShelfRow key={row[0].id}>
          {row.map((item) => (
            <div key={item.id} className={`flex ${JAR_WIDTH}`}>
              <Jar item={item} onOpen={() => onOpen(item)} />
            </div>
          ))}
        </ShelfRow>
      ))}
    </div>
  );
}
