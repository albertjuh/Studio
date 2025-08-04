
'use server';
/**
 * @fileOverview A flow for generating a daily summary of factory operations.
 *
 * - dailySummaryFlow - A function that takes production logs and returns a summary and insights.
 */

import { ai, model } from '@/ai/genkit';
import { z } from 'zod';

const DailySummaryInputSchema = z.object({
  productionLogs: z.array(z.any()).describe("An array of production log objects for the day."),
});

const DailySummaryOutputSchema = z.object({
  summary: z.string().describe("A concise summary of the day's key production activities."),
  insights: z.string().describe("Actionable insights or potential issues identified from the data."),
});

export const dailySummaryFlow = ai.defineFlow(
  {
    name: 'dailySummaryFlow',
    inputSchema: DailySummaryInputSchema,
    outputSchema: DailySummaryOutputSchema,
  },
  async (input) => {
    const prompt = `
      You are a factory operations analyst for a cashew processing plant.
      Analyze the following production logs for the day and provide:
      1. A concise summary of key activities (e.g., total RCN processed, total kernels packaged).
      2. A few bullet points of actionable insights or potential issues (e.g., low efficiency in a specific stage, high waste, stock alerts).

      Keep the summary and insights brief and to the point.

      Today's Production Logs:
      \`\`\`json
      ${JSON.stringify(input.productionLogs, null, 2)}
      \`\`\`
    `;

    const llmResponse = await ai.generate({
      model: model,
      prompt: prompt,
      output: {
        schema: DailySummaryOutputSchema,
      },
    });

    return llmResponse.output()!;
  }
);
