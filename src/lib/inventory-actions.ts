
"use server";

import { InventoryDataService } from './database-service';
import type { InventoryLog } from '@/types';

const dbService = InventoryDataService.getInstance();
const RCN_ITEM_NAME = "Raw Cashew Nuts";
const PACKAGING_BOXES_NAME = "Packaging Boxes";
const VACUUM_BAGS_NAME = "Vacuum Bags";
const DAILY_PRODUCTION_TARGET_TONNES = 20;

export async function getInventoryLogsAction(): Promise<InventoryLog[]> {
    try {
      return await dbService.getLatestLogs(100); // Get latest 100 logs
    } catch (error) {
      console.error("Server action error in getInventoryLogsAction:", error);
      throw new Error('Failed to fetch inventory logs.');
    }
}

export async function getInventoryItems() {
  try {
    return await dbService.getAllInventoryItems();
  } catch (error) {
    console.error("Server action error in getInventoryItems:", error);
    return []; 
  }
}

export async function getDashboardMetricsAction() {
    try {
        const itemNames = [RCN_ITEM_NAME, PACKAGING_BOXES_NAME, VACUUM_BAGS_NAME];
        const inventoryMap = await dbService.getMultipleInventoryItemsByNames(itemNames);
        
        const rcnItem = inventoryMap.get(RCN_ITEM_NAME);
        const packagingBoxesItem = inventoryMap.get(PACKAGING_BOXES_NAME);
        const vacuumBagsItem = inventoryMap.get(VACUUM_BAGS_NAME);
        
        const rcnStockKg = rcnItem?.quantity || 0;
        const rcnStockTonnes = rcnStockKg / 1000;
        
        const sufficiencyDays = DAILY_PRODUCTION_TARGET_TONNES > 0 ? rcnStockTonnes / DAILY_PRODUCTION_TARGET_TONNES : Infinity;
        
        let rcnStockSufficiency = `Sufficient for ~${sufficiencyDays.toFixed(1)} days`;
        if (sufficiencyDays === Infinity) {
             rcnStockSufficiency = `Production target not set`;
        } else if (sufficiencyDays < 1) {
            rcnStockSufficiency = `Warning: Less than 1 day of stock!`;
        } else if (sufficiencyDays < 3) {
            rcnStockSufficiency = `Alert: Stock for only ~${sufficiencyDays.toFixed(1)} days.`;
        }
        
        const alerts: string[] = [];
        if (sufficiencyDays < 3 && sufficiencyDays !== Infinity) {
            alerts.push('RCN stock is critically low.');
        }
        if ((packagingBoxesItem?.quantity || 0) < 1000) {
            alerts.push('Packaging box stock is low.');
        }
        if ((vacuumBagsItem?.quantity || 0) < 2000) {
            alerts.push('Vacuum bag stock is low.');
        }

        return {
            rcnStockTonnes,
            packagingBoxesStock: packagingBoxesItem?.quantity || 0,
            vacuumBagsStock: vacuumBagsItem?.quantity || 0,
            rcnStockSufficiency,
            alerts,
        };

    } catch (error) {
        console.error("Error in getDashboardMetricsAction:", error);
        // Re-throw the error to be caught by the page's error boundary
        throw new Error("Failed to fetch dashboard metrics.");
    }
}
