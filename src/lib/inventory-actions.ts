
"use server";

import { InventoryDataService } from './database-service';
import type { InventoryItem, InventoryLog } from '@/types';
import { RAW_CASHEW_NUTS_NAME, PACKAGING_BOXES_NAME, VACUUM_BAGS_NAME, RCN_FOR_STEAMING_NAME } from './constants';

const dbService = InventoryDataService.getInstance();
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

export async function getFinishedGoodsStockAction(): Promise<InventoryItem[]> {
    try {
        return await dbService.getInventoryItemsByCategory('Finished Goods');
    } catch (error) {
        console.error("Server action error in getFinishedGoodsStockAction:", error);
        throw new Error('Failed to fetch finished goods stock.');
    }
}


export async function getDashboardMetricsAction() {
    try {
        const itemNames = [RAW_CASHEW_NUTS_NAME, PACKAGING_BOXES_NAME, VACUUM_BAGS_NAME, RCN_FOR_STEAMING_NAME];
        const inventoryMap = await dbService.getMultipleInventoryItemsByNames(itemNames);
        
        const rcnItem = inventoryMap.get(RAW_CASHEW_NUTS_NAME);
        const packagingBoxesItem = inventoryMap.get(PACKAGING_BOXES_NAME);
        const vacuumBagsItem = inventoryMap.get(VACUUM_BAGS_NAME);
        const rcnForSteamingItem = inventoryMap.get(RCN_FOR_STEAMING_NAME);
        
        const rcnStockKg = rcnItem?.quantity || 0;
        const rcnForSteamingKg = rcnForSteamingItem?.quantity || 0;
        
        // The "true" RCN stock is what's in the warehouse, not what's already been moved to the factory floor
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
        if (rcnForSteamingKg > (rcnStockKg * 0.5)) {
             alerts.push(`High amount of RCN (${rcnForSteamingKg} kg) is waiting on the factory floor.`);
        }

        return {
            rcnStockTonnes,
            rcnStockKg,
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
