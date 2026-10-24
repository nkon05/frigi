// Browser notifications via the Notification API only (no service worker, no push).
// Shown at most once per day, when the app is opened.

const LAST_KEY = "frigi.lastNotified";

export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notificationPermission(): NotificationPermission | "unsupported" {
  return notificationsSupported() ? Notification.permission : "unsupported";
}

export async function requestNotifications(): Promise<NotificationPermission | "unsupported"> {
  if (!notificationsSupported()) return "unsupported";
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export function notifyExpiring(names: string[], { force = false } = {}) {
  if (!names.length || notificationPermission() !== "granted") return;
  const today = new Date().toDateString();
  try {
    if (!force && localStorage.getItem(LAST_KEY) === today) return;
    new Notification(`${names.length} item${names.length === 1 ? "" : "s"} expiring soon`, {
      body: `Use them up: ${names.slice(0, 4).join(", ")}${names.length > 4 ? "…" : ""}`,
      icon: "/icon-192.png",
    });
    localStorage.setItem(LAST_KEY, today);
  } catch {
    // Some mobile browsers only allow notifications from a service worker; skip quietly
  }
}
