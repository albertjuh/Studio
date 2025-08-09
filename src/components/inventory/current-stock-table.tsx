
"use client";

import { useQuery } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { getAllInventoryItemsAction } from '@/lib/actions';
import { format } from 'date-fns';

export function CurrentStockLevelsTable() {
  const { data: items, isLoading, isError, error } = useQuery({
      queryKey: ['allInventoryItems', 'inventoryLogs'],
      queryFn: getAllInventoryItemsAction
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
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

  return (
    <Table>
      <TableCaption>This is a summary of current stock levels.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Item Name</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Last Updated</TableHead>
          <TableHead className="text-right">Remaining Quantity</TableHead>
          <TableHead>Unit</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-medium">{item.name}</TableCell>
            <TableCell>{item.category}</TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {format(new Date(item.lastUpdated), 'PP p')}
            </TableCell>
            <TableCell className="text-right font-mono">{item.quantity.toLocaleString()}</TableCell>
            <TableCell>{item.unit}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
