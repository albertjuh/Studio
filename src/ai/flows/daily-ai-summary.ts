
'use server';

/**
 * @fileOverview AI flow that generates a daily summary of inventory changes,
 * production highlights, and actionable insights.
 *
 * - generateDailySummary - A function that generates the daily summary.
 * - DailySummaryInput - The input type for the generateDailySummary function.
 * - DailySummaryOutput - The return type for the generateDailysummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DailySummaryInputSchema = z.object({
  inventoryChanges: z
    .string()
    .describe('Summary of inventory changes for the day.'),
  productionHighlights: z
    .string()
    .describe('Summary of production highlights for the day.'),
  previousDaySummary: z
    .string()
    .optional()
    .describe('The AI summary from the previous day, if any.'),
  rcnStockTonnes: z.number().describe('Current Raw Cashew Nut stock in tonnes.'),
  productionTargetTonnes: z.number().describe('The daily production target in tonnes.'),
  dateObject: z.date().optional().describe('The date for which to generate the summary.')
});
export type DailySummaryInput = z.infer<typeof DailySummaryInputSchema>;

const DailySummaryOutputSchema = z.object({
  summary: z.string().describe('AI-generated summary of key events and insights.'),
  insights: z.string().describe('Actionable insights for the user.'),
});
export type DailySummaryOutput = z.infer<typeof DailySummaryOutputSchema>;

export async function generateDailySummary(input: DailySummaryInput): Promise<DailySummaryOutput> {
  return dailySummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'dailySummaryPrompt',
  input: {schema: DailySummaryInputSchema},
  output: {schema: DailySummaryOutputSchema},
  prompt: `You are an AI assistant for a cashew production factory manager. Your task is to provide a daily summary based on the provided data.

  The factory's daily production target is {{productionTargetTonnes}} tonnes of RCN.

  Data for today:
  - Previous Day's Summary (for context): {{previousDaySummary}}
  - Current RCN Stock: {{rcnStockTonnes}} tonnes.
  - Inventory Changes: {{inventoryChanges}}
  - Production Highlights: {{productionHighlights}}

  Instructions:
  1.  **Daily Summary (approx. 150-200 words):** Craft a concise, engaging daily report.
      - Start with an impactful overview of the day's operational status.
      - Weave in the most critical inventory figures (e.g., total received/dispatched quantities, key items).
      - Mention significant production achievements or challenges.
      - Importantly, contextualize the current RCN stock against the daily production target. For example, calculate how many days of production the current stock can support.

  2.  **Actionable Insights:** Based on the day's data and the summary, generate a separate list of 2-3 specific, actionable insights or recommendations.
      - One insight MUST relate to the RCN stock level and whether it's sufficient for the upcoming days based on the {{productionTargetTonnes}} tonne/day target.
      - Other insights can relate to production bottlenecks, efficiency gains, or inventory discrepancies.

  Present the output clearly, distinguishing between the "Summary" and "Actionable Insights".`,
});

const dailySummaryFlow = ai.defineFlow(
  {
    name: 'dailySummaryFlow',
    inputSchema: DailySummaryInputSchema,
    outputSchema: DailySummaryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
