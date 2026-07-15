import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PricingPlans } from "@/components/pricing-plans";

/**
 * A dialog that shows subscription pricing before sending the user to
 * Telegram to pay. Controlled externally so it can be opened programmatically
 * (e.g. from a plain <a>-style trigger) without nesting inside another Dialog.
 */
export function PricingDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] border-primary/20">
        <DialogHeader className="sr-only">
          <DialogTitle>Choose Your Premium Plan</DialogTitle>
        </DialogHeader>
        <PricingPlans />
      </DialogContent>
    </Dialog>
  );
}
