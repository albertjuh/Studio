import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Note: To use a model via Vertex AI (like Claude), you would provide projectId and location.
// For standard Google AI models like Gemini, this is not needed.
export const ai = genkit({
  plugins: [
    googleAI(),
  ],
  logLevel: 'error', // Reduce logging to minimize issues
});

// The model name for Gemini Pro
export const model = 'gemini-pro';