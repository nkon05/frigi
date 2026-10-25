"use client";

import { X } from "lucide-react";
import { digestHeadline, type Digest } from "@/lib/digest";

export default function DigestCard({
  digest,
  onSeeRecipes,
  onDismiss,
}: {
  digest: Digest;
  onSeeRecipes: () => void;
  onDismiss: () => void;
}) {
  const attention = digest.soon > 0;

  return (
    <div className="animate-fade-up relative mx-4 mb-6 flex items-center gap-3 rounded-2xl border-2 border-terra bg-paper px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-extrabold uppercase tracking-[.08em] text-heading">Today&apos;s digest</p>
        <p className="mt-0.5 text-[13px] font-bold leading-snug text-ink">{attention ? digestHeadline(digest) : digest.text}</p>
      </div>
      {attention && (
        <button
          onClick={onSeeRecipes}
          className="h-11 shrink-0 rounded-xl bg-[#F3D2C4] px-3 text-[15px] font-extrabold text-terra transition active:scale-95"
        >
          see recipes
        </button>
      )}
      {/* Dismiss for today: small visual badge, 44px tap area */}
      <button
        onClick={onDismiss}
        aria-label="Dismiss today's digest"
        className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-terra bg-paper text-terra after:absolute after:-inset-2.5 after:content-['']"
      >
        <X size={12} strokeWidth={3} />
      </button>
    </div>
  );
}
