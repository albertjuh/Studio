import {genkit, ModelReference} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {parse} from 'path';

// Note: To use a model via Vertex AI (like Claude), you would provide projectId and location.
// For standard Google AI models like Gemini, this is not needed.
export const ai = genkit({
  plugins: [
    googleAI(),
  ],
});

// The model name for Gemini Pro
export const model = googleAI.model('gemini-pro') as ModelReference<any>;