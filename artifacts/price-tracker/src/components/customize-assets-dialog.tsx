import { useEffect, useState } from "react";
import {
  useGetAssets,
  getGetAssetsQueryKey,
  useUpdateFavoriteAssets,
  getGetAccountQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Star, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORY_LABELS: Record<string, string> = {
  metal: "Metals",
  forex: "Forex",
  crypto: "Crypto",
};

export function CustomizeAssetsDialog({
  open,
  onOpenChange,
  selected,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Currently active favorite symbols, used to pre-check the list when opened. */
  selected: string[];
}) {
  const queryClient = useQueryClient();
  const { data: assets } = useGetAssets({
    query: { queryKey: getGetAssetsQueryKey() },
  });
  const updateFavorites = useUpdateFavoriteAssets();

  const [draft, setDraft] = useState<string[]>(selected);

  // Re-sync the draft selection every time the dialog is (re)opened, so it
  // always reflects the account's saved favorites rather than a stale edit.
  useEffect(() => {
    if (open) setDraft(selected);
  }, [open, selected.join(",")]);

  function toggle(symbol: string) {
    setDraft((prev) =>
      prev.includes(symbol) ? prev.filter((s) => s !== symbol) : [...prev, symbol],
    );
  }

  function handleSave() {
    if (draft.length === 0) return;
    updateFavorites.mutate(
      { data: { favoriteAssets: draft } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetAccountQueryKey() });
          onOpenChange(false);
        },
      },
    );
  }

  const grouped = (assets ?? []).reduce<Record<string, typeof assets>>((acc, asset) => {
    (acc[asset.category] ??= []).push(asset);
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] border-primary/20">
        <DialogHeader>
          <DialogTitle className="font-mono uppercase tracking-wider text-primary flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Customize Markets
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Star the assets you want tracked on your dashboard. Your selection is saved to your profile.
        </p>

        <ScrollArea className="h-72 pr-3 -mr-3">
          <div className="space-y-5">
            {Object.entries(grouped).map(([category, list]) => (
              <div key={category} className="space-y-1.5">
                <p className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                  {CATEGORY_LABELS[category] ?? category}
                </p>
                {list?.map((asset) => {
                  const isChecked = draft.includes(asset.symbol);
                  return (
                    <button
                      type="button"
                      key={asset.symbol}
                      onClick={() => toggle(asset.symbol)}
                      className={cn(
                        "w-full flex items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors",
                        isChecked
                          ? "border-primary/40 bg-primary/10"
                          : "border-border hover:bg-muted/50",
                      )}
                    >
                      <Checkbox checked={isChecked} onCheckedChange={() => toggle(asset.symbol)} />
                      <Star
                        className={cn(
                          "h-4 w-4 shrink-0",
                          isChecked ? "fill-primary text-primary" : "text-muted-foreground",
                        )}
                      />
                      <span className="font-mono text-sm">{asset.symbol}</span>
                      <span className="text-xs text-muted-foreground truncate">{asset.name}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </ScrollArea>

        {updateFavorites.isError && (
          <p className="text-sm text-red-400">
            {(updateFavorites.error as Error)?.message ?? "Failed to save selection"}
          </p>
        )}

        <div className="flex items-center justify-between pt-2">
          <span className="text-xs font-mono text-muted-foreground">
            {draft.length} selected{draft.length === 0 ? " — pick at least one" : ""}
          </span>
          <Button
            onClick={handleSave}
            disabled={draft.length === 0 || updateFavorites.isPending}
            className="font-bold tracking-wide"
          >
            {updateFavorites.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Selection
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
