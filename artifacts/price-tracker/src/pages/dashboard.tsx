import React, { useState } from "react";
import { useGetAccount, getGetAccountQueryKey } from "@workspace/api-client-react";
import { useLivePrices } from "@/hooks/use-live-prices";
import { useUser } from "@clerk/react";
import { LivePrices } from "@/components/live-prices";
import { AlertsList } from "@/components/alerts-list";
import { CreateAlertDialog } from "@/components/create-alert-dialog";
import { CustomizeAssetsDialog } from "@/components/customize-assets-dialog";
import { AlarmOverlay } from "@/components/alarm-overlay";
import { LogoutButton } from "@/App";
import { BrandLogo } from "@/components/brand-logo";
import { PricingDialog } from "@/components/pricing-dialog";
import { SettingsDialog } from "@/components/settings-dialog";
import { Button } from "@/components/ui/button";
import { Settings2, MessageCircle, Hourglass } from "lucide-react";

/**
 * Floating, circular "Contact Admin to Upgrade" chat-bubble button, fixed to
 * the bottom-right corner of the viewport. Shared by both trial states below
 * (active vs expired) so there is exactly one upgrade entry point on screen,
 * independent of scroll position. `env(safe-area-inset-bottom/right)` keeps
 * it clear of home-indicator/notch areas on mobile. Sized and glowing
 * prominently since this is the app's main upgrade path.
 */
function UpgradeBubble({
  urgent,
  onClick,
}: {
  urgent: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Contact admin to upgrade"
      title="Contact Admin to Upgrade"
      style={{
        bottom: "calc(1.5rem + env(safe-area-inset-bottom))",
        right: "calc(1.5rem + env(safe-area-inset-right))",
      }}
      className={`fixed z-40 h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem] rounded-full flex flex-col items-center justify-center gap-0.5 shadow-2xl ring-4 transition-transform hover:scale-105 active:scale-95 ${
        urgent
          ? "bg-primary text-black shadow-primary/60 ring-primary/30 animate-siren"
          : "bg-primary text-black shadow-primary/50 ring-primary/20"
      }`}
    >
      <MessageCircle className="h-6 w-6 sm:h-7 sm:w-7" />
      <span className="text-[9px] font-mono font-extrabold uppercase tracking-wide leading-none">Upgrade</span>
    </button>
  );
}

/**
 * Owns the trial/premium state + pricing dialog, and renders:
 *  - a compact trial-status line (small bold text + animated hourglass),
 *    meant to be placed inline in normal page flow (NOT inside the header,
 *    since the header's `backdrop-blur` creates a new containing block for
 *    `position: fixed` descendants, which previously pinned the "Upgrade"
 *    FAB to the header's corner instead of the viewport's).
 *  - the floating circular "Upgrade" FAB, rendered at the document root
 *    level so its `fixed` positioning is relative to the viewport.
 * Returns null entirely once the user is premium (no trial UI at all).
 */
function useTrialGate() {
  const [pricingOpen, setPricingOpen] = useState(false);
  const { data: account } = useGetAccount({
    query: { queryKey: getGetAccountQueryKey() },
  });

  if (!account || account.isPremium) {
    return { showTrialUi: false, pricingOpen, setPricingOpen, account: undefined, urgent: false };
  }

  return {
    showTrialUi: true,
    pricingOpen,
    setPricingOpen,
    account,
    urgent: account.daysRemaining <= 0,
  };
}

function TrialLine({
  account,
}: {
  account: { daysRemaining: number };
}) {
  if (account.daysRemaining > 0) {
    return (
      <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-primary">
        <Hourglass className="h-3.5 w-3.5 animate-hourglass" />
        FREE TRIAL — {account.daysRemaining} day{account.daysRemaining === 1 ? "" : "s"} left
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-red-400">
      <Hourglass className="h-3.5 w-3.5 animate-hourglass" />
      TRIAL ENDED — ALERTS LOCKED
    </div>
  );
}

export default function TrackerDashboard() {
  const { user } = useUser();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [presetAsset, setPresetAsset] = useState<string | undefined>(undefined);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const trial = useTrialGate();
  // Same query key as useTrialGate's useGetAccount call, so react-query
  // dedupes this into a single network request/cache entry.
  const { data: account } = useGetAccount({
    query: { queryKey: getGetAccountQueryKey() },
  });
  const favoriteAssets = account?.favoriteAssets ?? [];
  const { data: prices } = useLivePrices();

  return (
    <div className="min-h-[100dvh] text-foreground pb-20">
      <AlarmOverlay />

      {/* Header stays clean: brand + settings/log out only. Trial status and
          the Upgrade FAB live outside this element (see below) so the
          header's backdrop-blur can't clip/contain the fixed-position FAB. */}
      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
              window.location.href = `${basePath}/tracker`;
            }}
            className="flex items-center gap-2.5 rounded-md -mx-1 px-1 py-1 transition-opacity hover:opacity-80 active:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            aria-label="Go to dashboard home"
            title="Home"
          >
            <BrandLogo size={30} />
            <div className="flex flex-col justify-center">
              <h1 className="font-sans font-extrabold text-base leading-none tracking-tight">
                <span className="text-white">FOREX</span><span className="text-primary">ALARM</span>
              </h1>
              <span className="text-[10px] font-sans text-muted-foreground tracking-[0.15em] mt-0.5">Price Alerts</span>
            </div>
          </button>

          <div className="flex items-center gap-4">
            {user?.primaryEmailAddress && (
              <span className="hidden sm:inline text-xs font-mono text-muted-foreground">
                {user.primaryEmailAddress.emailAddress}
              </span>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setSettingsOpen(true)}
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              aria-label="Alert settings"
            >
              <Settings2 className="h-4.5 w-4.5" />
            </Button>
            <LogoutButton className="text-xs font-mono uppercase tracking-wide text-muted-foreground hover:text-foreground" />
          </div>
          <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CreateAlertDialog />
          {trial.showTrialUi && trial.account && <TrialLine account={trial.account} />}
        </div>
        <LivePrices
          prices={prices}
          favoriteAssets={favoriteAssets}
          onSelectAsset={(symbol) => {
            setPresetAsset(symbol);
            setAlertDialogOpen(true);
          }}
          onCustomize={() => setCustomizeOpen(true)}
        />
        <CreateAlertDialog
          open={alertDialogOpen}
          onOpenChange={setAlertDialogOpen}
          presetAssetSymbol={presetAsset}
          hideTrigger
        />
        <CustomizeAssetsDialog
          open={customizeOpen}
          onOpenChange={setCustomizeOpen}
          selected={favoriteAssets}
        />
        <AlertsList />
      </main>

      {trial.showTrialUi && (
        <>
          <PricingDialog open={trial.pricingOpen} onOpenChange={trial.setPricingOpen} />
          <UpgradeBubble urgent={trial.urgent} onClick={() => trial.setPricingOpen(true)} />
        </>
      )}
    </div>
  );
}
