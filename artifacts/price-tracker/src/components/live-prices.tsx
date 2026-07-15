import React, { useEffect, useState, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, Activity, Clock, Target } from "lucide-react";
import type { PriceSnapshot } from "@workspace/api-client-react";

export function LivePrices({
  prices,
  onSelectAsset,
}: {
  prices: PriceSnapshot | undefined;
  /** Called with the asset symbol when a market card is clicked, to open the "Set Price Target" dialog pre-filled for that asset. */
  onSelectAsset?: (symbol: string) => void;
}) {
  const [prevPrices, setPrevPrices] = useState<Record<string, number>>({});
  const lastUpdatedAt = useRef<string | null>(null);

  useEffect(() => {
    if (!prices) return;
    
    if (prices.updatedAt !== lastUpdatedAt.current) {
      const currentMap: Record<string, number> = {};
      prices.metals.forEach(m => { currentMap[m.symbol] = m.price; });
      prices.forex.forEach(f => { currentMap[f.pair] = f.rate; });
      
      setPrevPrices(prev => {
        // Only update prev if we actually have a change in timestamp, avoiding constant flashes
        return lastUpdatedAt.current ? currentMap : {};
      });
      lastUpdatedAt.current = prices.updatedAt;
    }
  }, [prices]);

  if (!prices) {
    return (
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="card-cloud animate-pulse w-full aspect-square max-w-[9.5rem] mx-auto bg-card border border-border" />
        ))}
      </div>
    );
  }

  const allAssets = [
    ...prices.metals.map(m => ({ symbol: m.symbol, name: m.name, price: m.price, isForex: false })),
    ...prices.forex.map(f => ({ symbol: f.pair, name: f.pair, price: f.rate, isForex: true }))
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary animate-heartbeat" />
          Live Markets
        </h2>
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <Clock className="h-3 w-3" />
          {new Date(prices.updatedAt).toLocaleTimeString()}
          {prices.stale && <Badge variant="destructive" className="ml-2 py-0 h-5">STALE</Badge>}
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {allAssets.map((asset, i) => {
          const prevPrice = prevPrices[asset.symbol];
          const hasChanged = prevPrice !== undefined && prevPrice !== asset.price;
          const isUp = hasChanged && asset.price > prevPrice;
          const isDown = hasChanged && asset.price < prevPrice;

          return (
            <button
              key={asset.symbol}
              type="button"
              onClick={() => onSelectAsset?.(asset.symbol)}
              title={`Set a price target for ${asset.name}`}
              style={{ animationDelay: `${i * 0.4}s` }}
              className="card-cloud animate-float group relative w-full aspect-square max-w-[9.5rem] mx-auto bg-card border border-border p-2 sm:p-4 flex flex-col items-center justify-center text-center overflow-hidden cursor-pointer transition-[border-radius,transform,border-color] duration-300 hover:scale-105 hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="font-mono font-bold text-xs text-blue-400">{asset.symbol}</span>

              <div className={cn(
                "flex items-center justify-center text-lg sm:text-xl font-mono tracking-tighter transition-colors duration-500 mt-1",
                isUp ? "text-green-500" : isDown ? "text-destructive" : "text-foreground"
              )}>
                {asset.isForex ? asset.price.toFixed(5) : asset.price.toFixed(2)}
              </div>

              <div className="flex items-center gap-1 mt-1 h-4">
                {hasChanged && (
                  <>
                    {isUp ? (
                      <ArrowUpRight className="h-3 w-3 text-green-500" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3 text-destructive" />
                    )}
                    <span className={cn(
                      "text-[10px] font-mono",
                      isUp ? "text-green-500" : "text-destructive"
                    )}>
                      {Math.abs(asset.price - prevPrice).toFixed(asset.isForex ? 5 : 2)}
                    </span>
                  </>
                )}
              </div>

              {/* Hover affordance hinting the card is clickable to set a target */}
              <div className="absolute inset-0 flex items-center justify-center bg-background/90 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-200 pointer-events-none">
                <span className="flex items-center gap-1 text-[11px] font-mono uppercase tracking-wide text-primary">
                  <Target className="h-3.5 w-3.5" />
                  Set Target
                </span>
              </div>

              {/* Visual flash on update */}
              {hasChanged && (
                <div className={cn(
                  "absolute inset-0 opacity-10 pointer-events-none animate-in fade-in duration-500 zoom-out",
                  isUp ? "bg-green-500" : "bg-destructive"
                )} onAnimationEnd={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}/>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
