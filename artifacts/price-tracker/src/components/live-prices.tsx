import React, { useEffect, useState, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, Activity, Clock } from "lucide-react";
import type { PriceSnapshot } from "@workspace/api-client-react";

export function LivePrices({ prices }: { prices: PriceSnapshot | undefined }) {
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-muted rounded w-1/4"></div>
            </CardContent>
          </Card>
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
          <Activity className="h-5 w-5 text-primary" />
          Live Markets
        </h2>
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <Clock className="h-3 w-3" />
          {new Date(prices.updatedAt).toLocaleTimeString()}
          {prices.stale && <Badge variant="destructive" className="ml-2 py-0 h-5">STALE</Badge>}
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {allAssets.map((asset) => {
          const prevPrice = prevPrices[asset.symbol];
          const hasChanged = prevPrice !== undefined && prevPrice !== asset.price;
          const isUp = hasChanged && asset.price > prevPrice;
          const isDown = hasChanged && asset.price < prevPrice;

          return (
            <Card key={asset.symbol} className="overflow-hidden bg-card border-border">
              <CardContent className="p-4 relative">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-mono font-bold text-muted-foreground">{asset.symbol}</span>
                  {!asset.isForex && <span className="text-xs text-muted-foreground font-mono">{asset.name}</span>}
                </div>
                
                <div className={cn(
                  "flex items-center text-2xl font-mono tracking-tighter transition-colors duration-500",
                  isUp ? "text-green-500" : isDown ? "text-destructive" : "text-foreground"
                )}>
                  {asset.isForex ? asset.price.toFixed(5) : asset.price.toFixed(2)}
                </div>
                
                <div className="flex items-center gap-1 mt-2 h-4">
                  {hasChanged && (
                    <>
                      {isUp ? (
                        <ArrowUpRight className="h-3 w-3 text-green-500" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3 text-destructive" />
                      )}
                      <span className={cn(
                        "text-xs font-mono",
                        isUp ? "text-green-500" : "text-destructive"
                      )}>
                        {Math.abs(asset.price - prevPrice).toFixed(asset.isForex ? 5 : 2)}
                      </span>
                    </>
                  )}
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
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
