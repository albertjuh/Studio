

"use server";

import { generateDailySummary } from "@/ai/flows/daily-ai-summary";
import type { DailySummaryInput, DailySummaryOutput } from "@/ai/flows/daily-ai-summary";
import { generateReportSummary } from "@/ai/flows/generate-report-summary";
import type { GenerateReportSummaryInput, GenerateReportSummaryOutput } from "@/ai/flows/generate-report-summary";
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
  RcnSizingCalibrationFormValues
} from "@/types";
import { PACKAGING_BOXES_NAME, VACUUM_BAGS_NAME, PEELED_KERNELS_FOR_PACKAGING_NAME, RCN_FOR_STEAMING_NAME, SHELLED_KERNELS_FOR_DRYING_NAME, DRIED_KERNELS_FOR_PEELING_NAME, RAW_CASHEW_NUTS_NAME, CNS_SHELL_WASTE_NAME, TESTA_PEEL_WASTE_NAME } from "./constants";

const dbService = InventoryDataService.getInstance();

// --- AI Actions ---

export async function getDailyAiSummaryAction(clientInput: DailySummaryInput): Promise<DailySummaryOutput> {
  try {
    const summaryOutput = await generateDailySummary(clientInput);
    console.log("AI Summary Generated:", summaryOutput);
    return summaryOutput;
  } catch (error) {
    console.error("Error in getDailyAiSummaryAction:", error);
    throw new Error(`Failed to generate daily AI summary: ${(error as Error).message}`);
  }
}

export async function getReportAiSummaryAction(reportData: ReportDataPayload): Promise<GenerateReportSummaryOutput> {
  try {
    const input: GenerateReportSummaryInput = {
      reportData: JSON.stringify(reportData),
    };
    const summary = await generateReportSummary(input);
    return summary;
  } catch (error) {
    console.error("Error generating report AI summary:", error);
    throw new Error(`Failed to generate report AI summary: ${(error as Error).message}`);
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

// --- FORM SAVE ACTIONS (Connected to the database service) ---

export async function saveRcnWarehouseTransactionAction(data: RcnIntakeEntry | RcnOutputToFactoryEntry) {
    const dbService = InventoryDataService.getInstance();
    if (data.transaction_type === 'intake') {
        const netWeight = data.gross_weight_kg - (data.tare_weight_kg || 0);
        const notes = `Intake from supplier: ${data.supplier_id}. Batch ID: ${data.intake_batch_id}.`;
        await dbService.saveProductionLog({ ...data, stage_name: 'RCN Intake' });
        return dbService.findAndUpdateOrCreate(RAW_CASHEW_NUTS_NAME, 'Raw Materials', netWeight, 'kg', notes, 'add');
    }
    
    if (data.transaction_type === 'output') {
        const notes = `Internal Transfer to: Sizing & Calibration. Batch ID: ${data.output_batch_id}.`;
        await dbService.saveProductionLog({ ...data, stage_name: 'RCN Output to Factory' });
        // This is an internal transfer, not a net loss or gain.
        // The log action will now be 'update' to signify this.
        await dbService.findAndUpdateOrCreate(RAW_CASHEW_NUTS_NAME, 'Raw Materials', -data.quantity_kg, 'kg', notes, 'update');
        return dbService.findAndUpdateOrCreate(RCN_FOR_STEAMING_NAME, 'In-Process Goods', data.quantity_kg, 'kg', `Received from warehouse: ${data.output_batch_id}`, 'update');
    }
    
    console.warn("Unknown RCN transaction type:", (data as any).transaction_type);
    return { success: false, error: "Unknown transaction type." };
}

export async function saveOtherMaterialsIntakeAction(data: OtherMaterialsIntakeFormValues) {
    const notes = `Intake from supplier: ${data.supplier_id}. Batch ID: ${data.intake_batch_id || 'N/A'}.`;
    await dbService.saveProductionLog({ ...data, stage_name: 'Other Materials Intake' });
    return dbService.findAndUpdateOrCreate(data.item_name, 'Other Materials', data.quantity, data.unit, notes, 'add');
}

export async function saveGoodsDispatchedAction(data: GoodsDispatchedFormValues) {
    try {
        await dbService.saveProductionLog({ ...data, stage_name: 'Goods Dispatched' });
        for (const item of data.dispatched_items) {
            const notes = `Dispatch to: ${data.destination}. Type: ${data.dispatch_type || 'N/A'}. Ref ID: ${data.dispatch_batch_id || 'N/A'}.`;
            await dbService.findAndUpdateOrCreate(item.item_name, 'Finished Goods', -item.quantity, 'kg', notes, 'remove');
        }
        return { success: true, id: data.dispatch_batch_id || `dispatch-${Date.now()}` };
    } catch (error) {
        console.error("Error in saveGoodsDispatchedAction:", error);
        return { success: false, error: (error as Error).message };
    }
}

export async function savePackagingAction(data: PackagingFormValues) {
    try {
        const primaryResult = await dbService.saveProductionLog({ ...data, stage_name: 'Packaging' });
        
        let totalPackedWeight = 0;
        let totalPackagesUsed = 0;

        for (const item of data.packed_items) {
            await dbService.findAndUpdateOrCreate(item.kernel_grade, 'Finished Goods', item.approved_weight_kg, 'kg', `Packed into batch ${data.pack_batch_id}`, 'add');
            totalPackedWeight += item.approved_weight_kg;
            totalPackagesUsed += item.packages_produced;
        }

        await dbService.findAndUpdateOrCreate(PEELED_KERNELS_FOR_PACKAGING_NAME, 'In-Process Goods', -totalPackedWeight, 'kg', `Used for packaging batch: ${data.pack_batch_id}`, 'remove');

        if (totalPackagesUsed > 0) {
            const usageNotes = `Used for packaging batch: ${data.pack_batch_id}`;
            await dbService.findAndUpdateOrCreate(PACKAGING_BOXES_NAME, 'Other Materials', -totalPackagesUsed, 'boxes', usageNotes, 'remove');
            await dbService.findAndUpdateOrCreate(VACUUM_BAGS_NAME, 'Other Materials', -totalPackagesUsed, 'bags', usageNotes, 'remove');
        }
        
        return primaryResult;
    } catch (error) {
        console.error("Error in savePackagingAction:", error);
        return { success: false, error: (error as Error).message };
    }
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
        await dbService.saveProductionLog({ ...data, stage_name: 'Shelling Process' });
        // The input `steamed_weight_input_kg` is just for record keeping, not an inventory item.
        // It produces shelled kernels ready for drying.
        await dbService.findAndUpdateOrCreate(SHELLED_KERNELS_FOR_DRYING_NAME, 'In-Process Goods', data.shelled_kernels_weight_kg, 'kg', `Produced from shelling lot: ${data.lot_number}`, 'add');
        
        if (data.shell_waste_weight_kg && data.shell_waste_weight_kg > 0) {
            await dbService.findAndUpdateOrCreate(CNS_SHELL_WASTE_NAME, 'By-Products', data.shell_waste_weight_kg, 'kg', `Waste from shelling lot: ${data.lot_number}`, 'add');
        }

        return { success: true, id: data.shell_process_id };
    } catch (error) {
        console.error("Error saving shelling process:", error);
        return { success: false, error: (error as Error).message };
    }
}

export async function saveDryingProcessAction(data: DryingProcessFormValues) {
    try {
        await dbService.saveProductionLog({ ...data, stage_name: 'Drying Process' });
        // Consume shelled kernels
        await dbService.findAndUpdateOrCreate(SHELLED_KERNELS_FOR_DRYING_NAME, 'In-Process Goods', -data.wet_kernel_weight_kg, 'kg', `Consumed in drying batch: ${data.dry_batch_id}`, 'remove');

        // Produce dried kernels ready for peeling
        if (data.dry_kernel_weight_kg && data.dry_kernel_weight_kg > 0) {
            await dbService.findAndUpdateOrCreate(DRIED_KERNELS_FOR_PEELING_NAME, 'In-Process Goods', data.dry_kernel_weight_kg, 'kg', `Produced from drying batch: ${data.dry_batch_id}`, 'add');
        }
        
        return { success: true, id: data.dry_batch_id };
    } catch (error) {
        console.error("Error saving drying process:", error);
        return { success: false, error: (error as Error).message };
    }
}

export async function savePeelingProcessAction(data: PeelingProcessFormValues) {
    try {
        await dbService.saveProductionLog({ ...data, stage_name: 'Peeling Process' });
        // Consume dried kernels
        await dbService.findAndUpdateOrCreate(DRIED_KERNELS_FOR_PEELING_NAME, 'In-Process Goods', -data.dried_kernel_input_kg, 'kg', `Consumed in peeling batch: ${data.peel_batch_id}`, 'remove');
        
        // Produce kernels ready for packaging
        if (data.peeled_kernels_kg && data.peeled_kernels_kg > 0) {
            await dbService.findAndUpdateOrCreate(PEELED_KERNELS_FOR_PACKAGING_NAME, 'In-Process Goods', data.peeled_kernels_kg, 'kg', `Produced from peeling batch: ${data.peel_batch_id}`, 'add');
        }

        // Log peel waste (Testa)
        if (data.peel_waste_kg && data.peel_waste_kg > 0) {
             await dbService.findAndUpdateOrCreate(TESTA_PEEL_WASTE_NAME, 'By-Products', data.peel_waste_kg, 'kg', `Waste from peeling batch: ${data.peel_batch_id}`, 'add');
        }

        return { success: true, id: data.peel_batch_id };
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
    return dbService.saveProductionLog({ ...data, stage_name: 'Machine Grading' });
}

export async function saveManualPeelingRefinementAction(data: ManualPeelingRefinementFormValues) {
    return dbService.saveProductionLog({ ...data, stage_name: 'Manual Peeling Refinement' });
}

export async function saveQualityControlFinalAction(data: QualityControlFinalFormValues) {
    return dbService.saveProductionLog({ ...data, stage_name: 'Quality Control (Final)' });
}

// --- Other Actions ---

export async function getStoredAiSummariesAction(): Promise<DailyAiSummary[]> {
  // This is a placeholder. In a real app, you would fetch these from Firestore.
  return Promise.resolve([]);
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
