import { Sparkles } from "lucide-react";

const CONTACT_ADMIN_URL = "https://t.me/hackedtrad";

/**
 * Shared pricing content shown before sending a user to Telegram to pay —
 * used both as a standalone dialog (PricingDialog) and embedded directly
 * inside the "subscription required" dialog in create-alert-dialog.tsx.
 */
export function PricingPlans() {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-sans font-extrabold text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Choose Your Premium Plan
        </h3>
      </div>

      <div className="space-y-2.5">
        <div className="flex items-center justify-between rounded-lg border border-border bg-card/60 px-4 py-3">
          <span className="font-semibold text-sm">Monthly Plan</span>
          <span className="font-mono font-bold text-primary">30 USDT / month</span>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-primary/40 bg-primary/5 px-4 py-3">
          <div>
            <span className="font-semibold text-sm">Yearly Plan</span>
            <div className="text-xs text-emerald-400 font-semibold">Save over 80%!</div>
          </div>
          <span className="font-mono font-bold text-primary">70 USDT / year</span>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">Important:</span> We accept USDT payments only.
      </p>

      <p className="text-sm text-muted-foreground">
        Click the button below to contact the Admin on Telegram, send your payment, and activate your premium lifetime access instantly!
      </p>

      <a
        href={CONTACT_ADMIN_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center w-full font-mono uppercase tracking-widest text-sm bg-primary text-black py-3 rounded-sm hover:bg-primary/90"
      >
        Contact Admin to Upgrade
      </a>
    </div>
  );
}

export function PricingDialogContent() {
  return <PricingPlans />;
}
