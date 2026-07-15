import { useEffect, useState } from "react";

/**
 * Tracks the browser's `beforeinstallprompt` event (Chrome/Edge/Android) so
 * we can render our own "Install app" button instead of waiting for the
 * browser's native mini-infobar. Also reports whether the app is already
 * running installed (standalone display mode) and whether the current
 * platform is iOS, which never fires `beforeinstallprompt` and instead
 * requires the manual Share -> Add to Home Screen flow.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isAppleDevice = /iPad|iPhone|iPod/.test(ua);
  const isIPadOS = ua.includes("Macintosh") && navigator.maxTouchPoints > 1;
  return isAppleDevice || isIPadOS;
}

export function useInstallPrompt() {
  const [deferredEvent, setDeferredEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() => isStandalone());

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredEvent(event as BeforeInstallPromptEvent);
    }
    function handleAppInstalled() {
      setInstalled(true);
      setDeferredEvent(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
    if (!deferredEvent) return "unavailable";
    await deferredEvent.prompt();
    const { outcome } = await deferredEvent.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferredEvent(null);
    return outcome;
  }

  return {
    /** True once the browser has offered a native install prompt we can trigger. */
    canPromptInstall: !!deferredEvent,
    /** True if the app is already running as an installed/standalone PWA. */
    installed,
    /** True on iOS/iPadOS, which requires the manual Share -> Add to Home Screen flow. */
    isIOS: isIOS(),
    promptInstall,
  };
}
