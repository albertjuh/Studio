

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
  TraceabilityRequest,
  TraceabilityResult,
  InventoryLog,
  InventoryItem,
} from "@/types";
import { PACKAGING_BOXES_NAME, VACUUM_BAGS_NAME, PEELED_KERNELS_FOR_PACKAGING_NAME, RCN_FOR_STEAMING_NAME, SHELLED_KERNELS_FOR_DRYING_NAME, DRIED_KERNELS_FOR_PEELING_NAME, RAW_CASHEW_NUTS_NAME, CNS_SHELL_WASTE_NAME, TESTA_PEEL_WASTE_NAME, PACKAGE_WEIGHT_KG, WHITE_PLAIN_BOXES_NAME, PAINTED_LOGO_BOXES_NAME } from "./constants";
import { dailySummaryFlow } from '@/ai/flows/daily-ai-summary';

const dbService = InventoryDataService.getInstance();
const DAILY_PRODUCTION_TARGET_TONNES = 20;
const OTHER_ITEM_VALUE = 'Other/Uncategorized';

// --- AI Actions ---
export async function getDailyAiSummaryAction(): Promise<DailyAiSummary | null> {
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
        
        // Call the Genkit flow with the fetched logs, ensuring the format matches the input schema.
        const aiResponse = await dailySummaryFlow({ productionLogs: recentLogs });

        return {
            id: `ai-summary-${Date.now()}`,
            date: new Date().toISOString(),
            ...aiResponse,
        };

    } catch (error) {
        console.error("Error generating AI summary:", error);
        // Return a friendly error to be displayed in the UI
        return {
            id: 'error-summary',
            date: new Date().toISOString(),
            summary: 'Could not generate AI summary.',
            insights: `An error occurred while contacting the AI model: ${(error as Error).message}`,
        };
    }
}


// --- Data Fetching Actions ---

export async function getReportDataAction(filters: ReportFilterState): Promise<ReportDataPayload> {
    try {
        const logs = await dbService.getProductionLogs(filters);
        
        const totals = {
            totalGoodsReceived: 0,
            totalGoodsDispatched: 0,
            totalProductionOutput: 0,
            netInventoryChange: 0,
            unit: 'various'
        };
        const itemWiseSummaryMap = new Map<string, { item: string, received: number, dispatched: number, produced: number, unit: string }>();

        for (const log of logs) {
            // This is a simplified aggregation. A more complex report would require more detailed logic.
        }

        return {
            totals,
            itemWiseSummary: Array.from(itemWiseSummaryMap.values()),
            productionLogs: logs
        };
    } catch (error) {
        console.error("Error generating report:", error);
        throw new Error("Could not generate report data from the database.");
    }
}


export async function getInventoryLogsAction(): Promise<InventoryLog[]> {
    try {
      return await dbService.getLatestLogs(100); // Get latest 100 logs
    } catch (error) {
      console.error("Server action error in getInventoryLogsAction:", error);
      throw new Error('Failed to fetch inventory logs.');
    }
}

export async function getAllInventoryItemsAction(): Promise<InventoryItem[]> {
    try {
      return await dbService.getAllInventoryItems();
    } catch (error) {
      console.error("Server action error in getAllInventoryItemsAction:", error);
      throw new Error('Failed to fetch inventory items.');
    }
}

export async function getFinishedGoodsStockAction() {
    try {
        const stock = await dbService.getInventoryItemsByCategory('Finished Goods');
        return stock || [];
    } catch (error) {
        console.error("Server action error in getFinishedGoodsStockAction:", error);
        throw new Error('Failed to fetch finished goods stock.');
    }
}


export async function getDashboardMetricsAction() {
    try {
        const allInventoryItems = await dbService.getAllInventoryItems();
        const inventoryMap = new Map(allInventoryItems.map(item => [item.name, item]));

        const rcnItem = inventoryMap.get(RAW_CASHEW_NUTS_NAME);
        const whitePlainBoxesItem = inventoryMap.get(WHITE_PLAIN_BOXES_NAME);
        const paintedLogoBoxesItem = inventoryMap.get(PAINTED_LOGO_BOXES_NAME);
        const vacuumBagsItem = inventoryMap.get(VACUUM_BAGS_NAME);
        const rcnForSteamingItem = inventoryMap.get(RCN_FOR_STEAMING_NAME);

        const otherMaterials = allInventoryItems.filter(item =>
            item.category === 'Other Materials' &&
            item.name !== WHITE_PLAIN_BOXES_NAME &&
            item.name !== PAINTED_LOGO_BOXES_NAME &&
            item.name !== VACUUM_BAGS_NAME
        );
        const otherMaterialsCount = otherMaterials.length;
        
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
        if ((whitePlainBoxesItem?.quantity || 0) < 500) {
            alerts.push('White plain box stock is low.');
        }
        if ((paintedLogoBoxesItem?.quantity || 0) < 500) {
            alerts.push('Painted logo box stock is low.');
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
            whitePlainBoxesStock: whitePlainBoxesItem?.quantity || 0,
            paintedLogoBoxesStock: paintedLogoBoxesItem?.quantity || 0,
            vacuumBagsStock: vacuumBagsItem?.quantity || 0,
            otherMaterialsCount,
            rcnStockSufficiency,
            alerts,
        };

    } catch (error) {
        console.error("Error in getDashboardMetricsAction:", error);
        // Re-throw the error to be caught by the page's error boundary
        throw new Error("Failed to fetch dashboard metrics.");
    }
}


// --- FORM SAVE ACTIONS (Connected to the database service) ---

export async function saveRcnWarehouseTransactionAction(data: RcnIntakeEntry | RcnOutputToFactoryEntry) {
    if (data.transaction_type === 'intake') {
        const netWeight = data.gross_weight_kg - (data.tare_weight_kg || 0);
        const notes = `Intake from supplier: ${data.supplier_id}. Batch ID: ${data.intake_batch_id}.`;
        await dbService.saveProductionLog({ ...data, stage_name: 'RCN Intake', net_weight_kg: netWeight });
        return dbService.findAndUpdateOrCreate(RAW_CASHEW_NUTS_NAME, 'Raw Materials', netWeight, 'kg', notes, 'add');
    }
    
    if (data.transaction_type === 'output') {
        const notes = `Internal Transfer from Warehouse to Sizing & Calibration. Batch ID: ${data.output_batch_id}.`;
        await dbService.saveProductionLog({ ...data, stage_name: 'RCN Output to Factory' });
        await dbService.findAndUpdateOrCreate(RAW_CASHEW_NUTS_NAME, 'Raw Materials', -data.quantity_kg, 'kg', notes, 'remove');
        return dbService.findAndUpdateOrCreate(RCN_FOR_STEAMING_NAME, 'In-Process Goods', data.quantity_kg, 'kg', `Received from warehouse: ${data.output_batch_id}`, 'add');
    }
    
    console.warn("Unknown RCN transaction type:", (data as any).transaction_type);
    return { success: false, error: "Unknown transaction type." };
}

export async function saveOtherMaterialsIntakeAction(data: OtherMaterialsIntakeFormValues): Promise<{ success: boolean; id?: string; error?: string, itemName?: string }> {
    const finalItemName = data.item_name === OTHER_ITEM_VALUE ? data.custom_item_name : data.item_name;
    if (!finalItemName) {
        return { success: false, error: "Item name could not be determined." };
    }

    const logData = { ...data, resolved_item_name: finalItemName };
    const logResult = await dbService.saveProductionLog({ ...logData, stage_name: 'Other Materials Intake' });
    if (!logResult.success) {
        return logResult;
    }

    let result;
    if (data.transaction_type === 'transfer') {
        const notes = `Internal transfer to production section: ${data.destination_section}. Ref ID: ${data.intake_batch_id || 'N/A'}. Notes: ${data.notes || 'No notes'}`;
        const quantityChange = -Math.abs(data.quantity);
        result = await dbService.findAndUpdateOrCreate(finalItemName, 'Other Materials', quantityChange, data.unit, notes, 'remove');
    } else { // 'intake'
        const notes = `Intake from supplier: ${data.supplier_id}. Batch ID: ${data.intake_batch_id || 'N/A'}.`;
        result = await dbService.findAndUpdateOrCreate(finalItemName, 'Other Materials', data.quantity, data.unit, notes, 'add');
    }
    
    return { ...result, itemName: finalItemName };
}

export async function saveGoodsDispatchedAction(data: GoodsDispatchedFormValues) {
    try {
        // 1. Create a single production log for the entire dispatch event
        const productionLogNotes = `Dispatch to ${data.destination}. Responsible: ${data.responsible_person}. Items: ${data.dispatched_items.map(i => `${i.item_name} (${i.quantity} ${i.unit})`).join(', ')}. ${data.notes || ''}`;
        await dbService.saveProductionLog({
            ...data,
            stage_name: 'Goods Dispatched',
            notes: productionLogNotes
        });

        // 2. For each item in the dispatch, update its inventory and create a specific inventory log
        for (const item of data.dispatched_items) {
            const inventoryLogNotes = `Dispatch to: ${data.destination}. Type: ${data.dispatch_type || 'N/A'}. Ref ID: ${data.dispatch_batch_id || 'N/A'}.`;
            await dbService.findAndUpdateOrCreate(item.item_name, 'Finished Goods', -item.quantity, item.unit, inventoryLogNotes, 'remove');
        }

        return { success: true, id: data.dispatch_batch_id || `dispatch-${Date.now()}` };
    } catch (error) {
        console.error("Error in saveGoodsDispatchedAction:", error);
        return { success: false, error: (error as Error).message };
    }
}

export async function savePackagingAction(data: PackagingFormValues) {
    try {
        const logId = `PACK-${Date.now()}`;
        const primaryResult = await dbService.saveProductionLog({ ...data, id: logId, stage_name: 'Packaging' });
        
        // This action now only handles inventory creation/consumption related to packaging.
        // It does NOT deduct the packaging materials themselves, as that's handled by an "Internal Transfer" log.
        let totalKernelsConsumedKg = 0;

        for (const item of data.packed_items) {
            const weightForGrade = item.number_of_packs * PACKAGE_WEIGHT_KG;
            await dbService.findAndUpdateOrCreate(item.kernel_grade, 'Finished Goods', weightForGrade, 'kg', `Packed from lot ${data.linked_lot_number}`, 'add');
            totalKernelsConsumedKg += weightForGrade;
        }

        if (totalKernelsConsumedKg > 0) {
            await dbService.findAndUpdateOrCreate(PEELED_KERNELS_FOR_PACKAGING_NAME, 'In-Process Goods', -totalKernelsConsumedKg, 'kg', `Used for packaging lot: ${data.linked_lot_number}`, 'remove');
        }
        
        return { ...primaryResult, id: logId };
    } catch (error) {
        console.error("Error in savePackagingAction:", error);
        return { success: false, error: (error as Error).message };
    }
}

export async function updatePackagingLogAction(data: PackagingFormValues) {
    if (!data.id) {
        return { success: false, error: 'Log ID is missing for update.' };
    }
    return dbService.updatePackagingLog(data.id, data);
}


export async function saveSteamingProcessAction(data: SteamingProcessFormValues) {
    try {
        await dbService.saveProductionLog({ ...data, stage_name: 'Steaming Process' });
        // Consume RCN for Steaming
        await dbService.findAndUpdateOrCreate(RCN_FOR_STEAMING_NAME, 'In-Process Goods', -data.weight_before_steam_kg, 'kg', `Consumed in steam batch: ${data.steam_batch_id}`, 'remove');
        
        // The `linked_steam_batch_id` in shelling will trace this.
        return { success: true, id: data.steam_batch_id };
    } catch (error) {
        console.error("Error saving steaming process:", error);
        return { success: false, error: (error as Error).message };
    }
}

export async function saveShellingProcessAction(data: ShellingProcessFormValues) {
     try {
        const primaryResult = await dbService.saveProductionLog({ ...data, stage_name: 'Shelling Process' });
        // The input `steamed_weight_input_kg` is just for record keeping, not an inventory item.
        // It produces shelled kernels ready for drying.
        await dbService.findAndUpdateOrCreate(SHELLED_KERNELS_FOR_DRYING_NAME, 'In-Process Goods', data.shelled_kernels_weight_kg, 'kg', `Produced from shelling lot: ${data.lot_number}`, 'add');
        
        if (data.shell_waste_weight_kg && data.shell_waste_weight_kg > 0) {
            await dbService.findAndUpdateOrCreate(CNS_SHELL_WASTE_NAME, 'By-Products', data.shell_waste_weight_kg, 'kg', `Waste from shelling lot: ${data.lot_number}`, 'add');
        }

        return primaryResult;
    } catch (error) {
        console.error("Error saving shelling process:", error);
        return { success: false, error: (error as Error).message };
    }
}

export async function saveDryingProcessAction(data: DryingProcessFormValues) {
    try {
        const logId = `DRY-${Date.now()}`;
        const primaryResult = await dbService.saveProductionLog({ ...data, id: logId, stage_name: 'Drying Process' });
        // Consume shelled kernels
        await dbService.findAndUpdateOrCreate(SHELLED_KERNELS_FOR_DRYING_NAME, 'In-Process Goods', -data.wet_kernel_weight_kg, 'kg', `Consumed in drying lot: ${data.linked_lot_number}`, 'remove');

        // Produce dried kernels ready for peeling
        if (data.dry_kernel_weight_kg && data.dry_kernel_weight_kg > 0) {
            await dbService.findAndUpdateOrCreate(DRIED_KERNELS_FOR_PEELING_NAME, 'In-Process Goods', data.dry_kernel_weight_kg, 'kg', `Produced from drying lot: ${data.linked_lot_number}`, 'add');
        }
        
        return { ...primaryResult, id: logId };
    } catch (error) {
        console.error("Error saving drying process:", error);
        return { success: false, error: (error as Error).message };
    }
}

export async function savePeelingProcessAction(data: PeelingProcessFormValues) {
    try {
        const logId = `PEEL-${Date.now()}`;
        const primaryResult = await dbService.saveProductionLog({ ...data, id: logId, stage_name: 'Peeling Process' });
        // Consume dried kernels
        await dbService.findAndUpdateOrCreate(DRIED_KERNELS_FOR_PEELING_NAME, 'In-Process Goods', -data.dried_kernel_input_kg, 'kg', `Consumed in peeling lot: ${data.linked_lot_number}`, 'remove');
        
        // Produce kernels ready for packaging
        if (data.peeled_kernels_kg && data.peeled_kernels_kg > 0) {
            await dbService.findAndUpdateOrCreate(PEELED_KERNELS_FOR_PACKAGING_NAME, 'In-Process Goods', data.peeled_kernels_kg, 'kg', `Produced from peeling lot: ${data.linked_lot_number}`, 'add');
        }

        // Log peel waste (Testa)
        if (data.peel_waste_kg && data.peel_waste_kg > 0) {
             await dbService.findAndUpdateOrCreate(TESTA_PEEL_WASTE_NAME, 'By-Products', data.peel_waste_kg, 'kg', `Waste from peeling lot: ${data.linked_lot_number}`, 'add');
        }

        return { ...primaryResult, id: logId };
    } catch (error) {
        console.error("Error saving peeling process:", error);
        return { success: false, error: (error as Error).message };
    }
}

export async function saveCalibrationLogAction(data: CalibrationFormValues) {
    return dbService.saveProductionLog({ ...data, stage_name: 'Equipment Calibration' });
}

export async function saveRcnSizingAction(data: RcnSizingCalibrationFormValues) {
    return dbService.saveProductionLog({ ...data, stage_name: 'RCN Sizing & Calibration' });
}

export async function saveRcnQualityAssessmentAction(data: RcnQualityAssessmentFormValues) {
    return dbService.saveProductionLog({ ...data, stage_name: 'RCN Quality Assessment' });
}

export async function saveMachineGradingAction(data: MachineGradingFormValues) {
    const logId = `GRADE-${Date.now()}`;
    return dbService.saveProductionLog({ ...data, id: logId, stage_name: 'Machine Grading' });
}

export async function saveManualPeelingRefinementAction(data: ManualPeelingRefinementFormValues) {
     const logId = `MANUAL-PEEL-${Date.now()}`;
    return dbService.saveProductionLog({ ...data, id: logId, stage_name: 'Manual Peeling Refinement' });
}

export async function saveQualityControlFinalAction(data: QualityControlFinalFormValues) {
    const logId = `QC-FINAL-${Date.now()}`;
    return dbService.saveProductionLog({ ...data, id: logId, stage_name: 'Quality Control (Final)' });
}

// --- Other Actions ---

export async function getTraceabilityReportAction(request: TraceabilityRequest): Promise<TraceabilityResult[]> {
  // Placeholder for real traceability logic
  console.log("Traceability requested for:", request.batchId);
  return [];
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

export async function handleDataManagementAction(params: { action: 'delete-test-data', username: string } | { action: 'export-csv' }): Promise<{count?: number, csv?: string}> {
    if (params.action === 'delete-test-data') {
        const count = await dbService.undoProductionLogsByUser(params.username);
        return { count };
    }
    
    if (params.action === 'export-csv') {
        const csv = await dbService.exportProductionLogsToCSV();
        return { csv };
    }

    throw new Error('Invalid data management action');
}

export async function deleteProductionLogAction(logId: string): Promise<{ success: boolean; error?: string }> {
    try {
        return await dbService.deleteProductionLogAndReverseTransactions(logId);
    } catch (error) {
        console.error(`Error deleting log ID ${logId}:`, error);
        return { success: false, error: (error as Error).message };
    }
}
