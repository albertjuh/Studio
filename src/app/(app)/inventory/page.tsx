
/**
 * Inventory Page
 *
 * This page displays an overview of the current inventory, including
 * stock levels, recent intakes, and recent dispatches.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Warehouse } from "lucide-react";
import { CurrentStockLevels } from "@/components/inventory/current-stock-levels";
import { RecentDispatch } from "@/components/inventory/recent-dispatch";
import dynamic from 'next/dynamic';
import { RecentIntake } from "@/components/inventory/recent-intake";

export default function InventoryPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center gap-3 mb-6">
        <Warehouse className="h-8 w-8 text-primary" />
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Inventory Overview</h2>
      </div>

      <Card className="mb-6">
          <CardHeader>
              <CardTitle>Current Stock Levels</CardTitle>
              <CardDescription>A real-time overview of all items currently in stock across all categories.</CardDescription>
          </CardHeader>
 {/* Use dynamic rendering for real-time updates */}
          <CardContent>
              {/* Dynamically import the CurrentStockLevels component to ensure it renders on the client side */}
              <CurrentStockLevels />
          </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentIntake />
        <RecentDispatch />
      </div>

    </div>
  );
}
