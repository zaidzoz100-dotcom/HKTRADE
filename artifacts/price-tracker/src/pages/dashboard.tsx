import React from "react";
import { useGetPrices, getGetPricesQueryKey } from "@workspace/api-client-react";
import { LivePrices } from "@/components/live-prices";
import { AlertsList } from "@/components/alerts-list";
import { CreateAlertDialog } from "@/components/create-alert-dialog";
import { AlarmOverlay } from "@/components/alarm-overlay";

export default function TrackerDashboard() {
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
            <div className="h-8 w-8 bg-primary rounded-sm flex items-center justify-center shadow-[0_0_15px_rgba(252,211,77,0.3)]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--background))" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3v18h18" />
                <path d="m19 9-5 5-4-4-3 3" />
              </svg>
            </div>
            <div>
              <h1 className="font-mono font-bold tracking-widest leading-none text-primary uppercase">Aurum</h1>
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.2em]">Tracker Desk</span>
            </div>
          </div>
          
          <CreateAlertDialog />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        <LivePrices prices={prices} />
        <AlertsList />
      </main>
    </div>
  );
}
