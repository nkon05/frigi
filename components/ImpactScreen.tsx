"use client";

import { Car, Flame, HeartHandshake, RotateCcw, Snowflake, Sprout, Trash, Utensils, type LucideIcon } from "lucide-react";
import { Plank } from "@/components/Shelf";
import { EmptyState } from "@/components/ui";
import { computeStats, type HistoryEntry } from "@/lib/history";

const money = (n: number) => `$${n.toFixed(2)}`;

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

  const counts = { used: s.itemsUsed, donated: s.itemsDonated, tossed: s.itemsTossed };
  const outcomeTotal = s.itemsUsed + s.itemsDonated + s.itemsTossed;
  const subline =
    s.itemsRescued === 0
      ? "Use or donate your next item to start saving."
      : `${s.itemsRescued} item${s.itemsRescued === 1 ? "" : "s"} eaten or donated instead of thrown away.`;
  const km = Math.round(s.co2Kg / CO2_KG_PER_CAR_KM);

  return (
    <div className="space-y-4">
      {/* Hero: the one number that matters most */}
      <div className="rounded-2xl bg-olive p-5 text-white shadow-[0_4px_0_var(--color-olive-dark)]">
        <p className="text-sm font-bold text-white/90">you&apos;ve saved</p>
        <p className="font-display text-[44px] font-bold leading-none tracking-tight">{money(s.moneySaved)}</p>
        <p className="mt-3 text-sm font-medium text-white/90">{subline}</p>
      </div>

      {/* Where your food went: one stacked bar + labeled counts */}
      {outcomeTotal > 0 && (
        <div className="card p-4">
          <h3 className="font-display text-lg font-bold text-ink">where your food went</h3>
          <div className="mt-3 flex h-4 gap-0.5 overflow-hidden rounded-full">
            {(["used", "donated", "tossed"] as const).map((k) =>
              counts[k] ? (
                <div
                  key={k}
                  title={`${OUTCOME[k].label}: ${counts[k]}`}
                  className="h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full"
                  style={{ width: `${(counts[k] / outcomeTotal) * 100}%`, background: OUTCOME[k].color }}
                />
              ) : null
            )}
          </div>
          <ul className="mt-3 grid grid-cols-3 gap-2">
            {(["used", "donated", "tossed"] as const).map((k) => (
              <li key={k} className="flex items-center gap-1.5 text-sm font-bold text-muted">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: OUTCOME[k].color }} />
                <span className="font-display text-lg text-ink">{counts[k]}</span>
                {OUTCOME[k].label.toLowerCase()}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Three facts not shown anywhere else, as tiles on a shelf */}
      <div className="-mx-4 pt-1">
        <div className="grid grid-cols-3 gap-2 px-4">
          <Stat icon={Trash} tone="urgent" value={money(s.moneyWasted)} label="wasted" />
          <Stat icon={Flame} tone="soon" value={`${s.streakDays} day${s.streakDays === 1 ? "" : "s"}`} label="without waste" />
          <Stat icon={Snowflake} tone="freeze" value={`+${s.frozenDaysAdded}`} label="days added by freezing" />
        </div>
        <Plank />
      </div>

      {/* CO2, in everyday terms */}
      {km > 0 && (
        <div className="card flex items-center gap-3 p-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-tip text-olive">
            <Car size={22} />
          </div>
          <p className="text-sm font-bold text-ink">
            Like not driving <span className="font-display text-lg">{km} km</span>
            <span className="block text-xs font-medium text-muted">Rough estimate of CO₂ saved by not wasting food</span>
          </p>
        </div>
      )}

      <WeekCompare thisWeek={s.thisWeek} lastWeek={s.lastWeek} />

      <div className="flex justify-center pt-2">
        <button onClick={onReset} className="btn btn-outline text-sm">
          <RotateCcw size={14} />
          reset stats
        </button>
      </div>
    </div>
  );
}

const TONES = {
  urgent: "bg-urgent-bg text-urgent",
  soon: "bg-soon-bg text-soon",
  freeze: "bg-[#dbe6ec] text-freeze",
};

// Stat tile, shaped like a pantry shelf tile
function Stat({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: string; tone: keyof typeof TONES }) {
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
            <div className="mt-1 flex gap-2 text-[11px] font-bold text-muted">
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
    </div>
  );
}
