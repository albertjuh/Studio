
"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from 'date-fns';
import type { InventoryItem } from '@/types';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface CurrentStockLevelsTableProps {
  items: InventoryItem[];
}

export function CurrentStockLevelsTable({ items }: CurrentStockLevelsTableProps) {
  const groupedItems = items.reduce((acc, item) => {
    const category = item.category || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, InventoryItem[]>);

  // Define the desired order of categories
  const categoryOrder = ['Raw Materials', 'In-Process Goods', 'Finished Goods', 'By-Products', 'Other Materials'];
  const sortedCategories = Object.keys(groupedItems).sort((a, b) => {
    const indexA = categoryOrder.indexOf(a);
    const indexB = categoryOrder.indexOf(b);
    if (indexA === -1 && indexB === -1) return a.localeCompare(b); // both not in order list, sort alphabetically
    if (indexA === -1) return 1; // a is not in order list, push to end
    if (indexB === -1) return -1; // b is not in order list, push to end
    return indexA - indexB;
  });

  return (
     <Accordion type="multiple" defaultValue={categoryOrder} className="w-full space-y-2">
      {sortedCategories.map(category => (
        <AccordionItem value={category} key={category} className="border rounded-lg bg-card overflow-hidden">
          <AccordionTrigger className="p-4 hover:no-underline text-lg font-semibold">
            {category} ({groupedItems[category].length} items)
          </AccordionTrigger>
          <AccordionContent className="border-t">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Remaining Quantity</TableHead>
                  <TableHead>Unit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedItems[category].map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(item.lastUpdated), 'PP p')}
                    </TableCell>
                    <TableCell className="text-right font-mono">{item.quantity.toLocaleString(undefined, { maximumFractionDigits: 2 })}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
