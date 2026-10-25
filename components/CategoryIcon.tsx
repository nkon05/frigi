import { Snowflake } from "lucide-react";
import type { Category } from "@/lib/pantry";

// Simple colored shapes per category (no emoji). Berries are picked out by name.
const SHAPES = {
  circle: <circle cx="12" cy="12" r="9" />,
  leaf: <path d="M4 20C4 10.5 10.5 4 20 4c0 9.5-6.5 16-16 16Z" />,
  drop: <path d="M12 2.5c3.2 4.6 6.5 8.4 6.5 11.7a6.5 6.5 0 0 1-13 0c0-3.3 3.3-7.1 6.5-11.7Z" />,
  jar: (
    <>
      <rect x="7" y="2.5" width="10" height="3.5" rx="1" />
      <rect x="4.5" y="7" width="15" height="14.5" rx="3.5" />
    </>
  ),
  loaf: <path d="M3.5 12.5a8.5 6.5 0 0 1 17 0V19a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2Z" />,
  fish: <path d="M2.5 12c3.2-5 10-6.2 14.5-2.2L21.5 7v10L17 14.2C12.5 18.2 5.7 17 2.5 12Z" />,
};

const STYLE: Record<string, { shape: keyof typeof SHAPES | "snow"; color: string }> = {
  meat: { shape: "circle", color: "#B5573A" },
  produce: { shape: "leaf", color: "#6F8B4A" },
  dairy: { shape: "drop", color: "#C9923A" },
  pantry: { shape: "jar", color: "#C9923A" },
  bakery: { shape: "loaf", color: "#B07A4F" },
  seafood: { shape: "fish", color: "#4F7387" },
  frozen: { shape: "snow", color: "#4F7387" },
  other: { shape: "circle", color: "#5B4B7A" },
};
const BERRIES = { shape: "circle" as const, color: "#5B4B7A" };

export default function CategoryIcon({ category, name = "", size = 22 }: { category: Category; name?: string; size?: number }) {
  const { shape, color } = /berr/i.test(name) ? BERRIES : STYLE[category] ?? STYLE.other;
  if (shape === "snow") return <Snowflake size={size} color={color} strokeWidth={2.5} aria-hidden />;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden>
      {SHAPES[shape]}
    </svg>
  );
}
