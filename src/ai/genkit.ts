import {genkit, ModelReference} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {parse} from 'path';

const projectId = process.env.GCLOUD_PROJECT;
if (!projectId) {
  throw new Error('GCLOUD_PROJECT environment variable not set');
}
const location = 'us-central1';

export const ai = genkit({
  plugins: [
    googleAI({
      projectId,
      location,
    }),
  ],
});

export const model = googleAI.model('claude-3-haiku-20240307') as ModelReference<any>;
