'use server';
/**
 * @fileOverview A flow for generating a daily AI summary of factory operations.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Define the expected JSON structure of a single production log
const ProductionLogSchema = z.object({
    id: z.string(),
    stage_name: z.string(),
    // Add other relevant fields from your logs that the AI should know about
    quantity: z.number().optional(),
    unit: z.string().optional(),
    gross_weight_kg: z.number().optional(),
    net_weight_kg: z.number().optional(),
    quantity_kg: z.number().optional(),
    weight_before_steam_kg: z.number().optional(),
    weight_after_steam_kg: z.number().optional(),
    shelled_kernels_weight_kg: z.number().optional(),
    wet_kernel_weight_kg: z.number().optional(),
    dry_kernel_weight_kg: z.number().optional(),
    peeled_kernels_kg: z.number().optional(),
    peeled_input_kg: z.number().optional(),
    packages_produced: z.number().optional(),
    dispatched_items: z.array(z.any()).optional(),
    notes: z.string().optional(),
    created_at: z.string().optional(), // ISO date string
}).passthrough(); // Allow other fields not explicitly defined

// Define the input schema for our flow
const DailySummaryInputSchema = z.object({
  productionLogs: z.array(ProductionLogSchema).describe("An array of JSON objects, where each object is a log entry for a specific production activity that occurred in the last 24 hours."),
});
export type DailySummaryInput = z.infer<typeof DailySummaryInputSchema>;

// Define the output schema the AI should return
const DailySummaryOutputSchema = z.object({
  summary: z.string().describe("A concise, one-paragraph summary of the key production activities and totals for the day. Mention total RCN intake, total packaged goods, and total dispatches."),
  insights: z.string().describe("Two to three bullet points highlighting actionable insights, potential issues (like low stock, high waste, or low efficiency), or positive trends based on the provided data."),
});
export type DailySummaryOutput = z.infer<typeof DailySummaryOutputSchema>;

// Define the prompt for the AI model
const dailySummaryPrompt = ai.definePrompt({
    name: 'dailySummaryPrompt',
    input: { schema: DailySummaryInputSchema },
    output: { schema: DailySummaryOutputSchema },
    prompt: `You are an expert factory operations analyst for a cashew processing plant. Your task is to analyze the provided JSON data of today's production logs and generate a clear, concise daily report for the factory manager.

    Analyze the following production logs:
    {{{json productionLogs}}}

    Based on your analysis, provide a summary and actionable insights in the requested JSON format.
    Focus on key metrics: RCN intake, goods produced (packaging), goods dispatched, and any notable waste or efficiency figures.
    Calculate totals where possible to provide a quantitative overview.
    Identify any potential bottlenecks, warnings, or anomalies in the data.
    The current date is ${new Date().toDateString()}.
    `,
});

// Define the main flow
export const dailySummaryFlow = ai.defineFlow(
  {
    name: 'dailySummaryFlow',
    inputSchema: DailySummaryInputSchema,
    outputSchema: DailySummaryOutputSchema,
  },
  async (input) => {
    const { output } = await dailySummaryPrompt(input);
    // The output is already structured according to our schema.
    // If it's null, something went wrong with the model call.
    if (!output) {
        throw new Error("The AI model failed to generate a summary. The output was empty.");
    }
    return output;
  }
);
