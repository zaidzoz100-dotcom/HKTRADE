import { useEffect, useRef } from "react";
import { useApplyReferral, getGetAccountQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getPendingReferralCode, clearPendingReferralCode } from "@/lib/referral";

/**
 * Invisible — mounted once inside the signed-in dashboard. If the user
 * arrived via a `?ref=CODE` link (captured to localStorage by
 * `capturePendingReferralCode` before sign-in) and hasn't already redeemed a
 * referral code, submits it once. Any outcome (success, "already applied",
 * self-referral, etc.) clears the pending code so we never retry — the
 * account is refetched on success so the reward shows up immediately.
 */
export function ReferralRedeemer({
  referredByCode,
}: {
  referredByCode: string | null | undefined;
}) {
  const queryClient = useQueryClient();
  const applyReferral = useApplyReferral();
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    if (referredByCode === undefined) return; // account not loaded yet
    if (referredByCode) return; // already redeemed — nothing to do

    const code = getPendingReferralCode();
    if (!code) return;

    attempted.current = true;
    applyReferral
      .mutateAsync({ data: { code } })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: getGetAccountQueryKey() });
      })
      .catch(() => {
        // Invalid/self/already-applied — nothing actionable for the user here.
      })
      .finally(() => {
        clearPendingReferralCode();
      });
  }, [referredByCode, applyReferral, queryClient]);

  return null;
}
