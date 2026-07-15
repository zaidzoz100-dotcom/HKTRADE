import webpush from "web-push";
import { Expo, type ExpoPushMessage } from "expo-server-sdk";
import { and, eq } from "drizzle-orm";
import {
  db,
  pushSubscriptionsTable,
  expoPushTokensTable,
  type PushSubscription,
} from "@workspace/db";
import { logger } from "./logger";

const expo = new Expo();

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

/** Registers (or re-registers) an Expo push token for the given user, keyed by token so a device re-registering just updates its owner. */
export async function saveExpoPushToken(clerkUserId: string, token: string): Promise<void> {
  await db
    .insert(expoPushTokensTable)
    .values({ clerkUserId, token })
    .onConflictDoUpdate({
      target: expoPushTokensTable.token,
      set: { clerkUserId },
    });
}

/** Removes an Expo push token, e.g. when the user opts out on that device. Scoped to the owning user so one user cannot unregister another user's device. */
export async function removeExpoPushToken(clerkUserId: string, token: string): Promise<void> {
  await db
    .delete(expoPushTokensTable)
    .where(and(eq(expoPushTokensTable.token, token), eq(expoPushTokensTable.clerkUserId, clerkUserId)));
}

/** Prunes a token the Expo push service reports as permanently invalid (e.g. app uninstalled). System-initiated, not a user request, so it isn't scoped to a single clerkUserId. */
async function pruneStaleExpoPushToken(token: string): Promise<void> {
  await db.delete(expoPushTokensTable).where(eq(expoPushTokensTable.token, token));
}

interface PushPayload {
  title: string;
  body: string;
  tag?: string;
}

/**
 * Sends a push notification to every Expo (native mobile) device the user
 * has registered. Separate delivery path from `sendPushToUser` (Web Push) —
 * a user with both the web app and mobile app installed gets both.
 */
export async function sendExpoPushToUser(clerkUserId: string, payload: PushPayload): Promise<void> {
  const tokens = await db
    .select()
    .from(expoPushTokensTable)
    .where(eq(expoPushTokensTable.clerkUserId, clerkUserId));

  if (tokens.length === 0) return;

  const validTokens = tokens.filter((t) => {
    if (!Expo.isExpoPushToken(t.token)) {
      logger.warn({ token: t.token }, "Dropping malformed Expo push token");
      return false;
    }
    return true;
  });
  if (validTokens.length === 0) return;

  const messages: ExpoPushMessage[] = validTokens.map((t) => ({
    to: t.token,
    title: payload.title,
    body: payload.body,
    sound: "default",
    ...(payload.tag ? { data: { tag: payload.tag } } : {}),
  }));

  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      tickets.forEach((ticket, i) => {
        if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
          const badToken = chunk[i].to as string;
          void pruneStaleExpoPushToken(badToken).catch((err) => {
            logger.error({ err, clerkUserId }, "Failed to prune stale Expo push token");
          });
        }
      });
    } catch (err) {
      logger.error({ err, clerkUserId }, "Failed to send Expo push notification chunk");
    }
  }
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
