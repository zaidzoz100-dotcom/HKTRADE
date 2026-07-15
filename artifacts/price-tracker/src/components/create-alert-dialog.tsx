import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateAlert, useGetAccount, getGetAccountQueryKey, getListAlertsQueryKey, useGetAssets, getGetAssetsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BellPlus, Lock } from "lucide-react";
import { audioAlarm } from "@/lib/audio-alarm";
import { PricingPlans } from "@/components/pricing-plans";

function SubscriptionRequiredDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] border-primary/20">
        <DialogHeader>
          <DialogTitle className="font-mono uppercase tracking-wider text-primary flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Subscription Required
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Your 4-day free trial has ended. Upgrade to Premium for unlimited, lifetime access to alerts.
        </p>
        <PricingPlans />
      </DialogContent>
    </Dialog>
  );
}

// Fallback list, used only until /assets has loaded — keeps the dialog usable instantly on first paint.
const FALLBACK_ASSETS = [
  { symbol: "XAU", label: "Gold (XAU)" },
  { symbol: "XAG", label: "Silver (XAG)" },
  { symbol: "EUR/USD", label: "EUR/USD" },
  { symbol: "GBP/USD", label: "GBP/USD" },
  { symbol: "USD/JPY", label: "USD/JPY" },
];

const formSchema = z.object({
  assetSymbol: z.string().min(1, "Required"),
  targetPrice: z.coerce.number().positive("Must be positive"),
  note: z.string().optional(),
});

export function CreateAlertDialog({
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  presetAssetSymbol,
  hideTrigger = false,
}: {
  /** Pass to drive the dialog from elsewhere (e.g. clicking a market card). Omit to use the built-in "NEW ALERT" trigger. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Pre-selects an asset when the dialog is opened externally. */
  presetAssetSymbol?: string;
  /** Hide the built-in trigger button, when this dialog is only opened externally. */
  hideTrigger?: boolean;
} = {}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = setControlledOpen ?? setUncontrolledOpen;
  const [blockedOpen, setBlockedOpen] = useState(false);
  const queryClient = useQueryClient();
  const createAlert = useCreateAlert();
  const { data: account } = useGetAccount({
    query: { queryKey: getGetAccountQueryKey() },
  });
  const canCreateAlerts = account?.canCreateAlerts ?? true;
  const { data: assetCatalog } = useGetAssets({
    query: { queryKey: getGetAssetsQueryKey() },
  });
  const ASSETS = assetCatalog?.length
    ? assetCatalog.map((a) => ({ symbol: a.symbol, label: `${a.name} (${a.symbol})` }))
    : FALLBACK_ASSETS;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      assetSymbol: "XAU",
      targetPrice: 0,
      note: "",
    },
  });

  // Re-sync the asset field whenever this dialog is (re)opened with a preset
  // asset — e.g. the user clicked a specific market card.
  React.useEffect(() => {
    if (open && presetAssetSymbol) {
      form.setValue("assetSymbol", presetAssetSymbol);
    }
  }, [open, presetAssetSymbol]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    // Arm audio context if not already done, since creating an alert indicates intent to hear it later
    audioAlarm.init();

    const asset = ASSETS.find(a => a.symbol === values.assetSymbol);
    if (!asset) return;

    createAlert.mutate(
      {
        data: {
          assetSymbol: values.assetSymbol,
          assetLabel: asset.label,
          targetPrice: values.targetPrice,
          note: values.note || null,
        }
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAlertsQueryKey() });
          setOpen(false);
          form.reset();
        },
        onError: (error: any) => {
          if (error?.response?.status === 403) {
            setOpen(false);
            setBlockedOpen(true);
          }
        },
      }
    );
  }

  function handleTriggerClick(e: React.MouseEvent) {
    audioAlarm.init();
    if (!canCreateAlerts) {
      e.preventDefault();
      setBlockedOpen(true);
    }
  }

  // Guard external open requests (e.g. clicking a market card) the same way
  // the built-in trigger does: redirect to the upgrade prompt instead of
  // silently doing nothing when the account can't create alerts.
  React.useEffect(() => {
    if (open && !canCreateAlerts) {
      setOpen(false);
      setBlockedOpen(true);
    }
  }, [open, canCreateAlerts]);

  return (
    <>
    <SubscriptionRequiredDialog open={blockedOpen} onOpenChange={setBlockedOpen} />
    <Dialog open={open && canCreateAlerts} onOpenChange={setOpen}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button
            onClick={handleTriggerClick}
            size="lg"
            className="btn-premium font-extrabold tracking-wide text-base px-6 w-full sm:w-auto"
          >
            {canCreateAlerts ? <BellPlus className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />}
            NEW ALERT
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[425px] border-primary/20">
        <DialogHeader>
          <DialogTitle className="font-mono uppercase tracking-wider text-primary flex items-center gap-2">
            <BellPlus className="h-5 w-5" />
            Set Price Target
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="assetSymbol"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asset</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select asset" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ASSETS.map(asset => (
                        <SelectItem key={asset.symbol} value={asset.symbol}>
                          {asset.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="targetPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Price</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        type="number" 
                        step="0.00001" 
                        {...field} 
                        className="text-lg py-6 pl-8 font-mono bg-background border-input"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">$</span>
                    </div>
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    You'll be alerted the moment the price reaches this level, rising or falling.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note (Optional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. Sell half position" className="font-sans" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="pt-4 flex justify-end">
              <Button 
                type="submit" 
                size="lg" 
                className="w-full font-bold tracking-widest"
                disabled={createAlert.isPending}
              >
                {createAlert.isPending ? "ARMING..." : "ARM ALERT"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
    </>
  );
}
