
'use server';
/**
 * @fileOverview A Genkit flow for tracing the production history of a given batch ID.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { InventoryDataService } from '@/lib/database-service';
import type { TraceabilityResult } from '@/types';
import { format } from 'date-fns';

const dbService = InventoryDataService.getInstance();

const TraceabilityRequestSchema = z.object({
  batchId: z.string().describe("The user-provided batch or lot ID to trace."),
});
export type TraceabilityFlowRequest = z.infer<typeof TraceabilityRequestSchema>;


const TraceabilityResultSchema = z.object({
  id: z.string().describe("The unique ID of this production log or stage."),
  type: z.string().describe("The name of the production stage (e.g., 'Packaging', 'Shelling Process')."),
  timestamp: z.string().describe("The ISO 8601 formatted date and time of the event."),
  details: z.record(z.any()).describe("A map of key-value pairs with specific details about this stage."),
  relatedDocs: z.array(z.object({
    id: z.string(),
    type: z.string(),
  })).optional().describe("An array of documents this stage is linked to."),
});

const TraceabilityFlowOutputSchema = z.array(TraceabilityResultSchema);
export type TraceabilityFlowOutput = z.infer<typeof TraceabilityFlowOutputSchema>;


/**
 * Formats a raw production log from Firestore into a standardized TraceabilityResult.
 */
function formatLogAsTraceabilityResult(log: any): TraceabilityResult {
  const getTimestamp = (): string => {
    const date = log.created_at || log.pack_start_time || log.shell_start_time || log.steam_start_time || log.dry_start_time || log.peel_start_time || log.cs_start_time || log.start_time || log.qc_datetime || log.assessment_datetime || log.calibration_date || log.output_datetime || log.sizing_datetime || log.arrival_datetime || new Date();
    try {
      return new Date(date).toISOString();
    } catch {
      return new Date().toISOString();
    }
  };

  const result: TraceabilityResult = {
    id: log.id || log.lot_number || log.steam_batch_id || log.sizing_batch_id || 'Unknown ID',
    type: log.stage_name,
    timestamp: getTimestamp(),
    details: {},
    relatedDocs: [],
  };

  // Add stage-specific details
  switch (log.stage_name) {
    case 'Packaging':
      result.details['Box Type'] = log.box_type;
      result.details['Bag Carton'] = log.vacuum_bag_carton_id;
      result.details['Total Packs'] = log.packed_items?.reduce((s: number, i: any) => s + i.number_of_packs, 0);
      result.details['Production Date'] = format(new Date(log.production_date), 'PPP');
      break;
    case 'Shelling Process':
      result.details['Input (Steamed) KG'] = log.steamed_weight_input_kg;
      result.details['Output (Kernels) KG'] = log.shelled_kernels_weight_kg;
      result.details['Output (Shells) KG'] = log.shell_waste_weight_kg;
      break;
    case 'Steaming Process':
      result.details['Input (RCN) KG'] = log.weight_before_steam_kg;
      result.details['Output (Steamed) KG'] = log.weight_after_steam_kg;
      break;
    case 'RCN Intake':
       result.details['Supplier'] = log.supplier_id;
       result.details['Net Weight (kg)'] = log.net_weight_kg;
       break;
    default:
        result.details['Notes'] = log.notes || 'No notes for this stage.';
        break;
  }
  
  const linkedId = log.linked_lot_number || log.linked_steam_batch_id || log.linked_intake_batch_id || null;
  if(linkedId) {
      result.relatedDocs = [{ id: linkedId, type: 'Previous Stage' }];
  }

  return result;
}

const traceabilityFlow = ai.defineFlow(
  {
    name: 'traceabilityFlow',
    inputSchema: TraceabilityRequestSchema,
    outputSchema: TraceabilityFlowOutputSchema,
  },
  async ({ batchId }) => {
    const results: TraceabilityResult[] = [];
    const processedIds = new Set<string>();
    let currentId: string | null = batchId;

    while (currentId && !processedIds.has(currentId)) {
        processedIds.add(currentId);

        const log = await dbService.findLogByAnyId(currentId);

        if (!log) {
            // Special case: If the ID is a finished good lot, find its packaging log
            const packagingLog = await dbService.findPackagingLogsByLot([currentId]);
            if (packagingLog.length > 0) {
                 const formattedResult = formatLogAsTraceabilityResult(packagingLog[0]);
                 results.push(formattedResult);
                 currentId = packagingLog[0].linked_lot_number;
                 continue; // Continue the loop with the new ID
            }
            break; // Stop if no log is found
        }
        
        const formattedResult = formatLogAsTraceabilityResult(log);
        results.push(formattedResult);
        
        currentId = dbService.getLinkedIdFromLog(log);
    }
    
    return results;
  }
);


export async function getTraceabilityReport(request: TraceabilityFlowRequest): Promise<TraceabilityFlowOutput> {
    return traceabilityFlow(request);
}
