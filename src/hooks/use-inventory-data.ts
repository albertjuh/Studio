
"use client";

import { useState, useEffect } from 'react';
import { InventoryDataService, type InventoryItem } from '@/lib/database-service';

/**
 * Custom hook to fetch and subscribe to inventory data.
 * @deprecated This hook is being replaced by React Query for better state management.
 * Please use `useQuery` with server actions from `inventory-actions.ts` instead.
 */
export function useInventoryData() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dbService = InventoryDataService.getInstance();
    let unsubscribe: () => void;

    try {
      unsubscribe = dbService.subscribeToInventoryItems(
        (fetchedItems) => {
          setItems(fetchedItems);
          setLoading(false);
          setError(null);
        },
        (err) => {
          setError(err.message);
          setLoading(false);
        }
      );
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }

    // Cleanup subscription on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  return { items, loading, error };
}
