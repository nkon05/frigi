"use client";

import { Cloud, Flame, HeartHandshake, PiggyBank, RotateCcw, Sprout, Trash, Utensils, type LucideIcon } from "lucide-react";
import { CARD, EmptyState } from "@/components/ui";
import { computeStats, type HistoryEntry } from "@/lib/history";

const money = (n: number) => `$${n.toFixed(2)}`;

export default function ImpactScreen({ history, onReset }: { history: HistoryEntry[]; onReset: () => void }) {
  const s = computeStats(history);

  if (!s.hasData) {
    return (
      <EmptyState
        icon={Sprout}
        title="Your impact starts here"
        body="When you use, donate or toss something from your pantry, your savings and waste show up here."
      />
    );
  }

  const subline =
    s.itemsRescued === 0
      ? "Use or donate your next item to start saving."
      : `That's ${s.itemsRescued} item${s.itemsRescued === 1 ? "" : "s"} that didn't end up in the bin. Nice work!`;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-gradient-to-br from-green-600 to-emerald-700 p-5 text-white shadow-lg shadow-green-700/20">
        <p className="text-sm font-medium text-green-100">You&apos;ve saved</p>
        <p className="mt-0.5 text-4xl font-bold tracking-tight">{money(s.moneySaved)}</p>
        <p className="text-sm font-medium text-green-100">of food</p>
        <p className="mt-3 text-sm text-green-50">{subline}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat icon={PiggyBank} label="Money saved" value={money(s.moneySaved)} tone="green" />
        <Stat icon={Trash} label="Money wasted" value={money(s.moneyWasted)} tone="red" />
        <Stat icon={Utensils} label="Items rescued" value={String(s.itemsRescued)} tone="green" />
        <Stat icon={HeartHandshake} label="Items donated" value={String(s.itemsDonated)} tone="amber" />
        <Stat
          icon={Trash}
          label="Waste rate"
          value={s.wasteRate == null ? "–" : `${Math.round(s.wasteRate * 100)}%`}
          tone={s.wasteRate != null && s.wasteRate > 0.25 ? "red" : "stone"}
        />
        <Stat icon={Flame} label="No-waste streak" value={`${s.streakDays} day${s.streakDays === 1 ? "" : "s"}`} tone="amber" />
      </div>

      <div className={`${CARD} flex items-center gap-3 p-4`}>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
          <Cloud size={22} />
        </div>
        <div>
          <p className="text-lg font-bold text-stone-900">
            ~{s.co2Kg.toFixed(1)} kg CO₂e <span className="text-xs font-medium text-stone-400">est.</span>
          </p>
          <p className="text-xs text-stone-500">Rough estimate of emissions avoided, based on food type.</p>
        </div>
      </div>

      <WeekCompare thisWeek={s.thisWeek} lastWeek={s.lastWeek} />

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

function WeekCompare({ thisWeek, lastWeek }: { thisWeek: Week; lastWeek: Week }) {
  const max = Math.max(1, thisWeek.used, thisWeek.tossed, lastWeek.used, lastWeek.tossed);
  return (
    <div className={`${CARD} p-4`}>
      <h3 className="font-semibold text-stone-900">This week vs last week</h3>
      <div className="mt-3 space-y-4">
        {[
          { label: "This week", w: thisWeek },
          { label: "Last week", w: lastWeek },
        ].map(({ label, w }) => (
          <div key={label}>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-stone-400">{label}</p>
            <Bar label="Used" count={w.used} max={max} cls="bg-green-500" />
            <Bar label="Tossed" count={w.tossed} max={max} cls="bg-red-400" />
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-stone-400">Weeks are the last 7 days and the 7 days before.</p>
    </div>
  );
}

function Bar({ label, count, max, cls }: { label: string; count: number; max: number; cls: string }) {
  return (
    <div className="mb-1 flex items-center gap-2 text-xs">
      <span className="w-12 text-stone-500">{label}</span>
      <div className="h-3 flex-1 overflow-hidden rounded-full bg-stone-100">
        <div className={`h-full rounded-full transition-all duration-500 ${cls}`} style={{ width: `${(count / max) * 100}%` }} />
      </div>
      <span className="w-5 text-right font-semibold tabular-nums text-stone-700">{count}</span>
    </div>
  );
}
