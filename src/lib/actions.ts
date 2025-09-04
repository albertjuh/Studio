
"use server";

import { InventoryDataService } from '@/lib/database-service';
import type {
  ReportDataPayload,
  RcnIntakeEntry,
  GoodsDispatchedFormValues,
  SteamingProcessFormValues,
  ShellingProcessFormValues,
  DryingProcessFormValues,
  PeelingProcessFormValues,
  CalibrationFormValues,
  RcnQualityAssessmentFormValues,
  MachineGradingFormValues,
  ManualPeelingRefinementFormValues,
  PackagingFormValues,
  QualityControlFinalFormValues,
  OtherMaterialsIntakeFormValues,
  RcnOutputToFactoryEntry,
  DailyAiSummary,
  NotificationSettings,
  ReportFilterState,
  RcnSizingCalibrationFormValues,
  InventoryLog,
  InventoryItem,
  VacuumBagIntakeFormValues,
  VacuumBagWastageFormValues,
  VacuumBagBatch,
  DashboardMetrics
} from "@/types";
import { TraceabilityFlowRequest, TraceabilityFlowOutput } from '@/ai/flows/traceability-flow';
import { PACKAGING_BOXES_NAME, VACUUM_BAGS_NAME, PEELED_KERNELS_FOR_PACKAGING_NAME, RCN_FOR_SIZING_NAME, SHELLED_KERNELS_FOR_DRYING_NAME, DRIED_KERNELS_FOR_PEELING_NAME, RAW_CASHEW_NUTS_NAME, CNS_SHELL_WASTE_NAME, TESTA_PEEL_WASTE_NAME, PACKAGE_WEIGHT_KG, WHITE_PLAIN_BOXES_NAME, PAINTED_LOGO_BOXES_NAME, VACUUM_BAGS_BASE_NAME, VACUUM_BAGS_CARTON_QTY, PEELED_KERNELS_FOR_GRADING_NAME, GRADED_KERNELS_FOR_REFINEMENT_NAME } from "./constants";
import { dailySummaryFlow } from '@/ai/flows/daily-ai-summary';
import { getTraceabilityReport } from '@/ai/flows/traceability-flow';
import { unstable_noStore as noStore } from 'next/cache';
import { subDays, format } from 'date-fns';

const dbService = InventoryDataService.getInstance();
const DAILY_PRODUCTION_TARGET_TONNES = 20;
const OTHER_ITEM_VALUE = 'Other/Uncategorized';
type RcnWarehouseTransaction = (RcnIntakeEntry | RcnOutputToFactoryEntry) & { id?: string };

// --- Server-side cache for AI Summary ---
let cachedSummary: DailyAiSummary | null = null;
let lastCacheTimestamp: Date | null = null;

// Helper to check if cache is stale (stale after 1 hour)
const isCacheStale = () => {
    if (!lastCacheTimestamp) return true;
    return (new Date().getTime() - lastCacheTimestamp.getTime()) > 3600000; // 1 hour
};


// --- AI Actions ---
export async function getDailyAiSummaryAction(forceRegenerate: boolean = false): Promise<DailyAiSummary | null> {
    noStore(); // Opt out of caching for this function
    
    if (!forceRegenerate && cachedSummary && !isCacheStale()) {
        return cachedSummary;
    }

    try {
        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.startsWith("YOUR")) {
            console.warn("AI functionality is disabled. GEMINI_API_KEY is not configured.");
            return {
                id: 'disabled-summary-no-key',
                date: new Date().toISOString(),
                summary: 'AI summary is disabled.',
                insights: 'Please configure your GEMINI_API_KEY in the .env file to enable this feature.',
            };
        }

        // Fetch logs from the last 24 hours to generate the summary
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentLogs = await dbService.getProductionLogs({ startDate: twentyFourHoursAgo });

        if (!recentLogs || recentLogs.length === 0) {
            return {
                id: 'no-data-summary',
                date: new Date().toISOString(),
                summary: 'No production activities were logged in the last 24 hours.',
                insights: 'Start logging activities to see a summary here.',
            };
        }
        
        // Calculate totals server-side for accuracy
        let totalRcnIntakeKg = 0;
        let totalFinishedGoodsKg = 0;
        let totalDispatchedKg = 0;

        for (const log of recentLogs) {
            if (log.stage_name === 'RCN Intake' && log.net_weight_kg) {
                totalRcnIntakeKg += log.net_weight_kg;
            }
            if (log.stage_name === 'Packaging' && log.packed_items) {
                totalFinishedGoodsKg += log.packed_items.reduce((sum: number, item: any) => sum + (item.number_of_packs * PACKAGE_WEIGHT_KG), 0);
            }
            if (log.stage_name === 'Goods Dispatched' && log.dispatched_items) {
                totalDispatchedKg += log.dispatched_items.reduce((sum: number, item: any) => sum + (item.unit === 'kg' ? item.quantity : 0), 0);
            }
        }

        // Call the Genkit flow with the fetched logs and pre-calculated totals
        const aiResponse = await dailySummaryFlow({
            productionLogs: recentLogs,
            totalRcnIntakeKg,
            totalFinishedGoodsKg,
            totalDispatchedKg,
        });
        
        const summary = {
            id: `ai-summary-${Date.now()}`,
            date: new Date().toISOString(),
            ...aiResponse,
        };
        
        // Cache the new summary
        cachedSummary = summary;
        lastCacheTimestamp = new Date();

        return summary;

    } catch (error) {
        console.error("Error generating AI summary:", error);
        // Return a friendly error to be displayed in the UI
        throw new Error(`An error occurred while contacting the AI model: ${(error as Error).message}`);
    }
}


// --- Data Fetching Actions ---

export async function getActiveRcnIntakeBatchesAction(): Promise<{ id: string; available_kg: number }[]> {
    noStore();
    try {
        return await dbService.getActiveRcnIntakeBatches();
    } catch (error) {
        console.error("Server action error in getActiveRcnIntakeBatchesAction:", error);
        throw new Error('Failed to fetch active RCN batches.');
    }
}

export async function getActiveRcnForSizingBatchesAction(): Promise<InventoryItem[]> {
    noStore();
    try {
        return await dbService.getActiveRcnForSizingBatches();
    } catch (error) {
        console.error("Server action error in getActiveRcnForSizingBatchesAction:", error);
        throw new Error('Failed to fetch active RCN for sizing batches.');
    }
}

export async function getActiveVacuumBagBatchesAction(): Promise<InventoryItem[]> {
    noStore();
    try {
      return await dbService.getActiveVacuumBagBatches();
    } catch (error) {
      console.error('Error in getActiveVacuumBagBatchesAction:', error);
      throw new Error(`Failed to fetch active vacuum bag batches: ${(error as Error).message}`);
    }
}

export async function getVacuumBagTraceabilityReportAction(): Promise<VacuumBagBatch[]> {
    noStore();
    try {
      return await dbService.getVacuumBagTraceabilityReport();
    } catch (error) {
      console.error("Error in getVacuumBagTraceabilityReportAction:", error);
      throw new Error(`Failed to generate vacuum bag traceability report: ${(error as Error).message}`);
    }
}



export async function getReportDataAction(filters: ReportFilterState): Promise<ReportDataPayload> {
    noStore();
    try {
        let logs = await dbService.getProductionLogs(filters);

        // Filter by reportType if provided
        if (filters.reportType && filters.reportType !== 'all') {
            const productionStages = ['Steaming Process', 'Shelling Process', 'Drying Process', 'Peeling Process', 'Machine Grading', 'Manual Peeling Refinement', 'Packaging'];
            const inventoryStages = ['RCN Intake', 'Other Materials Intake', 'Goods Dispatched', 'RCN Output to Factory', 'RCN Sizing & Calibration', 'Vacuum Bag Intake', 'Vacuum Bag Wastage'];
            
            if (filters.reportType === 'production') {
                logs = logs.filter(log => productionStages.includes(log.stage_name));
            } else if (filters.reportType === 'inventory') {
                logs = logs.filter(log => inventoryStages.includes(log.stage_name));
            } else if (filters.reportType === 'packaging') {
                logs = logs.filter(log => log.stage_name === 'Packaging');
            }
        }


        const totals = {
            totalGoodsReceivedKg: 0,
            totalGoodsDispatchedKg: 0,
            totalFinishedGoodsProducedKg: 0,
        };

        const itemWiseSummaryMap = new Map<string, { item: string, received: number, dispatched: number, produced: number, unit: string }>();
        
        const ensureItem = (name: string, unit: string) => {
            if (!itemWiseSummaryMap.has(name)) {
                itemWiseSummaryMap.set(name, { item: name, received: 0, dispatched: 0, produced: 0, unit });
            }
            return itemWiseSummaryMap.get(name)!;
        };

        for (const log of logs) {
            switch (log.stage_name) {
                case 'RCN Intake':
                    const netWeightRCN = log.net_weight_kg || ((log.gross_weight_kg || 0) - (log.tare_weight_kg || 0));
                    if (netWeightRCN) {
                        totals.totalGoodsReceivedKg += netWeightRCN;
                        const item = ensureItem(RAW_CASHEW_NUTS_NAME, 'kg');
                        item.received += netWeightRCN;
                    }
                    break;
                case 'Other Materials Intake':
                case 'Vacuum Bag Intake':
                    const resolvedItemName = log.resolved_item_name || log.item_name || (log.batchId ? `V-Bags: ${log.batchId}` : 'Unknown Item');
                    if (log.transaction_type === 'intake' && resolvedItemName && log.quantity) {
                       const item = ensureItem(resolvedItemName, log.unit || 'units');
                       item.received += log.quantity;
                       if (log.unit?.toLowerCase() === 'kg') {
                           totals.totalGoodsReceivedKg += log.quantity;
                       }
                    }
                    break;
                case 'Goods Dispatched':
                     if (log.dispatch_category === 'Finished Goods' && log.dispatched_items && Array.isArray(log.dispatched_items)) {
                        for (const dispatchedItem of log.dispatched_items) {
                             if (dispatchedItem.item_name && dispatchedItem.quantity && dispatchedItem.unit.toLowerCase() === 'kg') {
                                totals.totalGoodsDispatchedKg += dispatchedItem.quantity;
                                const item = ensureItem(dispatchedItem.item_name, dispatchedItem.unit);
                                item.dispatched += dispatchedItem.quantity;
                            }
                        }
                    } else if (log.dispatch_category === 'By-Products / Waste' && log.item_name && log.gross_weight_kg) { // Handle By-Products
                        const netWeightDispatch = log.gross_weight_kg - (log.tare_weight_kg || 0);
                        totals.totalGoodsDispatchedKg += netWeightDispatch;
                        const item = ensureItem(log.item_name, 'kg');
                        item.dispatched += netWeightDispatch;
                    }
                    break;
                case 'Packaging':
                    if (log.packed_items && Array.isArray(log.packed_items)) {
                        for (const packedItem of log.packed_items) {
                            const producedKg = (packedItem.number_of_packs || 0) * PACKAGE_WEIGHT_KG;
                            if (producedKg > 0) {
                                totals.totalFinishedGoodsProducedKg += producedKg;
                                const item = ensureItem(packedItem.kernel_grade, 'kg');
                                item.produced += producedKg;
                            }
                        }
                    }
                    break;
            }
        }

        return {
            totals: {
                totalGoodsReceived: totals.totalGoodsReceivedKg,
                totalGoodsDispatched: totals.totalGoodsDispatchedKg,
                totalProductionOutput: totals.totalFinishedGoodsProducedKg,
                netInventoryChange: totals.totalGoodsReceivedKg - totals.totalGoodsDispatchedKg,
                unit: 'kg'
            },
            itemWiseSummary: Array.from(itemWiseSummaryMap.values()),
            productionLogs: logs
        };
    } catch (error) {
        console.error("Error generating report:", error);
        throw new Error("Could not generate report data from the database.");
    }
}


export async function getInventoryLogsAction(): Promise<InventoryLog[]> {
 noStore();
    try {
 const logs = await dbService.getLatestLogs(100); // Get latest 100 logs
 console.log("[ACTION] Fetched inventory logs:", logs.length);
 return logs;
    } catch (error) {
 console.error("Server action error in getInventoryLogsAction:", error);
 throw new Error('Failed to fetch inventory logs: ' + (error as Error).message);
    }
}

export async function getAllInventoryItemsAction(): Promise<InventoryItem[]> {
 noStore();
    try {
 const items = await dbService.getAllInventoryItems();
 console.log("[ACTION] Fetched all inventory items:", items.length);
 return items;
    } catch (error) {
 console.error("Server action error in getAllInventoryItemsAction:", error);
 throw new Error('Failed to fetch inventory items: ' + (error as Error).message);
    }
}

export async function getFinishedGoodsStockAction() {
    noStore();
    try {
        const stock = await dbService.getInventoryItemsByCategory('Finished Goods');
        return stock || [];
    } catch (error) {
        console.error("Server action error in getFinishedGoodsStockAction:", error);
        throw new Error('Failed to fetch finished goods stock.');
    }
}

const getMetricTrendAndChange = async (itemName: string, days: number = 7) => {
    const historicalData = await dbService.getHistoricalInventoryData(itemName, days);
    
    const trend = historicalData.map(d => ({ date: format(new Date(d.date), 'MM/dd'), value: d.quantity }));
    
    let change = 0;
    const current = historicalData[historicalData.length - 1]?.quantity || 0;
    const previous = historicalData[historicalData.length - 2]?.quantity;
    
    if (previous !== undefined && previous !== 0) {
        change = ((current - previous) / previous) * 100;
    } else if (previous === 0 && current > 0) {
        change = 100; // Indicate a significant increase from zero
    }
    
    return { trend, change, current };
};


export async function getDashboardMetricsAction(): Promise<DashboardMetrics> {
    noStore();
    try {
        const allInventoryItems = await dbService.getAllInventoryItems();
        const inventoryMap = new Map(allInventoryItems.map(item => [item.name, item]));

        // RCN Stock
        const rcnStockData = await getMetricTrendAndChange(RAW_CASHEW_NUTS_NAME);
        const rcnStockTonnes = rcnStockData.current / 1000;
        const sufficiencyDays = DAILY_PRODUCTION_TARGET_TONNES > 0 ? rcnStockTonnes / DAILY_PRODUCTION_TARGET_TONNES : Infinity;
        let rcnStockSufficiency = `Sufficient for ~${sufficiencyDays.toFixed(1)} days`;
        if (sufficiencyDays === Infinity) rcnStockSufficiency = `Production target not set`;
        else if (sufficiencyDays < 1) rcnStockSufficiency = `Warning: Less than 1 day of stock!`;
        else if (sufficiencyDays < 3) rcnStockSufficiency = `Alert: Stock for only ~${sufficiencyDays.toFixed(1)} days.`;

        // Packaging Stock
        const vacuumBagsData = await getMetricTrendAndChange(VACUUM_BAGS_NAME);
        const whiteBoxesData = await getMetricTrendAndChange(WHITE_PLAIN_BOXES_NAME);
        const paintedBoxesData = await getMetricTrendAndChange(PAINTED_LOGO_BOXES_NAME);

        const packagingStock = {
            vacuumBags: vacuumBagsData,
            boxes: {
                whitePlain: whiteBoxesData.current,
                paintedLogo: paintedBoxesData.current,
                change: (whiteBoxesData.change + paintedBoxesData.change) / 2, // Simple average change
                trend: whiteBoxesData.trend.map((d, i) => ({ date: d.date, value: d.value + (paintedBoxesData.trend[i]?.value || 0) }))
            }
        };

        // Other Materials
        const otherMaterials = allInventoryItems.filter(item => item.category === 'Other Materials' && ![VACUUM_BAGS_NAME, WHITE_PLAIN_BOXES_NAME, PAINTED_LOGO_BOXES_NAME].includes(item.name));
        const otherMaterialsCount = otherMaterials.length;

        // Alerts
        const alerts: string[] = [];
        if (sufficiencyDays < 3 && sufficiencyDays !== Infinity) alerts.push('RCN stock is critically low.');
        if (packagingStock.boxes.whitePlain < 500) alerts.push('White plain box stock is low.');
        if (packagingStock.boxes.paintedLogo < 500) alerts.push('Painted logo box stock is low.');
        if (packagingStock.vacuumBags.current < 2000) alerts.push('Vacuum bag stock is low.');

        return {
            rcnStock: {
                current: rcnStockTonnes,
                sufficiencyMessage: rcnStockSufficiency,
                trend: rcnStockData.trend,
                change: rcnStockData.change
            },
            packagingStock,
            otherMaterialsStock: {
                current: otherMaterialsCount,
                // Placeholder for change and trend, as this is a count not a quantity
                change: 0, 
                trend: []
            },
            alerts,
        };

    } catch (error) {
        console.error("Error in getDashboardMetricsAction:", error);
        throw new Error("Failed to fetch dashboard metrics.");
    }
}



// --- FORM SAVE ACTIONS (Connected to the database service) ---

export async function saveRcnWarehouseTransactionAction(data: RcnIntakeEntry | RcnOutputToFactoryEntry) {
    if (data.transaction_type === 'intake') {
        const netWeight = data.gross_weight_kg - (data.tare_weight_kg || 0);
        
        const logResult = await dbService.saveProductionLog({ ...data, stage_name: 'RCN Intake', net_weight_kg: netWeight });
        const notes = `Intake from supplier: ${data.supplier_id}. Log ID: [${logResult.id}].`;
        
        // This is the only action. Add to main RCN stock.
        await dbService.findAndUpdateOrCreate(RAW_CASHEW_NUTS_NAME, 'Raw Materials', netWeight, 'kg', notes, 'add');

        return { success: true, id: logResult.id };
    }
    
    if (data.transaction_type === 'output') {
        const totalOutputWeight = data.output_batches.reduce((sum, b) => sum + b.weight_kg, 0);
        
        const logResult = await dbService.saveProductionLog({ ...data, stage_name: 'RCN Output to Factory' });
        const batch = dbService.getBatch();
        
        // Deduct from the main RCN stock
        await dbService.findAndUpdateOrCreate(RAW_CASHEW_NUTS_NAME, 'Raw Materials', -totalOutputWeight, 'kg', `Transfer to factory for batches: ${data.output_batches.map(b => b.id).join(', ')}`, 'remove', batch);
        
        const notes = `Internal Transfer from Warehouse. Source Batch: ${data.linked_rcn_intake_batch_id}.`;
        
        // Add to the new in-process goods item
        await dbService.findAndUpdateOrCreate(RCN_FOR_SIZING_NAME, 'In-Process Goods', totalOutputWeight, 'kg', notes, 'add', batch, { type: 'rcn_for_sizing' });
        
        await batch.commit();
        return { success: true, id: logResult.id };
    }
    
    console.warn("Unknown RCN transaction type:", (data as any).transaction_type);
    return { success: false, error: "Unknown transaction type." };
}

export async function updateRcnWarehouseTransactionAction(data: RcnWarehouseTransaction) {
    if (!data.id) {
        return { success: false, error: 'Log ID is missing for update.' };
    }
    return dbService.updateRcnTransaction(data.id, data);
}

export async function saveOtherMaterialsIntakeAction(data: OtherMaterialsIntakeFormValues): Promise<{ success: boolean; id?: string; error?: string, itemName?: string }> {
    const finalItemName = data.item_name === OTHER_ITEM_VALUE ? data.custom_item_name : data.item_name;

    if (!finalItemName) {
        return { success: false, error: "Item name could not be determined." };
    }
    
    // Quantity can be undefined for vacuum bag transfers, where carton ID is used instead.
    if (!data.quantity && data.item_name !== VACUUM_BAGS_NAME) {
         return { success: false, error: "Quantity is required." };
    }

    const logData = { ...data, resolved_item_name: finalItemName };
    const logResult = await dbService.saveProductionLog({ ...logData, stage_name: 'Other Materials Intake' });
    if (!logResult.success) {
        return logResult;
    }

    let result;
    if (data.transaction_type === 'transfer') {
        if (data.item_name === VACUUM_BAGS_NAME && data.carton_id) {
            // Special handling for transferring a full carton of vacuum bags
            const notes = `Internal transfer of full carton ${data.carton_id} to ${data.destination_section}. Ref ID: ${data.intake_batch_id || 'N/A'}. Notes: ${data.notes || 'No notes'}`;
            // Deduct from the specific carton inventory item
            result = await dbService.findAndUpdateOrCreate(data.carton_id, 'Other Materials', -VACUUM_BAGS_CARTON_QTY, 'bags', notes, 'remove');
        } else if (data.quantity) {
             const notes = `Internal transfer to production section: ${data.destination_section}. Ref ID: ${data.intake_batch_id || 'N/A'}. Notes: ${data.notes || 'No notes'}`;
             const quantityChange = -Math.abs(data.quantity);
             result = await dbService.findAndUpdateOrCreate(finalItemName, 'Other Materials', quantityChange, data.unit, notes, 'remove');
        } else {
             return { success: false, error: "Transfer requires either a carton ID for bags or a quantity for other items." };
        }
    } else { // 'intake'
        const notes = `Intake from supplier: ${data.supplier_id}. Batch ID: ${data.intake_batch_id || 'N/A'}.`;
        result = await dbService.findAndUpdateOrCreate(finalItemName, 'Other Materials', data.quantity || 0, data.unit, notes, 'add');
    }
    
    return { ...result, id: logResult.id, itemName: finalItemName };
}

export async function updatePackagingLogAction(data: PackagingFormValues) {
    if (!data.id) {
        return { success: false, error: 'Log ID is missing for update.' };
    }
    return dbService.updatePackagingLog(data.id, data);
}


export async function saveGoodsDispatchedAction(data: GoodsDispatchedFormValues) {
    try {
        let allNotes = `Dispatch to: ${data.destination}. Type: ${data.dispatch_type || 'N/A'}. Ref ID: ${data.dispatch_batch_id || 'N/A'}. Notes: ${data.notes || 'No notes'}.`;

        const primaryResult = await dbService.saveProductionLog({ ...data, notes: allNotes, stage_name: 'Goods Dispatched' });
        
        const inventoryBatch = dbService.getBatch();

        if (data.dispatch_category === 'Finished Goods') {
            for (const item of data.dispatched_items) {
                await dbService.findAndUpdateOrCreate(item.item_name, 'Finished Goods', -item.quantity, item.unit, allNotes, 'remove', inventoryBatch);
            }
        } else if (data.dispatch_category === 'By-Products / Waste') {
            const netWeight = data.gross_weight_kg - (data.tare_weight_kg || 0);
            await dbService.findAndUpdateOrCreate(data.item_name, 'By-Products', -netWeight, 'kg', allNotes, 'remove', inventoryBatch);
        } else {
            return { success: false, error: "Invalid dispatch category." };
        }
        
        await inventoryBatch.commit();

        return { success: true, id: primaryResult.id };
    } catch (error) {
        console.error("Error in saveGoodsDispatchedAction:", error);
        return { success: false, error: (error as Error).message };
    }
}


export async function savePackagingAction(data: PackagingFormValues) {
    try {
        // --- 1. Fetch all required inventory items in one go ---
        const cartonItemName = `${VACUUM_BAGS_BASE_NAME} - Carton ${data.vacuum_bag_carton_id}`;
        const itemNamesToFetch = new Set<string>([PEELED_KERNELS_FOR_PACKAGING_NAME, cartonItemName]);
        
        if (data.box_type) {
            itemNamesToFetch.add(data.box_type);
        }
        
        data.packed_items.forEach(item => {
            const finishedGoodsName = `${item.kernel_grade} (Lot: ${data.linked_lot_number})`;
            itemNamesToFetch.add(finishedGoodsName);
        });
        
        const inventoryMap = await dbService.getMultipleInventoryItemsByNames(Array.from(itemNamesToFetch));

        // --- 2. Start a single batch for all writes ---
        const batch = dbService.getBatch();
        const primaryResult = await dbService.saveProductionLog({ ...data, stage_name: 'Packaging' }, data.id);
        
        let totalKernelsConsumedKg = 0;
        let totalPacks = 0;
        
        // --- 3. Process all updates within the batch ---

        for (const item of data.packed_items) {
            const weightForGrade = item.number_of_packs * PACKAGE_WEIGHT_KG;
            const finishedGoodsName = `${item.kernel_grade} (Lot: ${data.linked_lot_number})`;
            await dbService.findAndUpdateOrCreate(finishedGoodsName, 'Finished Goods', weightForGrade, 'kg', `Packed from lot ${data.linked_lot_number}`, 'add', batch, { existingItems: inventoryMap });
            totalKernelsConsumedKg += weightForGrade;
            totalPacks += item.number_of_packs;
        }

        if (totalKernelsConsumedKg > 0) {
            await dbService.findAndUpdateOrCreate(PEELED_KERNELS_FOR_PACKAGING_NAME, 'In-Process Goods', -totalKernelsConsumedKg, 'kg', `Consumed in packaging log: ${primaryResult.id}`, 'remove', batch, { existingItems: inventoryMap });
        }
        
        const bagsToDeduct = totalPacks + (data.wasted_bags || 0);
        if (bagsToDeduct > 0 && data.vacuum_bag_carton_id) {
             const notes = `Consumed in packaging log: ${primaryResult.id}. Used: ${totalPacks}, Wasted: ${data.wasted_bags || 0}`;
             await dbService.findAndUpdateOrCreate(cartonItemName, 'Other Materials', -bagsToDeduct, 'bags', notes, 'remove', batch, { type: 'vacuum_bag_carton', existingItems: inventoryMap });
        }
        
        if (data.box_type && totalPacks > 0) {
             await dbService.findAndUpdateOrCreate(data.box_type, 'Other Materials', -totalPacks, 'boxes', `Consumed in packaging log: ${primaryResult.id}`, 'remove', batch, { existingItems: inventoryMap });
        }
        
        // --- 4. Commit the batch ---
        await batch.commit();

        return { ...primaryResult };
    } catch (error) {
        console.error("Error saving packaging:", error);
        return { success: false, error: (error as Error).message };
    }
}

export async function saveSteamingProcessAction(data: SteamingProcessFormValues) {
    try {
        const primaryResult = await dbService.saveProductionLog({ ...data, stage_name: 'Steaming Process' });
        
        const batch = dbService.getBatch();
        await dbService.findAndUpdateOrCreate(data.linked_intake_batch_id, 'In-Process Goods', -data.weight_before_steam_kg, 'kg', `Consumed in steam batch: ${data.steam_batch_id}`, 'remove', batch);
        
        if (data.weight_after_steam_kg && data.weight_after_steam_kg > 0) {
            const notes = `Produced from Factory Batch ${data.linked_intake_batch_id}.`;
            await dbService.findAndUpdateOrCreate(data.steam_batch_id, 'In-Process Goods', data.weight_after_steam_kg, 'kg', notes, 'add', batch, { type: 'steamed_rcn' });
        }
        await batch.commit();

        return { success: true, id: primaryResult.id };
    } catch (error) {
        console.error("Error saving steaming process:", error);
        return { success: false, error: (error as Error).message };
    }
}

export async function saveShellingProcessAction(data: ShellingProcessFormValues) {
    const result = await dbService.saveProductionLog({ ...data, stage_name: 'Shelling Process' });
    if (!result.success) return { ...result };

    try {
        const batch = dbService.getBatch();
        await dbService.findAndUpdateOrCreate(data.linked_steam_batch_id, 'In-Process Goods', -data.steamed_weight_input_kg, 'kg', `Consumed in shelling lot: ${data.lot_number}`, 'remove', batch);

        if (data.shelled_kernels_weight_kg > 0) {
            await dbService.findAndUpdateOrCreate(SHELLED_KERNELS_FOR_DRYING_NAME, 'In-Process Goods', data.shelled_kernels_weight_kg, 'kg', `Produced from steam batch ${data.linked_steam_batch_id}`, 'add', batch);
        }

        if (data.shell_waste_weight_kg && data.shell_waste_weight_kg > 0) {
            await dbService.findAndUpdateOrCreate(CNS_SHELL_WASTE_NAME, 'By-Products', data.shell_waste_weight_kg, 'kg', `Waste from shelling lot: ${data.lot_number}`, 'add', batch);
        }
        await batch.commit();
        return { success: true, id: result.id };
    } catch (error) {
        console.error("Error saving shelling process inventory:", error);
        return { success: false, id: result.id, error: (error as Error).message };
    }
}

export async function saveDryingProcessAction(data: DryingProcessFormValues) {
    const result = await dbService.saveProductionLog({ ...data, stage_name: 'Drying Process' });
    if (!result.success) return { ...result };

    try {
        const batch = dbService.getBatch();
        await dbService.findAndUpdateOrCreate(SHELLED_KERNELS_FOR_DRYING_NAME, 'In-Process Goods', -data.wet_kernel_weight_kg, 'kg', `Consumed in drying log: ${result.id}`, 'remove', batch);
        
        if (data.dry_kernel_weight_kg && data.dry_kernel_weight_kg > 0) {
            await dbService.findAndUpdateOrCreate(DRIED_KERNELS_FOR_PEELING_NAME, 'In-Process Goods', data.dry_kernel_weight_kg, 'kg', `Produced from shelled lot ${data.linked_lot_number}`, 'add', batch);
        }
        await batch.commit();
        return { success: true, id: result.id };
    } catch (error) {
        console.error("Error saving drying process inventory:", error);
        return { success: false, id: result.id, error: (error as Error).message };
    }
}

export async function savePeelingProcessAction(data: PeelingProcessFormValues) {
    try {
        const primaryResult = await dbService.saveProductionLog({ ...data, stage_name: 'Peeling Process' });

        const batch = dbService.getBatch();
        await dbService.findAndUpdateOrCreate(DRIED_KERNELS_FOR_PEELING_NAME, 'In-Process Goods', -data.dried_kernel_input_kg, 'kg', `Consumed in peeling log: ${primaryResult.id}`, 'remove', batch);
        
        if (data.peeled_kernels_kg && data.peeled_kernels_kg > 0) {
            await dbService.findAndUpdateOrCreate(PEELED_KERNELS_FOR_GRADING_NAME, 'In-Process Goods', data.peeled_kernels_kg, 'kg', `Peeled kernels from dried lot: ${data.linked_lot_number}`, 'add', batch);
        }

        if (data.peel_waste_kg && data.peel_waste_kg > 0) {
             await dbService.findAndUpdateOrCreate(TESTA_PEEL_WASTE_NAME, 'By-Products', data.peel_waste_kg, 'kg', `Waste from peeling lot: ${primaryResult.id}`, 'add', batch);
        }

        await batch.commit();
        return { ...primaryResult };
    } catch (error) {
        console.error("Error saving peeling process:", error);
        return { success: false, error: (error as Error).message };
    }
}

export async function saveCalibrationLogAction(data: CalibrationFormValues) {
    return dbService.saveProductionLog({ ...data, stage_name: 'Equipment Calibration' });
}

export async function saveRcnSizingAction(data: RcnSizingCalibrationFormValues) {
    const logResult = await dbService.saveProductionLog({ ...data, stage_name: 'RCN Sizing & Calibration' });
 if (!logResult.success) {
 return logResult;
    }
 return dbService.findAndUpdateOrCreate(RCN_FOR_SIZING_NAME, 'In-Process Goods', -data.input_weight_kg, 'kg', `Consumed in sizing batch: ${data.sizing_batch_id}`, 'remove');
}

export async function saveRcnQualityAssessmentAction(data: RcnQualityAssessmentFormValues) {
    return dbService.saveProductionLog({ ...data, stage_name: 'RCN Quality Assessment' });
}

export async function saveMachineGradingAction(data: MachineGradingFormValues) {
    const result = await dbService.saveProductionLog({ ...data, stage_name: 'Machine Grading' });
    if (!result.success) return { ...result };

    try {
        const batch = dbService.getBatch();
        // Consume the input from the peeling stage
        await dbService.findAndUpdateOrCreate(PEELED_KERNELS_FOR_GRADING_NAME, 'In-Process Goods', -data.peeled_input_kg, 'kg', `Consumed in grading lot: ${data.linked_lot_number}`, 'remove', batch);
        
        // Produce the output for the next stage (manual refinement)
        const totalOutput = data.detailed_size_distribution?.reduce((sum, grade) => sum + grade.weight_kg, 0) || 0;
        if (totalOutput > 0) {
            await dbService.findAndUpdateOrCreate(GRADED_KERNELS_FOR_REFINEMENT_NAME, 'In-Process Goods', totalOutput, 'kg', `Produced from grading lot ${data.linked_lot_number}`, 'add', batch);
        }

        await batch.commit();
        return { success: true, id: result.id };
    } catch (error) {
        console.error("Error saving machine grading inventory:", error);
        return { success: false, id: result.id, error: (error as Error).message };
    }
}

export async function saveManualPeelingRefinementAction(data: ManualPeelingRefinementFormValues) {
    const result = await dbService.saveProductionLog({ ...data, stage_name: 'Manual Peeling Refinement' });
    if (!result.success) return { ...result };

    try {
        const batch = dbService.getBatch();
        // Consume the input from the grading stage
        await dbService.findAndUpdateOrCreate(GRADED_KERNELS_FOR_REFINEMENT_NAME, 'In-Process Goods', -data.input_kg, 'kg', `Consumed in manual peeling lot: ${data.linked_lot_number}`, 'remove', batch);
        
        // Produce the final output ready for packaging
        if (data.peeled_kg && data.peeled_kg > 0) {
            await dbService.findAndUpdateOrCreate(PEELED_KERNELS_FOR_PACKAGING_NAME, 'In-Process Goods', data.peeled_kg, 'kg', `Produced from manual peeling lot ${data.linked_lot_number}`, 'add', batch);
        }
        
        // Account for any additional waste
        if(data.waste_kg && data.waste_kg > 0) {
            await dbService.findAndUpdateOrCreate(TESTA_PEEL_WASTE_NAME, 'By-Products', data.waste_kg, 'kg', `Waste from manual peeling lot: ${data.linked_lot_number}`, 'add', batch);
        }

        await batch.commit();
        return { success: true, id: result.id };
    } catch (error) {
        console.error("Error saving manual peeling inventory:", error);
        return { success: false, id: result.id, error: (error as Error).message };
    }
}

export async function saveQualityControlFinalAction(data: QualityControlFinalFormValues) {
    return dbService.saveProductionLog({ ...data, stage_name: 'Quality Control (Final)' });
}

export async function saveVacuumBagIntakeAction(data: VacuumBagIntakeFormValues): Promise<{ success: boolean; id?: string; error?: string }> {
  const newShipmentId = await dbService.generateNextBatchId('VBInt-BATCH', data.receiptDate);
  const dataWithId = { ...data, shipmentId: newShipmentId };
  return dbService.handleVacuumBagIntake(dataWithId);
}

export async function saveVacuumBagWastageAction(data: VacuumBagWastageFormValues) {
    return dbService.handleVacuumBagWastage(data);
}

// --- Other Actions ---

export async function getTraceabilityReportAction(request: TraceabilityFlowRequest): Promise<TraceabilityFlowOutput> {
  noStore();
  try {
    // This now directly calls the AI flow
    return await getTraceabilityReport(request);
  } catch (error) {
    console.error("Error in getTraceabilityReportAction:", error);
    throw new Error(`Failed to generate traceability report: ${(error as Error).message}`);
  }
}

export async function isEmailServiceConfiguredAction(): Promise<boolean> {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL;
  return !!(apiKey && fromEmail && !apiKey.startsWith("YOUR") && !fromEmail.startsWith("your"));
}

export async function getNotificationSettingsAction(): Promise<NotificationSettings> {
  // This is a placeholder. In a real app, you would fetch these from Firestore.
  return Promise.resolve({ dailySummaryEmailEnabled: false, recipientEmail: '' });
}

export async function saveNotificationSettingsAction(settings: NotificationSettings): Promise<{ success: boolean; error?: string }> {
  // This is a placeholder. In a real app, you would save these to Firestore.
  console.log("Saving notification settings (mock):", settings);
  return Promise.resolve({ success: true });
}

export async function handleDataManagementAction(params: { action: 'delete-test-data', username: string } | { action: 'export-csv' } | { action: 'reset-vacuum-bags'}): Promise<{count?: number, csv?: string}> {
    noStore();
    if (params.action === 'delete-test-data') {
        const count = await dbService.undoProductionLogsByUser(params.username);
        return { count };
    }
    
    if (params.action === 'export-csv') {
        const csv = await dbService.exportProductionLogsToCSV();
        return { csv };
    }
    
    if (params.action === 'reset-vacuum-bags') {
        const count = await dbService.resetVacuumBagInventory();
        return { count };
    }


    throw new Error('Invalid data management action');
}

export async function deleteProductionLogAction(logId: string): Promise<{ success: boolean; error?: string }> {
    noStore();
    try {
        return await dbService.deleteProductionLogAndReverseTransactions(logId);
    } catch (error) {
        console.error(`Error deleting log ID ${logId}:`, error);
        return { success: false, error: (error as Error).message };
    }
}


export async function deleteVacuumBagShipmentAction(shipmentId: string): Promise<{ success: boolean; error?: string }> {
    noStore();
    try {
        return await dbService.deleteVacuumBagShipment(shipmentId);
    } catch (error) {
        console.error(`Error deleting shipment ID ${shipmentId}:`, error);
        return { success: false, error: (error as Error).message };
    }
}
