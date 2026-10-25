"use client";

export type Tab = "pantry" | "recipes" | "impact" | "settings";

function TabButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-[52px] flex-1 items-center justify-center text-xs font-extrabold transition active:scale-95 ${
        active ? "text-olive-text" : "text-muted"
      }`}
    >
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
          <TabButton active={tab === "pantry"} label="Pantry" onClick={() => onTab("pantry")} />
          <TabButton active={tab === "recipes"} label="Recipes" onClick={() => onTab("recipes")} />
        </div>

        {/* Center Scan button opens the camera directly */}
        <div className="flex w-20 justify-center">
          <label
            className={`-mt-[52px] flex h-[60px] w-[60px] cursor-pointer items-center justify-center rounded-full bg-olive text-sm font-extrabold text-white shadow-[0_4px_0_#3F4D22] transition active:translate-y-0.5 active:shadow-[0_2px_0_#3F4D22] ${
              scanning ? "pointer-events-none opacity-70" : ""
            }`}
            aria-label="Scan a receipt"
          >
            Scan
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
          <TabButton active={tab === "impact"} label="Impact" onClick={() => onTab("impact")} />
          <TabButton active={tab === "settings"} label="Settings" onClick={() => onTab("settings")} />
        </div>
      </div>
    </nav>
  );
}
