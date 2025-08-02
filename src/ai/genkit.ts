import {genkit, ModelReference} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {parse} from 'path';

const projectId = process.env.GCLOUD_PROJECT;
if (!projectId) {
  throw new Error('GCLOUD_PROJECT environment variable not set');
}
const location = 'us-central1';

// By providing a projectId and location, Genkit will default to the
// Vertex AI endpoint, which is correct for accessing third-party models like Claude.
export const ai = genkit({
  plugins: [
    googleAI({
      projectId,
      location,
    }),
  ],
});

// The model name for Claude 3 Haiku on Vertex AI
export const model = googleAI.model('claude-3-haiku@20240307') as ModelReference<any>;