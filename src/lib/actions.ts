

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
  InventoryLog,
  RcnSizingCalibrationFormValues
} from "@/types";
import { PACKAGING_BOXES_NAME, VACUUM_BAGS_NAME } from "./constants";

const dbService = InventoryDataService.getInstance();


export async function getDailyAiSummaryAction(clientInput: DailySummaryInput): Promise<DailySummaryOutput> {
  try {
    const summaryOutput = await generateDailySummary(clientInput);
    console.log("AI Summary Generated:", summaryOutput);

    // Optionally save the summary to the database
    // await dbService.saveAiSummary({ ...summaryOutput, date: new Date() });

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

export async function getReportDataAction(filters: ReportFilterState): Promise<ReportDataPayload> {
  console.log("Generating mock report for filters:", filters);
  // Return empty/mock data to prevent errors
  return { 
      totals: { totalGoodsReceived: 0, totalGoodsDispatched: 0, totalProductionOutput: 0, netInventoryChange: 0, unit: 'various' }, 
      itemWiseSummary: [], 
      productionLogs: [] 
  };
}


// --- ACTION HANDLERS (Now connected to the database service) ---

export async function saveRcnWarehouseTransactionAction(data: RcnIntakeEntry | RcnOutputToFactoryEntry) {
    const dbService = InventoryDataService.getInstance();
    if (data.transaction_type === 'intake') {
        const netWeight = data.gross_weight_kg - (data.tare_weight_kg || 0);
        const notes = `Intake from supplier: ${data.supplier_id}. Batch ID: ${data.intake_batch_id}.`;
        return dbService.findAndUpdateOrCreate('Raw Cashew Nuts', 'Raw Materials', netWeight, 'kg', notes);
    }
    
    if (data.transaction_type === 'output') {
        const notes = `Internal Transfer to: ${data.destination_stage}. Batch ID: ${data.output_batch_id}.`;
        return dbService.findAndUpdateOrCreate('Raw Cashew Nuts', 'Raw Materials', -data.quantity_kg, 'kg', notes);
    }
    
    // Fallback for any unknown transaction type
    console.warn("Unknown RCN transaction type:", (data as any).transaction_type);
    return { success: false, error: "Unknown transaction type." };
}


export async function saveOtherMaterialsIntakeAction(data: OtherMaterialsIntakeFormValues) {
    const notes = `Intake from supplier: ${data.supplier_id}. Batch ID: ${data.intake_batch_id || 'N/A'}.`;
    return dbService.findAndUpdateOrCreate(data.item_name, 'Other Materials', data.quantity, data.unit, notes);
}
export async function saveGoodsDispatchedAction(data: GoodsDispatchedFormValues) {
    // Note: The quantity change is negative because it's a dispatch
    const notes = `${data.dispatch_type || 'Dispatch'} to: ${data.destination}. Batch: ${data.dispatch_batch_id || 'N/A'}.`;
    return dbService.findAndUpdateOrCreate(data.item_name, 'Finished Goods', -data.quantity, data.unit, notes);
}

// Mock handlers for production stages for now
const mockSuccess = async (data: any) => {
    console.log("Mock saving data for production stage:", data);
    await new Promise(res => setTimeout(res, 300));
    return { success: true, id: `mock-${Date.now()}` };
}

export async function savePackagingAction(data: PackagingFormValues) {
    try {
        // Log the primary packaging event
        const primaryResult = await mockSuccess(data);
        if (!primaryResult.success) {
            return primaryResult;
        }

        const packagesUsed = data.packages_produced || 0;

        if (packagesUsed > 0) {
            const usageNotes = `Used for packaging batch: ${data.pack_batch_id}`;
            // Deduct packaging boxes
            await dbService.findAndUpdateOrCreate(PACKAGING_BOXES_NAME, 'Other Materials', -packagesUsed, 'boxes', usageNotes);
            
            // Deduct vacuum bags (assuming one per package)
            await dbService.findAndUpdateOrCreate(VACUUM_BAGS_NAME, 'Other Materials', -packagesUsed, 'bags', usageNotes);
        }
        
        return primaryResult;

    } catch (error) {
        console.error("Error in savePackagingAction:", error);
        return { success: false, error: (error as Error).message };
    }
}


export async function saveSteamingProcessAction(data: SteamingProcessFormValues) { return mockSuccess(data); }
export async function saveShellingProcessAction(data: ShellingProcessFormValues) { return mockSuccess(data); }
export async function saveDryingProcessAction(data: DryingProcessFormValues) { return mockSuccess(data); }
export async function savePeelingProcessAction(data: PeelingProcessFormValues) { return mockSuccess(data); }
export async function saveCalibrationLogAction(data: CalibrationFormValues) { return mockSuccess(data); }
export async function saveRcnSizingAction(data: RcnSizingCalibrationFormValues) { return mockSuccess(data); }
export async function saveRcnQualityAssessmentAction(data: RcnQualityAssessmentFormValues) { return mockSuccess(data); }
export async function saveMachineGradingAction(data: MachineGradingFormValues) { return mockSuccess(data); }
export async function saveManualPeelingRefinementAction(data: ManualPeelingRefinementFormValues) { return mockSuccess(data); }
export async function saveQualityControlFinalAction(data: QualityControlFinalFormValues) { return mockSuccess(data); }


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
  // This could be fetched from a 'settings' collection in Firestore
  return Promise.resolve({ dailySummaryEmailEnabled: false, recipientEmail: '' });
}

export async function saveNotificationSettingsAction(settings: NotificationSettings): Promise<{ success: boolean; error?: string }> {
  console.log("Saving notification settings (mock):", settings);
  // This would save to a 'settings' collection in Firestore
  return Promise.resolve({ success: true });
}
