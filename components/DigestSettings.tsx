"use client";

import { Bell, BellOff, Info, Send } from "lucide-react";
import { CARD } from "@/components/ui";
import type { DigestSettings as Settings } from "@/lib/digest";
import type { NotifyStatus } from "@/lib/notify";

export default function DigestSettings({
  settings,
  status,
  iosNeedsInstall,
  testMessage,
  onToggle,
  onTime,
  onTest,
}: {
  settings: Settings;
  status: NotifyStatus;
  iosNeedsInstall: boolean;
  testMessage: string | null;
  onToggle: (enabled: boolean) => void;
  onTime: (time: string) => void;
  onTest: () => void;
}) {
  const statusLine = {
    unsupported: { icon: BellOff, cls: "text-stone-500", text: "This browser doesn't support notifications. You'll still see the digest card on the Pantry screen." },
    denied: { icon: BellOff, cls: "text-red-700", text: "Notifications are blocked. Allow them for this site in your browser settings. The digest card still shows in the app." },
    default: settings.enabled
      ? { icon: BellOff, cls: "text-amber-700", text: "Notifications aren't allowed yet. Tap \"Send test digest now\" to ask again. The digest card still shows in the app." }
      : { icon: Bell, cls: "text-stone-500", text: "Turn this on and your browser will ask for permission to send notifications." },
    granted: settings.enabled
      ? { icon: Bell, cls: "text-green-700", text: `Enabled. You'll get a digest after ${formatTime(settings.time)} each day.` }
      : { icon: Bell, cls: "text-stone-500", text: "Notifications are allowed. Turn the digest on to get one each day." },
  }[status];
  const StatusIcon = statusLine.icon;

  return (
    <>
      <h2 className="mt-8 px-1 text-sm font-semibold uppercase tracking-wide text-stone-400">Daily digest</h2>
      <div className={`${CARD} mt-3 divide-y divide-stone-100 overflow-hidden`}>
        <label className="flex min-h-14 cursor-pointer items-center justify-between gap-3 px-4">
          <span>
            <span className="block font-medium text-stone-800">Daily digest notification</span>
            <span className="block text-xs text-stone-500">What&apos;s expiring, once a day</span>
          </span>
          <input
            type="checkbox"
            role="switch"
            className="sr-only"
            checked={settings.enabled}
            onChange={(e) => onToggle(e.target.checked)}
          />
          <span
            aria-hidden
            className={`relative h-7 w-12 shrink-0 rounded-full transition ${settings.enabled ? "bg-green-600" : "bg-stone-300"}`}
          >
            <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${settings.enabled ? "left-[22px]" : "left-0.5"}`} />
          </span>
        </label>

        <label className="flex min-h-14 items-center justify-between gap-3 px-4">
          <span className="font-medium text-stone-800">Time</span>
          <input
            type="time"
            value={settings.time}
            onChange={(e) => e.target.value && onTime(e.target.value)}
            className="min-h-11 rounded-xl border border-stone-200 bg-stone-50 px-3 text-stone-800"
          />
        </label>

        <div className="px-4 py-3">
          <button
            onClick={onTest}
            disabled={status === "unsupported"}
            className="flex min-h-11 items-center gap-2 rounded-xl border-2 border-green-600 px-4 text-sm font-semibold text-green-700 transition active:scale-95 active:bg-green-50 disabled:border-stone-200 disabled:text-stone-400"
          >
            <Send size={15} />
            Send test digest now
          </button>
          {testMessage && <p className="mt-2 text-xs text-stone-600">{testMessage}</p>}
        </div>
      </div>

      <p className={`mt-3 flex gap-1.5 px-1 text-xs leading-snug ${statusLine.cls}`}>
        <StatusIcon size={14} className="mt-px shrink-0" />
        {statusLine.text}
      </p>
      {iosNeedsInstall && status !== "granted" && (
        <p className="mt-2 flex gap-1.5 px-1 text-xs leading-snug text-stone-500">
          <Info size={14} className="mt-px shrink-0" />
          On iPhone and iPad, notifications only work after you add FreshTrack to your Home Screen (Share → Add to Home Screen).
        </p>
      )}
      <p className="mt-2 flex gap-1.5 px-1 text-xs leading-snug text-stone-400">
        <Info size={14} className="mt-px shrink-0" />
        Digest notifications appear when you open the app. Background push is coming soon.
      </p>
    </>
  );
}

function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
