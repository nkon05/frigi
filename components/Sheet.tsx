"use client";

import { X } from "lucide-react";

// Bottom sheet that covers the app shell (render inside the relative app container)
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
    <div className="absolute inset-0 z-30 flex flex-col justify-end" role="dialog" aria-modal="true" aria-label={title}>
      <button aria-label="Close" onClick={onClose} className="animate-fade-in absolute inset-0 bg-stone-900/40" />

      <div className="animate-sheet-up pb-safe relative rounded-t-3xl bg-cream px-5 pt-3 shadow-2xl">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-stone-300" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-stone-900">{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-stone-600">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-stone-400 transition active:scale-95 active:bg-stone-100"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
