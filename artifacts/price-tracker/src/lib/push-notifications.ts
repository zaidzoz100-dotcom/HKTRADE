/**
 * Web Push (VAPID) subscription management. Complements notifications.ts:
 * that module fires an in-tab Notification while the browser process is
 * alive; this module registers a service worker + PushSubscription so the
 * OS can deliver a system notification even after the browser/app is fully
 * closed (desktop browsers, or an installed/home-screen PWA on mobile).
 */

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  const swUrl = `${import.meta.env.BASE_URL}sw.js`;
  const existing = await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL);
  if (existing) return existing;
  return navigator.serviceWorker.register(swUrl, { scope: import.meta.env.BASE_URL });
}

/** Returns the subscription if this device is currently subscribed, else null. Does not prompt. */
export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL);
  if (!registration) return null;
  return registration.pushManager.getSubscription();
}

/**
 * Requests Notification permission (if needed), registers the service
 * worker, and subscribes via PushManager using the server's VAPID public
 * key. Returns the subscription payload to POST to the backend, or null if
 * unsupported/denied/misconfigured.
 */
export async function subscribeToPush(
  vapidPublicKey: string,
): Promise<{ endpoint: string; keys: { p256dh: string; auth: string } } | null> {
  if (!isPushSupported()) return null;

  if (Notification.permission === "default") {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;
  }
  if (Notification.permission !== "granted") return null;

  const registration = await getRegistration();
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey).buffer as ArrayBuffer,
    });
  }

  const key = subscription.getKey("p256dh");
  const authSecret = subscription.getKey("auth");
  if (!key || !authSecret) return null;

  return {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: btoa(String.fromCharCode(...new Uint8Array(key))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
      auth: btoa(String.fromCharCode(...new Uint8Array(authSecret))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
    },
  };
}

/** Unsubscribes this device locally and returns the endpoint that was removed, so the caller can tell the backend. */
export async function unsubscribeFromPush(): Promise<string | null> {
  const subscription = await getExistingSubscription();
  if (!subscription) return null;
  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  return endpoint;
}
