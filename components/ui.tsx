import type { LucideIcon } from "lucide-react";
import type { Urgency } from "@/lib/pantry";

// Urgency styles shared by shelf tiles, the item sheet and recipe chips
export const URGENCY_PILL: Record<Urgency, string> = { red: "pill-urgent", yellow: "pill-soon", green: "pill-fine" };
export const URGENCY_DOT: Record<Urgency, string> = { red: "bg-dot-urgent", yellow: "bg-dot-soon", green: "bg-dot-fine" };

export function Banner({
  tone,
  children,
  onClose,
}: {
  tone: "error" | "success";
  children: React.ReactNode;
  onClose: () => void;
}) {
  const cls = tone === "error" ? "border-terra bg-urgent-bg text-urgent" : "border-fill bg-fine-bg text-fine";
  return (
    <button
      onClick={onClose}
      className={`animate-fade-up mb-3 flex min-h-11 w-full items-center justify-between gap-3 rounded-2xl border-2 px-4 py-3 text-left text-sm font-bold transition active:scale-[0.98] ${cls}`}
    >
      <span>{children}</span>
      <span aria-hidden className="text-lg leading-none opacity-60">
        ×
      </span>
      <span className="sr-only">Dismiss</span>
    </button>
  );
}

export function EmptyState({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return (
    <div className="card mt-6 flex flex-col items-center px-6 py-8 text-center">
      <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-tip text-olive">
        <Icon size={30} />
      </div>
      <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
      <p className="mt-1 max-w-xs text-sm leading-relaxed text-muted">{body}</p>
    </div>
  );
}

export function LoadingCard({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div role="status" className="card flex items-center gap-3 p-4">
      <span className="h-6 w-6 shrink-0 animate-spin rounded-full border-[3px] border-sand border-t-olive" />
      <div>
        <p className="font-display text-base font-semibold text-ink">{title}</p>
        <p className="text-sm text-muted">{subtitle}</p>
      </div>
    </div>
  );
}

// Short message above the bottom nav
export function Toast({ text }: { text: string }) {
  return (
    <div role="status" className="animate-fade-up pointer-events-none absolute inset-x-0 bottom-28 z-20 flex justify-center px-6">
      <p className="rounded-full bg-ink px-4 py-2.5 text-center text-sm font-bold text-paper shadow-[0_4px_0_rgba(0,0,0,.18)]">{text}</p>
    </div>
  );
}

// Olive on/off switch (visual only: pair it with a visually hidden checkbox inside a <label>)
export function Switch({ on }: { on: boolean }) {
  return (
    <span aria-hidden className={`relative h-7 w-12 shrink-0 rounded-full transition ${on ? "bg-olive" : "bg-sand"}`}>
      <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-paper shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
    </span>
  );
}

// Quantity bar (jars and the item sheet)
export function QtyBar({ percent, height }: { percent: number; height: number }) {
  return (
    <div className="w-full overflow-hidden rounded-full bg-track" style={{ height }}>
      <div className="h-full rounded-full bg-fill transition-all duration-300" style={{ width: `${percent}%` }} />
    </div>
  );
}
