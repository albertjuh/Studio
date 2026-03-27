'use server';
/**
 * @fileOverview RA Weekly Scheduling AI agent.
 *
 * - generateRaSchedule - A function that handles the AI optimization of RA facility assignments.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const FacilityStatusSchema = z.object({
  name: z.string(),
  enrolled: z.number(),
  target: z.number(),
  percentage: z.number(),
});

const RaScheduleInputSchema = z.object({
  facilities: z.array(FacilityStatusSchema),
  ras: z.array(z.string()),
  startDate: z.string(),
});
export type RaScheduleInput = z.infer<typeof RaScheduleInputSchema>;

const RaScheduleOutputSchema = z.object({
  assignments: z.array(z.object({
    date: z.string(),
    ra_name: z.string(),
    facility: z.string(),
    priority_level: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
    reasoning: z.string(),
  })),
  summary: z.string(),
});
export type RaScheduleOutput = z.infer<typeof RaScheduleOutputSchema>;

export async function generateRaSchedule(input: RaScheduleInput): Promise<RaScheduleOutput> {
  return raScheduleFlow(input);
}

const prompt = ai.definePrompt({
  name: 'raSchedulePrompt',
  input: { schema: RaScheduleInputSchema },
  output: { schema: RaScheduleOutputSchema },
  prompt: `You are an AI research operations coordinator for the PartoMa study in Dar es Salaam.
Your goal is to generate a weekly schedule (7 days starting from {{{startDate}}}) for the Research Assistants (RAs).

Available RAs: 
{{#each ras}}- {{this}}
{{/each}}

Facility Progress Data:
{{#each facilities}}
- {{name}}: {{enrolled}}/{{target}} enrolled ({{percentage}}%)
{{/each}}

Assignment Rules:
1. Prioritize facilities with less than 50% enrollment.
2. Ensure every RA has an assignment each day (or a 'Rest Day' if workload allows, but prioritize high-need sites).
3. Try to keep an RA at the same facility for 2-3 days for continuity, but rotate them if needed to cover gaps.
4. Assign at least one RA to any site with 'CRITICAL' priority (sites with very low enrollment relative to time).

Output a structured 7-day schedule. For each assignment, provide a brief reasoning why that RA was sent there based on the progress data.`,
});

const raScheduleFlow = ai.defineFlow(
  {
    name: 'raScheduleFlow',
    inputSchema: RaScheduleInputSchema,
    outputSchema: RaScheduleOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);
