import webpush from "web-push";
import { eq } from "drizzle-orm";
import { db, pushSubscriptionsTable, type PushSubscription } from "@workspace/db";
import { logger } from "./logger";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:support@forexalarm.app";

const isConfigured = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);

if (isConfigured) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY!, VAPID_PRIVATE_KEY!);
} else {
  logger.warn(
    "VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY not set — push notifications are disabled until they're configured.",
  );
}

/** Whether Web Push is configured on this server (VAPID keys present). */
export function isPushConfigured(): boolean {
  return isConfigured;
}

/** Public key the frontend needs to create a `PushSubscription`. Null if unconfigured. */
export function getVapidPublicKey(): string | null {
  return isConfigured ? VAPID_PUBLIC_KEY! : null;
}

export interface PushSubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/** Upserts a subscription for the given user, keyed by endpoint (a device re-subscribing gets the same row updated, now attached to the current user). */
export async function saveSubscription(
  clerkUserId: string,
  sub: PushSubscriptionInput,
): Promise<void> {
  await db
    .insert(pushSubscriptionsTable)
    .values({
      clerkUserId,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    })
    .onConflictDoUpdate({
      target: pushSubscriptionsTable.endpoint,
      set: {
        clerkUserId,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
      },
    });
}

/** Removes a subscription by endpoint, e.g. when the user opts out on that device. */
export async function removeSubscription(endpoint: string): Promise<void> {
  await db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.endpoint, endpoint));
}

interface PushPayload {
  title: string;
  body: string;
  tag?: string;
}

/**
 * Sends a push notification to every device the user has subscribed. Any
 * subscription the push service reports as gone (404/410 — uninstalled,
 * revoked, or expired) is pruned so it isn't retried forever.
 */
export async function sendPushToUser(clerkUserId: string, payload: PushPayload): Promise<void> {
  if (!isConfigured) return;

  const subs: PushSubscription[] = await db
    .select()
    .from(pushSubscriptionsTable)
    .where(eq(pushSubscriptionsTable.clerkUserId, clerkUserId));

  if (subs.length === 0) return;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload),
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await removeSubscription(sub.endpoint);
          logger.info({ clerkUserId, endpoint: sub.endpoint }, "Pruned expired push subscription");
        } else {
          logger.error({ err, clerkUserId }, "Failed to send push notification");
        }
      }
    }),
  );
}
