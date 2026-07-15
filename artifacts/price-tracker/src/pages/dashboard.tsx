import React, { useState } from "react";
import { useGetPrices, getGetPricesQueryKey, useGetAccount, getGetAccountQueryKey } from "@workspace/api-client-react";
import { useUser } from "@clerk/react";
import { LivePrices } from "@/components/live-prices";
import { AlertsList } from "@/components/alerts-list";
import { CreateAlertDialog } from "@/components/create-alert-dialog";
import { AlarmOverlay } from "@/components/alarm-overlay";
import { LogoutButton } from "@/App";
import { BrandLogo } from "@/components/brand-logo";
import { PricingDialog } from "@/components/pricing-dialog";
import { SettingsDialog } from "@/components/settings-dialog";
import { Button } from "@/components/ui/button";
import { Settings2, MessageCircle } from "lucide-react";

/**
 * Floating, circular "Contact Admin to Upgrade" chat-bubble button, fixed to
 * the bottom-right corner of the viewport. Shared by both trial states below
 * (active vs expired) so there is exactly one upgrade entry point on screen,
 * independent of scroll position. `env(safe-area-inset-bottom/right)` keeps
 * it clear of home-indicator/notch areas on mobile.
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
        bottom: "calc(1.25rem + env(safe-area-inset-bottom))",
        right: "calc(1.25rem + env(safe-area-inset-right))",
      }}
      className={`fixed z-40 h-14 w-14 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 ${
        urgent
          ? "bg-primary text-black shadow-primary/50 animate-siren"
          : "bg-card border border-primary/40 text-primary shadow-black/40 hover:bg-primary/10"
      }`}
    >
      <MessageCircle className="h-6 w-6" />
    </button>
  );
}

function TrialBanner() {
  const [pricingOpen, setPricingOpen] = useState(false);
  const { data: account } = useGetAccount({
    query: { queryKey: getGetAccountQueryKey() },
  });

  if (!account || account.isPremium) return null;

  if (account.daysRemaining > 0) {
    return (
      <>
        <PricingDialog open={pricingOpen} onOpenChange={setPricingOpen} />
        <div className="bg-primary/10 border border-primary/30 rounded-sm px-4 py-3 text-sm font-mono">
          <span className="text-primary">
            FREE TRIAL — {account.daysRemaining} day{account.daysRemaining === 1 ? "" : "s"} remaining
          </span>
        </div>
        <UpgradeBubble urgent={false} onClick={() => setPricingOpen(true)} />
      </>
    );
  }

  return (
    <>
      <PricingDialog open={pricingOpen} onOpenChange={setPricingOpen} />
      <div className="bg-red-950/60 border border-red-800 rounded-sm px-4 py-3 text-sm font-mono">
        <span className="text-red-200">
          Your free trial has ended — new alerts are locked
        </span>
      </div>
      <UpgradeBubble urgent={true} onClick={() => setPricingOpen(true)} />
    </>
  );
}

export default function TrackerDashboard() {
  const { user } = useUser();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [presetAsset, setPresetAsset] = useState<string | undefined>(undefined);
  const { data: prices } = useGetPrices({
    query: {
      queryKey: getGetPricesQueryKey(),
      refetchInterval: 15000,
      refetchOnWindowFocus: true,
    }
  });

  return (
    <div className="min-h-[100dvh] text-foreground pb-20">
      <AlarmOverlay />
      
      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BrandLogo size={30} />
            <div className="flex flex-col justify-center">
              <h1 className="font-sans font-extrabold text-base leading-none tracking-tight">
                <span className="text-white">FOREX</span><span className="text-primary">ALARM</span>
              </h1>
              <span className="text-[10px] font-sans text-muted-foreground tracking-[0.15em] mt-0.5">Price Alerts</span>
            </div>
          </div>

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
        <div className="space-y-4">
          <TrialBanner />
          <div className="sm:w-auto">
            <CreateAlertDialog />
          </div>
        </div>
        <LivePrices
          prices={prices}
          onSelectAsset={(symbol) => {
            setPresetAsset(symbol);
            setAlertDialogOpen(true);
          }}
        />
        <CreateAlertDialog
          open={alertDialogOpen}
          onOpenChange={setAlertDialogOpen}
          presetAssetSymbol={presetAsset}
          hideTrigger
        />
        <AlertsList />
      </main>
    </div>
  );
}
