import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [
    googleAI({
      apiVersion: ['v1beta'],
    }),
  ],
  model: 'googleai/claude-3-haiku-20240307',
  
});
