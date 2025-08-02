import {genkit, ModelReference} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {parse} from 'path';

// By not providing a projectId and location, Genkit will default to the
// global generativelanguage.googleapis.com endpoint, which is correct for standard models like gemini-pro.
export const ai = genkit({
  plugins: [
    googleAI(),
  ],
});

export const model = googleAI.model('gemini-pro') as ModelReference<any>;
