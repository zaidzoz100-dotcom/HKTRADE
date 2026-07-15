import React from "react";
import { useGetPrices, getGetPricesQueryKey, useGetAccount, getGetAccountQueryKey } from "@workspace/api-client-react";
import { useUser } from "@clerk/react";
import { LivePrices } from "@/components/live-prices";
import { AlertsList } from "@/components/alerts-list";
import { CreateAlertDialog } from "@/components/create-alert-dialog";
import { AlarmOverlay } from "@/components/alarm-overlay";
import { LogoutButton } from "@/App";
import { BrandLogo } from "@/components/brand-logo";

const CONTACT_ADMIN_URL = "https://t.me/hackedtrad";

function TrialBanner() {
  const { data: account } = useGetAccount({
    query: { queryKey: getGetAccountQueryKey() },
  });

  if (!account || account.isPremium) return null;

  if (account.daysRemaining > 0) {
    return (
      <div className="bg-primary/10 border border-primary/30 rounded-sm px-4 py-3 flex items-center justify-between text-sm font-mono">
        <span className="text-primary">
          FREE TRIAL — {account.daysRemaining} day{account.daysRemaining === 1 ? "" : "s"} remaining
        </span>
        <a
          href={CONTACT_ADMIN_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="uppercase tracking-wide text-primary underline underline-offset-2 hover:text-primary/80"
        >
          Contact Admin to Upgrade
        </a>
      </div>
    );
  }

  return (
    <div className="bg-red-950/60 border border-red-800 rounded-sm px-4 py-3 flex items-center justify-between text-sm font-mono">
      <span className="text-red-200">
        Your free trial has ended — new alerts are locked
      </span>
      <a
        href={CONTACT_ADMIN_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="uppercase tracking-wide bg-primary text-black px-3 py-1.5 rounded-sm hover:bg-primary/90"
      >
        Contact Admin to Upgrade to Premium
      </a>
    </div>
  );
}

export default function TrackerDashboard() {
  const { user } = useUser();
  const { data: prices } = useGetPrices({
    query: {
      queryKey: getGetPricesQueryKey(),
      refetchInterval: 15000,
      refetchOnWindowFocus: true,
    }
  });

  return (
    <div className="min-h-[100dvh] bg-background text-foreground pb-20">
      <AlarmOverlay />
      
      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo size={32} />
            <div>
              <h1 className="font-mono font-bold tracking-widest leading-none text-primary uppercase">Forex Alarm</h1>
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.2em]">Price Alerts</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {user?.primaryEmailAddress && (
              <span className="hidden sm:inline text-xs font-mono text-muted-foreground">
                {user.primaryEmailAddress.emailAddress}
              </span>
            )}
            <CreateAlertDialog />
            <LogoutButton className="text-xs font-mono uppercase tracking-wide text-muted-foreground hover:text-foreground" />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        <TrialBanner />
        <LivePrices prices={prices} />
        <AlertsList />
      </main>
    </div>
  );
}
