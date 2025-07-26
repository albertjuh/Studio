

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
import { PACKAGING_BOXES_NAME, VACUUM_BAGS_NAME, PEELED_KERNELS_FOR_PACKAGING_NAME } from "./constants";

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
        const itemWiseSummary = new Map<string, { received: number, dispatched: number, produced: number, unit: string }>();

        // This is a simplified aggregation. A more complex report would require more detailed logic.
        for (const log of logs) {
            // ... aggregation logic would go here ...
        }

        return {
            totals,
            itemWiseSummary: Array.from(itemWiseSummary.values()),
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
        // Also log this as a production event for reporting
        await dbService.saveProductionLog({ ...data, stage_name: 'RCN Intake' });
        return dbService.findAndUpdateOrCreate('Raw Cashew Nuts', 'Raw Materials', netWeight, 'kg', notes);
    }
    
    if (data.transaction_type === 'output') {
        const notes = `Internal Transfer to: ${data.destination_stage}. Batch ID: ${data.output_batch_id}.`;
        // Also log this as a production event for reporting
        await dbService.saveProductionLog({ ...data, stage_name: 'RCN Output to Factory' });
        return dbService.findAndUpdateOrCreate('Raw Cashew Nuts', 'Raw Materials', -data.quantity_kg, 'kg', notes);
    }
    
    console.warn("Unknown RCN transaction type:", (data as any).transaction_type);
    return { success: false, error: "Unknown transaction type." };
}

export async function saveOtherMaterialsIntakeAction(data: OtherMaterialsIntakeFormValues) {
    const notes = `Intake from supplier: ${data.supplier_id}. Batch ID: ${data.intake_batch_id || 'N/A'}.`;
    await dbService.saveProductionLog({ ...data, stage_name: 'Other Materials Intake' });
    return dbService.findAndUpdateOrCreate(data.item_name, 'Other Materials', data.quantity, data.unit, notes);
}

export async function saveGoodsDispatchedAction(data: GoodsDispatchedFormValues) {
    try {
        await dbService.saveProductionLog({ ...data, stage_name: 'Goods Dispatched' });
        for (const item of data.dispatched_items) {
            const notes = `Dispatch to: ${data.destination}. Ref ID: ${data.dispatch_batch_id || 'N/A'}.`;
            await dbService.findAndUpdateOrCreate(item.item_name, 'Finished Goods', -item.quantity, item.unit, notes);
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
            await dbService.findAndUpdateOrCreate(item.kernel_grade, 'Finished Goods', item.approved_weight_kg, 'kg', `Packed into batch ${data.pack_batch_id}`);
            totalPackedWeight += item.approved_weight_kg;
            totalPackagesUsed += item.packages_produced;
        }

        await dbService.findAndUpdateOrCreate(PEELED_KERNELS_FOR_PACKAGING_NAME, 'In-Process Goods', -totalPackedWeight, 'kg', `Used for packaging batch: ${data.pack_batch_id}`);

        if (totalPackagesUsed > 0) {
            const usageNotes = `Used for packaging batch: ${data.pack_batch_id}`;
            await dbService.findAndUpdateOrCreate(PACKAGING_BOXES_NAME, 'Other Materials', -totalPackagesUsed, 'boxes', usageNotes);
            await dbService.findAndUpdateOrCreate(VACUUM_BAGS_NAME, 'Other Materials', -totalPackagesUsed, 'bags', usageNotes);
        }
        
        return primaryResult;
    } catch (error) {
        console.error("Error in savePackagingAction:", error);
        return { success: false, error: (error as Error).message };
    }
}

export async function saveSteamingProcessAction(data: SteamingProcessFormValues) {
    return dbService.saveProductionLog({ ...data, stage_name: 'Steaming Process' });
}

export async function saveShellingProcessAction(data: ShellingProcessFormValues) {
    return dbService.saveProductionLog({ ...data, stage_name: 'Shelling Process' });
}

export async function saveDryingProcessAction(data: DryingProcessFormValues) {
    return dbService.saveProductionLog({ ...data, stage_name: 'Drying Process' });
}

export async function savePeelingProcessAction(data: PeelingProcessFormValues) {
    return dbService.saveProductionLog({ ...data, stage_name: 'Peeling Process' });
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
  return Promise.resolve([]);
}

export async function isEmailServiceConfiguredAction(): Promise<boolean> {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL;
  return !!(apiKey && fromEmail && !apiKey.startsWith("YOUR") && !fromEmail.startsWith("your"));
}

export async function getNotificationSettingsAction(): Promise<NotificationSettings> {
  return Promise.resolve({ dailySummaryEmailEnabled: false, recipientEmail: '' });
}

export async function saveNotificationSettingsAction(settings: NotificationSettings): Promise<{ success: boolean; error?: string }> {
  console.log("Saving notification settings (mock):", settings);
  return Promise.resolve({ success: true });
}
