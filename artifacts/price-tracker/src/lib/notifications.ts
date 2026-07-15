/**
 * Thin wrapper around the browser Notification API. Lets a triggered price
 * alarm surface a native mobile/desktop push-style notification even while
 * the app tab is backgrounded or the phone screen is showing another app,
 * as long as the browser process is still alive and permission was granted.
 */
class NotificationService {
  isSupported(): boolean {
    return typeof window !== "undefined" && "Notification" in window;
  }

  permission(): NotificationPermission | "unsupported" {
    if (!this.isSupported()) return "unsupported";
    return Notification.permission;
  }

  async requestPermission(): Promise<NotificationPermission | "unsupported"> {
    if (!this.isSupported()) return "unsupported";
    if (Notification.permission !== "default") return Notification.permission;
    try {
      return await Notification.requestPermission();
    } catch {
      return Notification.permission;
    }
  }

  notify(title: string, body: string) {
    if (!this.isSupported() || Notification.permission !== "granted") return;
    try {
      const notification = new Notification(title, {
        body,
        icon: `${import.meta.env.BASE_URL}logo.svg`,
        tag: `forex-alarm-${Date.now()}`,
        requireInteraction: true,
      });
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (e) {
      console.warn("Failed to show notification", e);
    }
  }
}

export const notificationService = new NotificationService();
