
"use client";

import { useState, useEffect } from 'react';
import { getAllInventoryItemsAction } from '@/lib/actions';
import type { InventoryItem } from '@/types';
import { useQuery } from '@tanstack/react-query';

/**
 * @deprecated This hook is being replaced by React Query for better state management.
 * Please use `useQuery` with `getAllInventoryItemsAction` directly in your components.
 */
export function useInventoryData() {
  const { data: items, isLoading: loading, isError, error } = useQuery({
    queryKey: ['allInventoryItems'],
    queryFn: getAllInventoryItemsAction,
  });

  return { items, loading, error: isError ? (error as Error).message : null };
}
