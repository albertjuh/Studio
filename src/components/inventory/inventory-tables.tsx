

"use client";

import type { InventoryLog } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface RecentRcnIntakeTableProps {
  data: InventoryLog[];
}

export function RecentRcnIntakeTable({ data }: RecentRcnIntakeTableProps) {
  if (data.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No recent RCN intake logs found.</p>;
  }
  return (
    <Table>
      <TableCaption>A list of the most recent RCN intake logs.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Item</TableHead>
          <TableHead className="text-right">Quantity (kg)</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((log) => (
          <TableRow key={log.id}>
            <TableCell className="text-xs">{format(new Date(log.timestamp), "PP pp")}</TableCell>
            <TableCell className="font-medium">{log.itemName}</TableCell>
            <TableCell className="text-right font-mono text-primary/80">{log.quantity.toLocaleString()}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

interface RecentOtherMaterialsIntakeTableProps {
  data: InventoryLog[];
}

export function RecentOtherMaterialsIntakeTable({ data }: RecentOtherMaterialsIntakeTableProps) {
    if (data.length === 0) {
        return <p className="text-center text-muted-foreground py-8">No recent material intake logs found.</p>;
    }
    return (
      <Table>
        <TableCaption>A list of the most recent other materials intake logs.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Item</TableHead>
            <TableHead className="text-right">Quantity</TableHead>
             <TableHead>Unit</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="text-xs">{format(new Date(log.timestamp), "PP pp")}</TableCell>
              <TableCell className="font-medium">{log.itemName}</TableCell>
              <TableCell className="text-right font-mono text-primary/80">{log.quantity.toLocaleString()}</TableCell>
              <TableCell>{log.itemUnit}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

interface RecentDispatchesTableProps {
  data: InventoryLog[];
}

export function RecentDispatchesTable({ data }: RecentDispatchesTableProps) {
    if (data.length === 0) {
        return <p className="text-center text-muted-foreground py-8">No recent dispatch logs found.</p>;
    }

    const getBadgeVariant = (notes?: string) => {
        if (!notes) return 'secondary';
        const lowerNotes = notes.toLowerCase();
        if (lowerNotes.includes('sale')) return 'default';
        if (lowerNotes.includes('waste')) return 'destructive';
        if (lowerNotes.includes('sample')) return 'outline';
        return 'secondary';
    }
    
    const getTransactionType = (notes?: string) => {
        if (!notes) return 'Dispatch';
        if (notes?.toLowerCase().includes('type: finished product sale')) return 'Sale';
        if (notes?.toLowerCase().includes('type: sample')) return 'Sample';
        if (notes?.toLowerCase().includes('type: waste disposal')) return 'Waste';
        return 'Dispatch';
    }


  return (
    <Table>
      <TableCaption>A list of the most recent dispatched goods logs.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Item</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Details</TableHead>
          <TableHead className="text-right">Quantity</TableHead>
          <TableHead>Unit</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((log) => (
          <TableRow key={log.id}>
            <TableCell className="text-xs">{format(new Date(log.timestamp), "PP pp")}</TableCell>
            <TableCell className="font-medium">{log.itemName}</TableCell>
            <TableCell>
              <Badge variant={getBadgeVariant(log.notes)}>{getTransactionType(log.notes)}</Badge>
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">{log.notes}</TableCell>
            <TableCell className="text-right font-mono text-destructive">{log.quantity.toLocaleString()}</TableCell>
            <TableCell>{log.itemUnit}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
