"use client";

import { Car, Cloud, Flame, HeartHandshake, PiggyBank, RotateCcw, Snowflake, Sprout, Trash, Utensils, type LucideIcon } from "lucide-react";
import { CARD, CATEGORY_EMOJI, EmptyState } from "@/components/ui";
import { computeStats, type HistoryEntry } from "@/lib/history";

const money = (n: number) => `$${n.toFixed(2)}`;
const pct = (n: number) => `${Math.round(n * 100)}%`;

// Outcome colors, validated for colorblind separation in this order (used, donated, tossed):
// green and red must never sit next to each other. Every mark also has a text label.
const OUTCOME = {
  used: { label: "Used", color: "#16a34a", icon: Utensils },
  donated: { label: "Donated", color: "#f59e0b", icon: HeartHandshake },
  tossed: { label: "Tossed", color: "#ef4444", icon: Trash },
};

// Rough: an average petrol car emits ~0.17 kg CO2e per km. Illustrative only.
const CO2_KG_PER_CAR_KM = 0.17;

export default function ImpactScreen({ history, onReset }: { history: HistoryEntry[]; onReset: () => void }) {
  const s = computeStats(history);

  if (!s.hasData) {
    return (
      <EmptyState
        icon={Sprout}
        title="Your impact starts here"
        body="When you use, donate, toss or freeze something from your pantry, your savings and waste show up here."
      />
    );
  }

  const outcomeTotal = s.itemsUsed + s.itemsDonated + s.itemsTossed;
  const rescueRate = outcomeTotal ? s.itemsRescued / outcomeTotal : 0;
  const subline =
    s.itemsRescued === 0
      ? "Use or donate your next item to start saving."
      : `That's ${s.itemsRescued} item${s.itemsRescued === 1 ? "" : "s"} that didn't end up in the bin. Nice work!`;

  return (
    <div className="space-y-4">
      {/* Hero: money saved + rescue-rate ring */}
      <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-br from-green-600 to-emerald-700 p-5 text-white shadow-lg shadow-green-700/20">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-green-100">You&apos;ve saved</p>
          <p className="mt-0.5 text-4xl font-bold tracking-tight">{money(s.moneySaved)}</p>
          <p className="text-sm font-medium text-green-100">of food</p>
          <p className="mt-3 text-sm text-green-50">{subline}</p>
        </div>
        {outcomeTotal > 0 && <Ring value={rescueRate} label="rescued" />}
      </div>

      {/* Where your food went: one stacked bar + labeled legend */}
      {outcomeTotal > 0 && (
        <div className={`${CARD} p-4`}>
          <h3 className="font-semibold text-stone-900">Where your food went</h3>
          <div className="mt-3 flex h-4 gap-0.5 overflow-hidden rounded-full">
            {(["used", "donated", "tossed"] as const).map((k) => {
              const n = k === "used" ? s.itemsUsed : k === "donated" ? s.itemsDonated : s.itemsTossed;
              if (!n) return null;
              return (
                <div
                  key={k}
                  title={`${OUTCOME[k].label}: ${n} (${pct(n / outcomeTotal)})`}
                  className="h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full"
                  style={{ width: `${(n / outcomeTotal) * 100}%`, background: OUTCOME[k].color }}
                />
              );
            })}
          </div>
          <ul className="mt-3 grid grid-cols-3 gap-2">
            {(["used", "donated", "tossed"] as const).map((k) => {
              const n = k === "used" ? s.itemsUsed : k === "donated" ? s.itemsDonated : s.itemsTossed;
              const Icon = OUTCOME[k].icon;
              return (
                <li key={k} className="text-xs text-stone-500">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: OUTCOME[k].color }} />
                    <Icon size={12} />
                    {OUTCOME[k].label}
                  </span>
                  <span className="mt-0.5 block text-base font-bold text-stone-900">
                    {n} <span className="text-xs font-medium text-stone-400">{pct(n / outcomeTotal)}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Stat icon={PiggyBank} label="Money saved" value={money(s.moneySaved)} tone="green" />
        <Stat icon={Trash} label="Money wasted" value={money(s.moneyWasted)} tone="red" />
        <Stat icon={Utensils} label="Items rescued" value={String(s.itemsRescued)} tone="green" />
        <Stat icon={HeartHandshake} label="Items donated" value={String(s.itemsDonated)} tone="amber" />
        <Stat
          icon={Trash}
          label="Waste rate"
          value={s.wasteRate == null ? "–" : pct(s.wasteRate)}
          tone={s.wasteRate != null && s.wasteRate > 0.25 ? "red" : "stone"}
        />
        <Stat icon={Flame} label="No-waste streak" value={`${s.streakDays} day${s.streakDays === 1 ? "" : "s"}`} tone="amber" />
      </div>

      {/* Freezing */}
      <div className="flex items-center gap-3 rounded-2xl bg-sky-50 p-4 ring-1 ring-sky-200">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-sky-600">
          <Snowflake size={22} />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-700/70">Extended by freezing</p>
          <p className="text-lg font-bold text-sky-900">
            {s.frozenItems} item{s.frozenItems === 1 ? "" : "s"} · +{s.frozenDaysAdded} days
          </p>
          {s.frozenItems === 0 && <p className="text-xs text-sky-800/70">Freeze food that&apos;s about to expire to keep it for months.</p>}
        </div>
      </div>

      {/* CO2 with a relatable equivalent */}
      <div className={`${CARD} p-4`}>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
            <Cloud size={22} />
          </div>
          <div>
            <p className="text-lg font-bold text-stone-900">
              ~{s.co2Kg.toFixed(1)} kg CO₂e <span className="text-xs font-medium text-stone-400">est.</span>
            </p>
            <p className="flex items-center gap-1 text-sm text-stone-600">
              <Car size={14} className="text-stone-400" />
              about {Math.round(s.co2Kg / CO2_KG_PER_CAR_KM)} km not driven
            </p>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-stone-400">Rough estimate of emissions avoided, based on food type.</p>
      </div>

      <WeekCompare thisWeek={s.thisWeek} lastWeek={s.lastWeek} />

      {s.rescuedByCategory.length > 0 && <CategoryBars rows={s.rescuedByCategory} />}

      <div className="flex justify-center pt-2">
        <button
          onClick={() => {
            if (confirm("Reset all impact stats? This can't be undone.")) onReset();
          }}
          className="flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm font-medium text-stone-400 transition active:scale-95 active:bg-stone-100"
        >
          <RotateCcw size={14} />
          Reset stats
        </button>
      </div>
    </div>
  );
}

// Single-value gauge (white on the green hero)
function Ring({ value, label }: { value: number; label: string }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-24 w-24 shrink-0" title={`${pct(value)} of finished items were used or donated`}>
      <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="8" />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke="white"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${c * value} ${c}`}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold leading-none">{pct(value)}</span>
        <span className="text-[10px] font-medium text-green-100">{label}</span>
      </div>
    </div>
  );
}

const TONES = {
  green: "bg-green-50 text-green-600",
  red: "bg-red-50 text-red-600",
  amber: "bg-amber-50 text-amber-600",
  stone: "bg-stone-100 text-stone-500",
};

function Stat({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: string; tone: keyof typeof TONES }) {
  return (
    <div className={`${CARD} p-4`}>
      <div className={`mb-2 flex h-9 w-9 items-center justify-center rounded-xl ${TONES[tone]}`}>
        <Icon size={18} />
      </div>
      <p className="text-xl font-bold tracking-tight text-stone-900">{value}</p>
      <p className="text-xs text-stone-500">{label}</p>
    </div>
  );
}

type Week = { used: number; tossed: number };

// Grouped columns: used vs tossed, last week then this week. Each column is direct-labeled.
function WeekCompare({ thisWeek, lastWeek }: { thisWeek: Week; lastWeek: Week }) {
  const max = Math.max(1, thisWeek.used, thisWeek.tossed, lastWeek.used, lastWeek.tossed);
  const groups = [
    { label: "Last week", w: lastWeek },
    { label: "This week", w: thisWeek },
  ];
  return (
    <div className={`${CARD} p-4`}>
      <h3 className="font-semibold text-stone-900">This week vs last week</h3>
      <div className="mt-4 flex items-end justify-around">
        {groups.map(({ label, w }) => (
          <div key={label} className="flex flex-col items-center">
            <div className="flex items-end gap-2 border-b border-stone-200">
              {(["used", "tossed"] as const).map((k) => (
                <div key={k} className="flex w-10 flex-col items-center">
                  <span className="mb-1 text-sm font-bold tabular-nums text-stone-800">{w[k]}</span>
                  <div
                    title={`${label}: ${w[k]} ${OUTCOME[k].label.toLowerCase()}`}
                    className="w-full rounded-t-md transition-all duration-500"
                    style={{ height: `${Math.max(3, (w[k] / max) * 110)}px`, background: OUTCOME[k].color, opacity: w[k] ? 1 : 0.25 }}
                  />
                </div>
              ))}
            </div>
            {/* Per-column labels: identity never relies on color alone (green/red look alike to many colorblind people) */}
            <div className="mt-1 flex gap-2 text-[10px] text-stone-400">
              {(["used", "tossed"] as const).map((k) => (
                <span key={k} className="w-10 text-center">
                  {OUTCOME[k].label}
                </span>
              ))}
            </div>
            <span className="mt-1 text-xs font-semibold text-stone-600">{label}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-center gap-4 text-xs text-stone-500">
        {(["used", "tossed"] as const).map((k) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: OUTCOME[k].color }} />
            {OUTCOME[k].label}
          </span>
        ))}
      </div>
      <p className="mt-2 text-center text-[11px] text-stone-400">Weeks are the last 7 days and the 7 days before.</p>
    </div>
  );
}

function CategoryBars({ rows }: { rows: { category: string; count: number }[] }) {
  const max = Math.max(...rows.map((r) => r.count));
  return (
    <div className={`${CARD} p-4`}>
      <h3 className="font-semibold text-stone-900">What you rescued</h3>
      <ul className="mt-3 space-y-2">
        {rows.map((r) => (
          <li key={r.category} className="flex items-center gap-2 text-sm" title={`${r.count} ${r.category} item${r.count === 1 ? "" : "s"} used or donated`}>
            <span className="w-6 text-center text-lg leading-none">{CATEGORY_EMOJI[r.category] ?? "🛒"}</span>
            <span className="w-16 capitalize text-stone-600">{r.category}</span>
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-stone-100">
              <div className="h-full rounded-full bg-green-500 transition-all duration-500" style={{ width: `${(r.count / max) * 100}%` }} />
            </div>
            <span className="w-6 text-right font-semibold tabular-nums text-stone-700">{r.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
