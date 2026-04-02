import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Global Genkit Instance
 * 
 * Configured to use Google AI (Gemini) models. 
 * Requires GOOGLE_GENAI_API_KEY environment variable for activation.
 */
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY,
    }),
  ],
});
