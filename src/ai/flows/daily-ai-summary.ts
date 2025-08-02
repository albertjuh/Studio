
'use server';

/**
 * @fileOverview A Genkit flow for generating a daily AI summary of factory operations.
 *
 * This file defines the AI logic for summarizing production logs. It takes a collection
 * of log entries and uses a generative model to produce a concise summary and
.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';

const DailySummaryInputSchema = z.object({
  productionLogs: z.any().describe('An array of production log objects for the day.'),
});

const DailySummaryOutputSchema = z.object({
  summary: z.string().describe('A brief, one-paragraph summary of the key production activities and quantities.'),
  insights: z.string().describe('Two to three bullet points highlighting notable events, potential issues, or efficiency observations.'),
});

export const dailySummaryFlow = ai.defineFlow(
  {
    name: 'dailySummaryFlow',
    inputSchema: DailySummaryInputSchema,
    outputSchema: DailySummaryOutputSchema,
  },
  async ({ productionLogs }) => {
    const prompt = `
      You are a factory operations analyst for a cashew processing plant.
      Your task is to provide a concise daily summary based on the following production logs.

      The logs are provided as a JSON object:
      ${JSON.stringify(productionLogs, null, 2)}

      Please analyze the logs and provide:
      1. A one-paragraph summary of the day's key activities. Mention the total RCN intake, total shelled kernels produced, and total finished goods packaged, if available in the logs.
      2. Two to three bullet points highlighting important insights, such as production bottlenecks, quality alerts, or notable achievements.

      Format your response according to the output schema.
    `;

    const llmResponse = await ai.generate({
      model: 'gemini-1.5-flash-latest',
      prompt: prompt,
      output: {
        schema: DailySummaryOutputSchema,
      },
      config: {
        temperature: 0.5,
      },
    });

    return llmResponse.output()!;
  }
);
