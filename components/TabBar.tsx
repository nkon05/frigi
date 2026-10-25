"use client";

import { ChefHat, Refrigerator, Settings, Sprout, type LucideIcon } from "lucide-react";

export type Tab = "pantry" | "recipes" | "impact" | "settings";

function TabButton({ active, label, icon: Icon, onClick }: { active: boolean; label: string; icon: LucideIcon; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl text-xs font-extrabold transition active:scale-95 ${
        active ? "text-olive-text" : "text-muted"
      }`}
    >
      <Icon size={24} strokeWidth={1.8} aria-hidden />
      {label}
    </button>
  );
}

export default function TabBar({
  tab,
  onTab,
  scanning,
  onScan,
}: {
  tab: Tab;
  onTab: (t: Tab) => void;
  scanning: boolean;
  onScan: (file: File) => void;
}) {
  return (
    <nav className="pb-safe absolute inset-x-0 bottom-0 z-20 border-t-2 border-sand bg-paper px-2">
      <div className="flex h-[74px] items-center">
        <div className="flex flex-1">
          <TabButton active={tab === "pantry"} label="Pantry" icon={Refrigerator} onClick={() => onTab("pantry")} />
          <TabButton active={tab === "recipes"} label="Recipes" icon={ChefHat} onClick={() => onTab("recipes")} />
        </div>

        {/* Scan opens the camera directly; a flat circle in line with the other items */}
        <div className="flex w-20 justify-center">
          <label
            className={`flex h-[60px] w-[60px] cursor-pointer items-center justify-center rounded-full bg-olive text-sm font-extrabold text-white transition active:scale-95 ${
              scanning ? "pointer-events-none opacity-70" : ""
            }`}
            aria-label="Scan a receipt"
          >
            Scan
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              disabled={scanning}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) onScan(f);
              }}
            />
          </label>
        </div>

        <div className="flex flex-1">
          <TabButton active={tab === "impact"} label="Impact" icon={Sprout} onClick={() => onTab("impact")} />
          <TabButton active={tab === "settings"} label="Settings" icon={Settings} onClick={() => onTab("settings")} />
        </div>
      </div>
    </nav>
  );
}
