import { Router, type IRouter } from "express";
import { clerkClient } from "@clerk/express";
import {
  AdminListUsersQueryParams,
  AdminUpdateUserPlanParams,
  AdminUpdateUserPlanBody,
  AdminListUsersResponse,
  AdminUpdateUserPlanResponse,
} from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/requireAdmin";
import { ensureUser, computeAccountStatus, applyAdminPlanAction } from "../lib/account";
import type { User } from "@workspace/db";

const router: IRouter = Router();

router.use(requireAdmin);

function toAdminUser(user: User, email: string | null) {
  const status = computeAccountStatus(user);
  return {
    clerkUserId: user.clerkUserId,
    email,
    createdAt: user.createdAt.toISOString(),
    plan: status.plan,
    planStatus: status.planStatus,
    isPremium: status.isPremium,
    daysRemaining: status.daysRemaining,
    premiumExpiresAt: status.premiumExpiresAt,
  };
}

router.get("/admin/users", async (req, res): Promise<void> => {
  const parsed = AdminListUsersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { data: clerkUsers } = await clerkClient.users.getUserList({
    query: parsed.data.search || undefined,
    limit: 100,
    orderBy: "-created_at",
  });

  const merged = await Promise.all(
    clerkUsers.map(async (clerkUser) => {
      const localUser = await ensureUser(clerkUser.id);
      const primaryEmail =
        clerkUser.emailAddresses.find(
          (e) => e.id === clerkUser.primaryEmailAddressId,
        )?.emailAddress ??
        clerkUser.emailAddresses[0]?.emailAddress ??
        null;
      return toAdminUser(localUser, primaryEmail);
    }),
  );

  res.json(AdminListUsersResponse.parse(merged));
});

router.patch("/admin/users/:clerkUserId", async (req, res): Promise<void> => {
  const params = AdminUpdateUserPlanParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = AdminUpdateUserPlanBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  try {
    const updated = await applyAdminPlanAction(
      params.data.clerkUserId,
      body.data.action,
    );

    let email: string | null = null;
    try {
      const clerkUser = await clerkClient.users.getUser(params.data.clerkUserId);
      email =
        clerkUser.emailAddresses.find(
          (e) => e.id === clerkUser.primaryEmailAddressId,
        )?.emailAddress ??
        clerkUser.emailAddresses[0]?.emailAddress ??
        null;
    } catch {
      // Clerk lookup failing shouldn't block returning the updated plan status.
    }

    res.json(AdminUpdateUserPlanResponse.parse(toAdminUser(updated, email)));
  } catch (err) {
    res.status(404).json({ error: (err as Error).message });
  }
});

export default router;
