
'use server';
/**
 * @fileOverview A Genkit flow for tracing the production history of a given batch ID.
 * This flow uses an AI model with a database search tool to intelligently
 * trace the lineage of a batch, handling different ID schemes across stages.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { InventoryDataService } from '@/lib/database-service';
import { format } from 'date-fns';

const dbService = InventoryDataService.getInstance();

// Define the schema for the user's request
const TraceabilityRequestSchema = z.object({
  batchId: z.string().describe("The user-provided batch, lot, or shipment ID to trace."),
});
export type TraceabilityFlowRequest = z.infer<typeof TraceabilityRequestSchema>;

// Define the schema for a single step in the traceability report
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
export type TraceabilityResult = z.infer<typeof TraceabilityResultSchema>;

// Define the schema for the final output of the flow
const TraceabilityFlowOutputSchema = z.array(TraceabilityResultSchema);
export type TraceabilityFlowOutput = z.infer<typeof TraceabilityFlowOutputSchema>;


/**
 * A Genkit tool that allows the AI to search the production log database for a given ID.
 * The AI can use this tool to find the next or previous step in the production chain.
 */
const findLogByIdTool = ai.defineTool(
    {
        name: 'findLogById',
        description: 'Finds a production log in the database by searching across various possible ID fields.',
        inputSchema: z.string().describe("The ID to search for (e.g., a batch ID, lot number, or linked ID)."),
        outputSchema: z.any().describe("The raw production log data as a JSON object, or null if not found."),
    },
    async (id) => {
        return await dbService.findLogByAnyId(id);
    }
);


/**
 * The main prompt that instructs the AI on how to perform the traceability task.
 */
const traceabilityPrompt = ai.definePrompt({
    name: 'traceabilityPrompt',
    model: 'googleai/gemini-1.5-flash-latest', // Added the missing model
    input: { schema: TraceabilityRequestSchema },
    output: { schema: TraceabilityFlowOutputSchema },
    tools: [findLogByIdTool],
    prompt: `You are a factory operations analyst. Your task is to trace the full production history of a given batch ID.
    You will be given a starting ID. This ID could be from any stage: RCN intake, shelling, packaging, etc.
    Your goal is to construct a complete, chronological history of this batch.

    Here is the process you must follow:
    1.  Start with the user-provided ID: {{{batchId}}}.
    2.  Use the 'findLogById' tool to get the details for the current ID.
    3.  If a log is found, analyze its data to find any 'linked' IDs (e.g., 'linked_lot_number', 'linked_steam_batch_id', 'linked_rcn_intake_batch_id'). These linked IDs represent the *previous* stage in the process.
    4.  You must also look for IDs that are *generated* by this stage (e.g., a 'steam_batch_id' is created by the Steaming process). You need to find the *next* log that uses this generated ID as its input.
    5.  Recursively use the 'findLogById' tool to trace the lineage both backwards (using linked IDs) and forwards (finding logs that use the current log's output ID) until you can no longer find any connected logs.
    6.  As you find each log, format it into a TraceabilityResult object. The 'details' should contain key metrics from the log.
    7.  Once you have traced the entire history, compile all the TraceabilityResult objects into an array, sorted chronologically from the earliest event (RCN Intake) to the latest (Packaging/Dispatch).
    
    Example of linked IDs in the data:
    - A 'Shelling Process' log with 'lot_number: LOT-A' will have a 'linked_steam_batch_id: STEAM-B'. You trace 'STEAM-B' to go backwards.
    - A 'Steaming Process' log with 'steam_batch_id: STEAM-B' will have a 'linked_intake_batch_id: RCN-C'.
    - A 'Packaging' log with 'linked_lot_number: LOT-A' links back to the shelling process.

    Do not stop until the full chain is complete.
    `,
});


/**
 * The main flow that executes the traceability prompt.
 */
const traceabilityFlow = ai.defineFlow(
  {
    name: 'traceabilityFlow',
    inputSchema: TraceabilityRequestSchema,
    outputSchema: TraceabilityFlowOutputSchema,
  },
  async (input) => {
    const { output } = await traceabilityPrompt(input);
    if (!output) {
      throw new Error("The AI model failed to generate a traceability report.");
    }
    // Sort the results chronologically as a final step
    return output.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }
);


/**
 * Exported wrapper function to be called by the server action.
 */
export async function getTraceabilityReport(request: TraceabilityFlowRequest): Promise<TraceabilityFlowOutput> {
    return traceabilityFlow(request);
}
