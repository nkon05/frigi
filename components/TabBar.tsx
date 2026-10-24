"use client";

import { Camera, ChefHat, Refrigerator, Settings } from "lucide-react";

export type Tab = "pantry" | "recipes" | "settings";

function TabButton({
  active,
  label,
  icon: Icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: typeof Camera;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition active:scale-95 ${
        active ? "text-green-700" : "text-stone-400"
      }`}
    >
      <Icon size={22} strokeWidth={active ? 2.4 : 2} />
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
    <nav className="pb-safe absolute inset-x-0 bottom-0 z-20 border-t border-stone-200/70 bg-white/90 px-2 backdrop-blur-lg">
      <div className="flex items-end">
        <div className="flex flex-1">
          <TabButton active={tab === "pantry"} label="Pantry" icon={Refrigerator} onClick={() => onTab("pantry")} />
          <TabButton active={tab === "recipes"} label="Recipes" icon={ChefHat} onClick={() => onTab("recipes")} />
        </div>

        {/* Center Scan button opens the camera directly */}
        <div className="flex w-20 justify-center">
          <label
            className={`-mt-6 flex h-16 w-16 cursor-pointer flex-col items-center justify-center rounded-full bg-green-600 text-white shadow-lg shadow-green-600/30 ring-4 ring-cream transition active:scale-95 ${
              scanning ? "pointer-events-none opacity-70" : ""
            }`}
            aria-label="Scan a receipt"
          >
            <Camera size={26} strokeWidth={2.2} />
            <span className="text-[10px] font-semibold">Scan</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
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
          <TabButton active={tab === "settings"} label="Settings" icon={Settings} onClick={() => onTab("settings")} />
        </div>
      </div>
    </nav>
  );
}
