
'use server';
/**
 * @fileOverview Genkit configuration for the Nutshell Insights app.
 */

import { genkit, Ai } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { z } from 'zod';

export const ai: Ai = genkit({
  plugins: [
    googleAI(),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});

export const model = 'gemini-pro';

// Define common schemas
export const ModelInput = z.object({
    input: z.string(),
});

export const ModelOutput = z.object({
    output: z.string(),
});
