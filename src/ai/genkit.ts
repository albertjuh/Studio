import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Global Genkit Instance
 * 
 * Configured to use Google AI (Gemini) models. 
 * Requires GOOGLE_GENAI_API_KEY environment variable for activation.
 * Includes a fallback key for immediate workstation activation.
 */
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY || 'AIzaSyBTneBDhzOkystR6MDpO0iOQWHOBNUG9Ks',
    }),
  ],
});
