
"use client";

import { useInventoryData } from '@/hooks/use-inventory-data';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export function CurrentStockLevelsTable() {
  const { items, loading, error } = useInventoryData();

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Calculating Stock</AlertTitle>
        <AlertDescription>
          Could not calculate the current stock levels. Error: {error}
        </AlertDescription>
      </Alert>
    );
  }

  if (!items || items.length === 0) {
    return <p className="text-center text-muted-foreground py-4">No stock data to display. Start by logging some intake.</p>;
  }

  return (
    <Table>
      <TableCaption>This is a summary of current stock levels. Data is fetched on page load.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Item Name</TableHead>
          <TableHead>Category</TableHead>
          <TableHead className="text-right">Remaining Quantity</TableHead>
          <TableHead>Unit</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-medium">{item.name}</TableCell>
            <TableCell>{item.category}</TableCell>
            <TableCell className="text-right font-mono">{item.quantity.toLocaleString()}</TableCell>
            <TableCell>{item.unit}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
