
"use client";

import { useQuery } from '@tanstack/react-query';
import { getAllInventoryItemsAction } from '@/lib/actions';
import { CurrentStockLevelsTable } from './current-stock-table';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export function CurrentStockLevels() {
  const { data: items, isLoading, isError, error } = useQuery({
      queryKey: ['allInventoryItems'],
      queryFn: getAllInventoryItemsAction
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Calculating Stock</AlertTitle>
        <AlertDescription>
          Could not calculate the current stock levels. Error: {(error as Error).message}
        </AlertDescription>
      </Alert>
    );
  }

  if (!items || items.length === 0) {
    return <p className="text-center text-muted-foreground py-4">No stock data to display. Start by logging some intake.</p>;
  }

  return <CurrentStockLevelsTable items={items} />;
}
