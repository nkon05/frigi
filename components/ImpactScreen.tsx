"use client";

import { Car, Cloud, Flame, HeartHandshake, PiggyBank, RotateCcw, Snowflake, Sprout, Trash, Utensils, type LucideIcon } from "lucide-react";
import CategoryIcon from "@/components/CategoryIcon";
import { Plank } from "@/components/Shelf";
import { EmptyState } from "@/components/ui";
import { computeStats, type HistoryEntry } from "@/lib/history";
import type { Category } from "@/lib/pantry";

const money = (n: number) => `$${n.toFixed(2)}`;
const pct = (n: number) => `${Math.round(n * 100)}%`;

// Outcome colors (chart tokens), validated for colorblind separation in this order:
// used (olive), donated (amber), tossed (terracotta). Every mark also has a text label.
const OUTCOME = {
  used: { label: "Used", color: "var(--color-chart-used)", icon: Utensils },
  donated: { label: "Donated", color: "var(--color-chart-donated)", icon: HeartHandshake },
  tossed: { label: "Tossed", color: "var(--color-chart-tossed)", icon: Trash },
};

// Rough: an average petrol car emits ~0.17 kg CO2e per km. Illustrative only.
const CO2_KG_PER_CAR_KM = 0.17;

export default function ImpactScreen({ history, onReset }: { history: HistoryEntry[]; onReset: () => void }) {
  const s = computeStats(history);

  if (!s.hasData) {
    return (
      <EmptyState
        icon={Sprout}
        title="your impact starts here"
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

  const stats: StatProps[] = [
    { icon: PiggyBank, label: "money saved", value: money(s.moneySaved), tone: "fine" },
    { icon: Trash, label: "money wasted", value: money(s.moneyWasted), tone: "urgent" },
    { icon: Utensils, label: "items rescued", value: String(s.itemsRescued), tone: "fine" },
    { icon: HeartHandshake, label: "items donated", value: String(s.itemsDonated), tone: "soon" },
    { icon: Trash, label: "waste rate", value: s.wasteRate == null ? "–" : pct(s.wasteRate), tone: s.wasteRate != null && s.wasteRate > 0.25 ? "urgent" : "plain" },
    { icon: Flame, label: "no-waste streak", value: `${s.streakDays} day${s.streakDays === 1 ? "" : "s"}`, tone: "soon" },
  ];

  return (
    <div className="space-y-4">
      {/* Hero: money saved + rescue-rate ring */}
      <div className="flex items-center gap-4 rounded-2xl bg-olive p-5 text-white shadow-[0_4px_0_var(--color-olive-dark)]">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white/90">you&apos;ve saved</p>
          <p className="font-display text-[44px] font-bold leading-none tracking-tight">{money(s.moneySaved)}</p>
          <p className="mt-1 text-sm font-bold text-white/90">of food</p>
          <p className="mt-3 text-sm font-medium text-white/90">{subline}</p>
        </div>
        {outcomeTotal > 0 && <Ring value={rescueRate} label="rescued" />}
      </div>

      {/* Where your food went: one stacked bar + labeled legend */}
      {outcomeTotal > 0 && (
        <div className="card p-4">
          <h3 className="font-display text-lg font-bold text-ink">where your food went</h3>
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
                <li key={k} className="text-xs font-bold text-muted">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: OUTCOME[k].color }} />
                    <Icon size={12} />
                    {OUTCOME[k].label}
                  </span>
                  <span className="mt-0.5 block font-display text-lg font-bold text-ink">
                    {n} <span className="font-sans text-xs font-bold text-muted">{pct(n / outcomeTotal)}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Stat tiles on shelves, like the pantry */}
      <div className="-mx-4 pt-1">
        {[stats.slice(0, 3), stats.slice(3)].map((row, i) => (
          <div key={i}>
            <div className="grid grid-cols-3 gap-2 px-4">
              {row.map((st) => (
                <Stat key={st.label} {...st} />
              ))}
            </div>
            <Plank />
          </div>
        ))}
      </div>

      {/* Freezing */}
      <div className="flex items-center gap-3 rounded-2xl border-2 border-freeze/40 bg-[#e3ecf0] p-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-paper text-freeze">
          <Snowflake size={22} />
        </div>
        <div>
          <p className="section-label text-freeze">Extended by freezing</p>
          <p className="font-display text-lg font-bold text-[#2f4d5c]">
            {s.frozenItems} item{s.frozenItems === 1 ? "" : "s"} · +{s.frozenDaysAdded} days
          </p>
          {s.frozenItems === 0 && <p className="text-xs font-bold text-[#2f4d5c]/80">Freeze food that&apos;s about to expire to keep it for months.</p>}
        </div>
      </div>

      {/* CO2 with a relatable equivalent */}
      <div className="card p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-tip text-olive">
            <Cloud size={22} />
          </div>
          <div>
            <p className="font-display text-lg font-bold text-ink">
              ~{s.co2Kg.toFixed(1)} kg CO₂e <span className="font-sans text-xs font-bold text-muted">est.</span>
            </p>
            <p className="flex items-center gap-1 text-sm font-bold text-muted">
              <Car size={14} />
              about {Math.round(s.co2Kg / CO2_KG_PER_CAR_KM)} km not driven
            </p>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-muted">Rough estimate of emissions avoided, based on food type.</p>
      </div>

      <WeekCompare thisWeek={s.thisWeek} lastWeek={s.lastWeek} />

      {s.rescuedByCategory.length > 0 && <CategoryBars rows={s.rescuedByCategory} />}

      <div className="flex justify-center pt-2">
        <button onClick={onReset} className="btn btn-outline text-sm">
          <RotateCcw size={14} />
          reset stats
        </button>
      </div>
    </div>
  );
}

// Single-value gauge (white on the olive hero)
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
        <span className="font-display text-xl font-bold leading-none">{pct(value)}</span>
        <span className="text-[10px] font-bold text-white/90">{label}</span>
      </div>
    </div>
  );
}

const TONES = {
  fine: "bg-fine-bg text-fine",
  urgent: "bg-urgent-bg text-urgent",
  soon: "bg-soon-bg text-soon",
  plain: "bg-tip text-brown",
};

type StatProps = { icon: LucideIcon; label: string; value: string; tone: keyof typeof TONES };

// Stat tile, shaped like a pantry shelf tile
function Stat({ icon: Icon, label, value, tone }: StatProps) {
  return (
    <div className="flex min-w-0 flex-col rounded-[12px_12px_4px_4px] bg-paper p-2.5 shadow-[0_2px_0_rgba(0,0,0,.08)]">
      <div className={`mb-1.5 flex h-8 w-8 items-center justify-center rounded-full ${TONES[tone]}`}>
        <Icon size={16} />
      </div>
      <p className="font-display text-lg font-bold leading-tight text-ink">{value}</p>
      <p className="text-[11px] font-bold leading-tight text-muted">{label}</p>
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
    <div className="card p-4">
      <h3 className="font-display text-lg font-bold text-ink">this week vs last week</h3>
      <div className="mt-4 flex items-end justify-around">
        {groups.map(({ label, w }) => (
          <div key={label} className="flex flex-col items-center">
            <div className="flex items-end gap-2 border-b-2 border-sand">
              {(["used", "tossed"] as const).map((k) => (
                <div key={k} className="flex w-10 flex-col items-center">
                  <span className="mb-1 font-display text-base font-bold tabular-nums text-ink">{w[k]}</span>
                  <div
                    title={`${label}: ${w[k]} ${OUTCOME[k].label.toLowerCase()}`}
                    className="w-full rounded-t-md transition-all duration-500"
                    style={{ height: `${Math.max(3, (w[k] / max) * 110)}px`, background: OUTCOME[k].color, opacity: w[k] ? 1 : 0.25 }}
                  />
                </div>
              ))}
            </div>
            {/* Per-column labels: identity never relies on color alone */}
            <div className="mt-1 flex gap-2 text-[10px] font-bold text-muted">
              {(["used", "tossed"] as const).map((k) => (
                <span key={k} className="w-10 text-center">
                  {OUTCOME[k].label}
                </span>
              ))}
            </div>
            <span className="mt-1 text-xs font-extrabold text-brown">{label}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-center gap-4 text-xs font-bold text-muted">
        {(["used", "tossed"] as const).map((k) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: OUTCOME[k].color }} />
            {OUTCOME[k].label}
          </span>
        ))}
      </div>
      <p className="mt-2 text-center text-[11px] text-muted">Weeks are the last 7 days and the 7 days before.</p>
    </div>
  );
}

function CategoryBars({ rows }: { rows: { category: Category; count: number }[] }) {
  const max = Math.max(...rows.map((r) => r.count));
  return (
    <div className="card p-4">
      <h3 className="font-display text-lg font-bold text-ink">what you rescued</h3>
      <ul className="mt-3 space-y-2">
        {rows.map((r) => (
          <li key={r.category} className="flex items-center gap-2 text-sm" title={`${r.count} ${r.category} item${r.count === 1 ? "" : "s"} used or donated`}>
            <span className="flex w-6 justify-center">
              <CategoryIcon category={r.category} size={18} />
            </span>
            <span className="w-16 font-bold capitalize text-brown">{r.category}</span>
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-track">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(r.count / max) * 100}%`, background: "var(--color-chart-used)" }} />
            </div>
            <span className="w-6 text-right font-extrabold tabular-nums text-ink">{r.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
