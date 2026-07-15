import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGetPrices,
  getGetPricesQueryKey,
  type PriceSnapshot,
} from '@workspace/api-client-react';
import { subscribeToPriceUpdates } from '@/lib/price-socket';

/**
 * Combines the initial REST fetch with the live Socket.io push stream, the
 * same pattern as the web app's hooks/use-live-prices.ts. The query is
 * fetched once (staleTime: Infinity) and then kept fresh entirely by
 * pushed snapshots written directly into the query cache.
 */
export function useLivePrices() {
  const queryClient = useQueryClient();
  const query = useGetPrices({
    query: { queryKey: getGetPricesQueryKey(), staleTime: Infinity },
  });

  useEffect(() => {
    const unsubscribe = subscribeToPriceUpdates((snapshot: PriceSnapshot) => {
      queryClient.setQueryData(getGetPricesQueryKey(), snapshot);
    });
    return unsubscribe;
  }, [queryClient]);

  return query;
}
