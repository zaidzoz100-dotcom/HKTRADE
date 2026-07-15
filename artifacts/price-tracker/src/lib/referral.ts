const REFERRAL_CODE_KEY = "forexalarm:pendingReferralCode";

/**
 * Captures a `?ref=CODE` query param from the current URL into localStorage
 * so it survives the sign-up/sign-in redirect flow (Clerk drops query
 * params across its own routing), then strips it from the visible URL.
 * Safe to call on every page load — it's a no-op when there's no `ref` param.
 */
export function capturePendingReferralCode(): void {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("ref");
  if (!code) return;

  localStorage.setItem(REFERRAL_CODE_KEY, code.trim().toUpperCase());

  params.delete("ref");
  const newSearch = params.toString();
  const newUrl =
    window.location.pathname + (newSearch ? `?${newSearch}` : "") + window.location.hash;
  window.history.replaceState(null, "", newUrl);
}

export function getPendingReferralCode(): string | null {
  return localStorage.getItem(REFERRAL_CODE_KEY);
}

export function clearPendingReferralCode(): void {
  localStorage.removeItem(REFERRAL_CODE_KEY);
}

export function buildReferralLink(referralCode: string): string {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${window.location.origin}${basePath}/?ref=${referralCode}`;
}
