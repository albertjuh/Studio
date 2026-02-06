
'use server';

import { InventoryDataService } from '@/lib/database-service';
import type {
  ReportDataPayload,
  RcnIntakeEntry,
  GoodsDispatchedFormValues,
  PackagingFormValues,
  RcnQualityAssessmentFormValues,
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
import { PACKAGING_BOXES_NAME, VACUUM_BAGS_NAME, PEELED_KERNELS_FOR_PACKAGING_NAME, RCN_FOR_SIZING_NAME, RAW_CASHEW_NUTS_NAME, PACKAGE_WEIGHT_KG, WHITE_PLAIN_BOXES_NAME, PAINTED_LOGO_BOXES_NAME, VACUUM_BAGS_BASE_NAME, VACUUM_BAGS_CARTON_QTY } from "./constants";
import { dailySummaryFlow } from '@/ai/flows/daily-ai-summary';
import { getTraceabilityReport } from '@/ai/flows/traceability-flow';
import { unstable_noStore as noStore } from 'next/cache';
import { subDays, format } from 'date-fns';
import { clearNyangaReportsAction } from './nyanga-actions';

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
            const productionStages = ['Packaging'];
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


export async function getDashboardMetricsAction(): Promise<DashboardMetrics> {
    noStore();
    try {
        const rcnStockItem = await dbService.getInventoryItemByName(RAW_CASHEW_NUTS_NAME);
        const allOtherMaterials = await dbService.getInventoryItemsByCategory('Other Materials');
        
        const rcnStockKg = rcnStockItem?.quantity || 0;
        const rcnStockTonnes = rcnStockKg / 1000;
        const sufficiencyDays = DAILY_PRODUCTION_TARGET_TONNES > 0 ? rcnStockTonnes / DAILY_PRODUCTION_TARGET_TONNES : Infinity;
        
        let sufficiencyMessage = `Sufficient for ~${sufficiencyDays.toFixed(1)} days`;
        if (sufficiencyDays === Infinity) {
            sufficiencyMessage = 'Production target not set';
        } else if (sufficiencyDays < 1) {
            sufficiencyMessage = `Warning: Less than 1 day of stock!`;
        } else if (sufficiencyDays < 3) {
            sufficiencyMessage = `Alert: Stock for only ~${sufficiencyDays.toFixed(1)} days.`;
        }

        const allBoxes = allOtherMaterials.filter(item => item.name.toLowerCase().endsWith('boxes'));
        const totalBoxes = allBoxes.reduce((sum, item) => sum + item.quantity, 0);

        const vacuumBagsItem = allOtherMaterials.find(item => item.name === VACUUM_BAGS_NAME);
        const vacuumBagQuantity = vacuumBagsItem?.quantity || 0;

        const packagingStock = {
            boxes: totalBoxes,
            vacuumBags: Math.max(0, vacuumBagQuantity),
            allBoxes: allBoxes,
        };
        
        const otherMaterialsCount = allOtherMaterials.filter(item => !item.name.toLowerCase().includes('box') && item.name !== VACUUM_BAGS_NAME).length;

        const alerts: string[] = [];
        if (sufficiencyDays < 3 && sufficiencyDays !== Infinity) alerts.push('RCN stock is critically low.');
        if (packagingStock.boxes < 500) alerts.push('Packaging box stock is low.');
        if (packagingStock.vacuumBags < 2000) alerts.push('Vacuum bag stock is low.');


        return {
            rcnStock: {
                current: rcnStockTonnes,
                sufficiencyMessage: sufficiencyMessage
            },
            packagingStock,
            otherMaterialsStock: {
                current: otherMaterialsCount,
            },
            alerts
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

export async function updateRcnTransactionAction(data: RcnWarehouseTransaction) {
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
            const cartonItemName = `${VACUUM_BAGS_BASE_NAME} - Carton ${data.carton_id}`;
            const notes = `Internal transfer of full carton ${data.carton_id} to ${data.destination_section}. Ref ID: ${data.intake_batch_id || 'N/A'}. Notes: ${data.notes || 'No notes'}`;
            result = await dbService.findAndUpdateOrCreate(cartonItemName, 'Other Materials', -VACUUM_BAGS_CARTON_QTY, 'bags', notes, 'remove');
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


export async function saveVacuumBagIntakeAction(data: VacuumBagIntakeFormValues): Promise<{ success: boolean; id?: string; error?: string }> {
  const newShipmentId = await dbService.generateNextBatchId('VBInt-BATCH', data.receiptDate);
  const dataWithId = { ...data, shipmentId: newShipmentId };
  return dbService.handleVacuumBagIntake(dataWithId);
}

export async function saveVacuumBagWastageAction(data: VacuumBagWastageFormValues) {
    return dbService.handleVacuumBagWastage(data);
}

export async function savePackagingAction(data: PackagingFormValues) {
  return dbService.handlePackaging(data);
}


// --- Other Actions ---

export async function getTraceabilityReportAction(request: TraceabilityFlowRequest): Promise<TraceabilityFlowOutput> {
  noStore();
  try {
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

export async function handleDataManagementAction(params: { action: 'delete-test-data', username: string } | { action: 'export-csv' } | { action: 'reset-vacuum-bags'} | { action: 'clear-nyanga-reports' }): Promise<{count?: number, csv?: string}> {
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

    if (params.action === 'clear-nyanga-reports') {
        const { count } = await clearNyangaReportsAction();
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

export async function getSystemStatusAction(): Promise<{ firebaseAdminOK: boolean, firestoreConnectionOK: boolean, errors: string[] }> {
    noStore();
    const errors: string[] = [];
    let firebaseAdminOK = false;
    let firestoreConnectionOK = false;

    // 1. Check Firebase Admin SDK initialization
    try {
        // This will throw if env vars are missing during module load
        const { adminApp } = await import('./firebase/admin');
        if (adminApp.name) {
            firebaseAdminOK = true;
        } else {
             throw new Error("Firebase Admin App is not named, indicating an initialization issue.");
        }
    } catch (error: any) {
        errors.push(`Firebase Admin SDK Initialization Failed: ${error.message}`);
        return { firebaseAdminOK, firestoreConnectionOK, errors };
    }

    // 2. Check Firestore connection with a simple read
    if (firebaseAdminOK) {
        try {
            const dbService = InventoryDataService.getInstance();
            await dbService.checkFirestoreConnection();
            firestoreConnectionOK = true;
        } catch (error: any) {
             errors.push(`Firestore Connection Failed: ${error.message}`);
        }
    }

    return { firebaseAdminOK, firestoreConnectionOK, errors };
}
    
