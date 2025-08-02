
'use server';
/**
 * @fileOverview Genkit configuration for the application.
 */

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { defineSchema } from 'genkit';
import { z } from 'zod';

// Configure the Genkit AI platform
export const ai = genkit({
  plugins: [
    googleAI({
        apiKey: process.env.GEMINI_API_KEY,
    })
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});

export const ModelInput = z.object({
    prompt: z.string(),
});

export const ModelOutput = z.object({
    output: z.string(),
});

