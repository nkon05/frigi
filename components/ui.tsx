import type { LucideIcon } from "lucide-react";

// Emoji per category (Impact screen)
export const CATEGORY_EMOJI: Record<string, string> = {
  produce: "🥬",
  dairy: "🥛",
  meat: "🥩",
  seafood: "🐟",
  bakery: "🍞",
  pantry: "🥫",
  frozen: "🧊",
  other: "🛒",
};

export const CARD = "rounded-2xl bg-white shadow-[0_2px_12px_rgba(28,25,23,0.06)]";

export function Banner({
  tone,
  children,
  onClose,
}: {
  tone: "error" | "success";
  children: React.ReactNode;
  onClose: () => void;
}) {
  const cls = tone === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-800";
  return (
    <button
      onClick={onClose}
      className={`animate-fade-up mb-3 flex min-h-11 w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left text-sm transition active:scale-[0.98] ${cls}`}
    >
      <span>{children}</span>
      <span className="text-lg leading-none opacity-50">×</span>
    </button>
  );
}

export function EmptyState({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center px-6 pt-16 text-center">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-green-100 text-green-700">
        <Icon size={36} />
      </div>
      <h2 className="text-lg font-semibold text-stone-800">{title}</h2>
      <p className="mt-1 max-w-xs text-sm leading-relaxed text-stone-500">{body}</p>
    </div>
  );
}

export function LoadingCard({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-green-600 p-4 text-white shadow-lg shadow-green-600/20">
      <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-white border-t-transparent" />
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-green-100">{subtitle}</p>
      </div>
    </div>
  );
}
