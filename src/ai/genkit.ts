
'use server';
/**
 * @fileOverview Genkit configuration for the application.
 */

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { defineSchema } from 'genkit';

// Configure the Genkit AI platform
genkit({
  plugins: [googleAI()],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});

export const ModelInput = defineSchema(
  'ModelInput',
  z => ({
    prompt: z.string(),
  }),
);

export const ModelOutput = defineSchema(
  'ModelOutput',
  z => ({
    output: z.string(),
  }),
);
