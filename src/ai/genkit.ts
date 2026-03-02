
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Genkit instance configured for the PartoMa Intelligence System.
 */
export const ai = genkit({
  plugins: [googleAI()],
});
