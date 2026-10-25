"use client";

import { Bell, BellOff, Info, Send } from "lucide-react";
import { Switch } from "@/components/ui";
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
    unsupported: { icon: BellOff, cls: "text-muted", text: "This browser doesn't support notifications. You'll still see the digest card on the Pantry screen." },
    denied: { icon: BellOff, cls: "text-terra", text: "Notifications are blocked. Allow them for this site in your browser settings. The digest card still shows in the app." },
    default: settings.enabled
      ? { icon: BellOff, cls: "text-ai", text: "Notifications aren't allowed yet. Tap \"send test digest\" to ask again. The digest card still shows in the app." }
      : { icon: Bell, cls: "text-muted", text: "Turn this on and your browser will ask for permission to send notifications." },
    granted: settings.enabled
      ? { icon: Bell, cls: "text-olive-text", text: `Enabled. You'll get a digest after ${formatTime(settings.time)} each day.` }
      : { icon: Bell, cls: "text-muted", text: "Notifications are allowed. Turn the digest on to get one each day." },
  }[status];
  const StatusIcon = statusLine.icon;

  return (
    <>
      <h2 className="section-label mt-8 px-1">Daily digest</h2>
      <div className="card mt-3 divide-y-2 divide-wall overflow-hidden">
        <label className="flex min-h-14 cursor-pointer items-center justify-between gap-3 px-4 py-2">
          <span>
            <span className="block font-bold text-ink">Daily digest notification</span>
            <span className="block text-xs text-muted">What&apos;s expiring, once a day</span>
          </span>
          <input type="checkbox" role="switch" className="sr-only" checked={settings.enabled} onChange={(e) => onToggle(e.target.checked)} />
          <Switch on={settings.enabled} />
        </label>

        <label className="flex min-h-14 items-center justify-between gap-3 px-4 py-2">
          <span className="font-bold text-ink">Time</span>
          <input
            type="time"
            value={settings.time}
            onChange={(e) => e.target.value && onTime(e.target.value)}
            className="field font-bold accent-olive"
          />
        </label>

        <div className="px-4 py-3">
          <button onClick={onTest} disabled={status === "unsupported"} className="btn btn-outline text-sm">
            <Send size={15} />
            send test digest
          </button>
          {testMessage && <p className="mt-2 text-xs font-bold text-muted">{testMessage}</p>}
        </div>
      </div>

      <p className={`mt-3 flex gap-1.5 px-1 text-xs font-bold leading-snug ${statusLine.cls}`}>
        <StatusIcon size={14} className="mt-px shrink-0" />
        {statusLine.text}
      </p>
      {iosNeedsInstall && status !== "granted" && (
        <p className="mt-2 flex gap-1.5 px-1 text-xs leading-snug text-muted">
          <Info size={14} className="mt-px shrink-0" />
          On iPhone and iPad, notifications only work after you add the app to your Home Screen (Share → Add to Home Screen).
        </p>
      )}
      <p className="mt-2 flex gap-1.5 px-1 text-xs leading-snug text-muted">
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
