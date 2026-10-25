"use client";

import { useRef, useState } from "react";
import { X } from "lucide-react";

const SWIPE_CLOSE_PX = 80;

// Bottom sheet frame: dim overlay + panel with drag handle. Tap the overlay or swipe down to close.
// Render inside the relative app container.
export function SheetFrame({ label, onClose, children }: { label: string; onClose: () => void; children: React.ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);
  const [dragY, setDragY] = useState(0);

  // Swipe down: only starts when the panel is scrolled to the top
  const onTouchStart = (e: React.TouchEvent) => {
    startY.current = (panel.current?.scrollTop ?? 0) <= 0 ? e.touches[0].clientY : null;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (startY.current == null) return;
    setDragY(Math.max(0, e.touches[0].clientY - startY.current));
  };
  const onTouchEnd = () => {
    if (dragY > SWIPE_CLOSE_PX) onClose();
    startY.current = null;
    setDragY(0);
  };

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end" role="dialog" aria-modal="true" aria-label={label}>
      <button aria-label="Close" onClick={onClose} className="animate-fade-in absolute inset-0 bg-[rgba(40,25,12,.55)]" />
      <div
        ref={panel}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ transform: dragY ? `translateY(${dragY}px)` : undefined }}
        className={`animate-sheet-up pb-safe relative max-h-[75vh] overflow-y-auto overscroll-contain rounded-t-[26px] bg-sheet px-5 pt-3 shadow-2xl ${
          dragY ? "" : "transition-transform duration-200"
        }`}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-sand" />
        {children}
      </div>
    </div>
  );
}

// Sheet with a title row and close button
export default function Sheet({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <SheetFrame label={title} onClose={onClose}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight text-ink">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="-mr-2 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted transition active:scale-95 active:bg-black/5"
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </SheetFrame>
  );
}

// Yes/no question as a bottom sheet (replaces the browser's confirm())
export function ConfirmSheet({
  title,
  body,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet title={title} onClose={onClose}>
      <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
      <div className="mb-4 mt-5 grid grid-cols-2 gap-3">
        <button onClick={onClose} className="btn btn-outline">
          cancel
        </button>
        <button onClick={onConfirm} className="btn btn-primary">
          {confirmLabel}
        </button>
      </div>
    </Sheet>
  );
}
