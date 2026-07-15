import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetPrices,
  getGetPricesQueryKey,
  type PriceSnapshot,
} from "@workspace/api-client-react";
import { onPriceUpdate } from "@/lib/price-socket";

/**
 * Live price feed: one REST fetch on mount so the dashboard paints
 * immediately from cache/network, then a persistent WebSocket subscription
 * that writes every subsequent server-pushed update straight into the
 * react-query cache. No polling after the initial load — the server decides
 * when there's new data and pushes it, instead of the client repeatedly
 * asking "anything new yet?" every few seconds.
 */
export function useLivePrices() {
  const queryClient = useQueryClient();
  const queryKey = getGetPricesQueryKey();

  const query = useGetPrices({
    query: {
      queryKey,
      // One-time initial fetch for first paint. No refetchInterval — the
      // socket subscription below is what keeps this fresh from here on.
      staleTime: Infinity,
      // If the socket is ever down for a while, refetching on refocus is a
      // cheap safety net rather than leaving the dashboard stale forever.
      refetchOnWindowFocus: true,
    },
  });

  useEffect(() => {
    return onPriceUpdate((snapshot: PriceSnapshot) => {
      queryClient.setQueryData(queryKey, snapshot);
    });
    // queryKey is stable (no params), safe to depend on queryClient only.
  }, [queryClient]);

  return query;
}
