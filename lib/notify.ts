// System notifications via the service worker (public/sw.js). No server push.
// registration.showNotification() works on Android Chrome, where `new Notification()` throws.

export type NotifyStatus = "unsupported" | "default" | "denied" | "granted";

export function notifyStatus(): NotifyStatus {
  if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) return "unsupported";
  return Notification.permission;
}

export async function registerServiceWorker(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("/sw.js");
  } catch (err) {
    console.error("Service worker registration failed:", err);
  }
}

export async function requestNotifications(): Promise<NotifyStatus> {
  if (notifyStatus() === "unsupported") return "unsupported";
  try {
    return await Notification.requestPermission();
  } catch {
    return notifyStatus();
  }
}

// Returns true if a notification was shown
export async function showNotification(title: string, body: string): Promise<boolean> {
  if (notifyStatus() !== "granted") return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification(title, {
      body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: "frigi-digest", // a newer digest replaces the old one instead of stacking
      data: { url: "/?tab=pantry" },
    });
    return true;
  } catch (err) {
    console.error("Notification failed:", err);
    return false;
  }
}

// iPhone/iPad Safari only allows web notifications for apps added to the Home Screen
export function isIOSNotInstalled(): boolean {
  if (typeof navigator === "undefined") return false;
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone =
    window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return ios && !standalone;
}
