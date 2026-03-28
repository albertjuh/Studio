'use server';
/**
 * @fileOverview RA Weekly Scheduling AI agent.
 *
 * - generateRaSchedule - A function that handles the AI optimization of RA facility assignments.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { addDays, format, isWeekend, parseISO } from 'date-fns';

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
    priority_level: z.enum(['HIGH', 'MEDIUM', 'LOW']),
    reasoning: z.string(),
  })),
  summary: z.string(),
});
export type RaScheduleOutput = z.infer<typeof RaScheduleOutputSchema>;

// Fixed Tanzania Public Holidays 2026
const TANZANIA_HOLIDAYS_2026 = [
  '2026-01-01', // New Year
  '2026-01-12', // Zanzibar Revolution
  '2026-04-03', // Good Friday
  '2026-04-06', // Easter Monday
  '2026-04-07', // Karume Day
  '2026-04-26', // Union Day
  '2026-05-01', // Labor Day
  '2026-07-07', // Saba Saba
  '2026-08-08', // Nane Nane
  '2026-10-14', // Nyerere Day
  '2026-12-09', // Independence
  '2026-12-25', // Christmas
  '2026-12-26', // Boxing Day
];

export async function generateRaSchedule(input: RaScheduleInput): Promise<RaScheduleOutput> {
  return raScheduleFlow(input);
}

const prompt = ai.definePrompt({
  name: 'raSchedulePrompt',
  model: 'googleai/gemini-1.5-flash',
  input: { schema: RaScheduleInputSchema },
  output: { schema: RaScheduleOutputSchema },
  prompt: `You are an AI research operations coordinator for the PartoMa study in Dar es Salaam.
Your goal is to generate a dynamic, SHUFFLED weekly schedule (Monday to Friday starting from {{{startDate}}}) for the Research Assistants (RAs).

Available RAs: 
{{#each ras}}- {{this}}
{{/each}}

Current Facility Enrollment Progress:
{{#each facilities}}
- {{name}}: {{enrolled}}/{{target}} enrolled ({{percentage}}%)
{{/each}}

RESEARCH INTEGRITY & ROTATION RULES:
1. DYNAMIC SHUFFLING: The schedule must change weekly. Do not repeat the same patterns. Shuffle which RA goes to which site and which day they visit.
2. REPRESENTATION EQUITY: Every facility represents a distinct sub-population. Maintain a steady recruitment pulse at EVERY site over time. 
3. EQUAL FREQUENCY: Every facility must receive the same total number of visits over the study period. Do not favor high-performing sites.
4. ONCE PER WEEK MAX: Assign a specific health facility to the schedule ONLY ONCE per week. With 31 sites and 20 RA-days (4 RAs x 5 days), you must rotate which 20 sites are visited this week vs next week.
5. MONDAY TO FRIDAY ONLY: No assignments on Saturdays or Sundays.
6. EXCLUDE PUBLIC HOLIDAYS: Check if the date is in this list: ${TANZANIA_HOLIDAYS_2026.join(', ')}.
7. PRIORITY DEFINITION (Research Lifecycle Phases):
   - HIGH: Initial Recruitment Phase (Establishing site momentum, usually < 15% progress).
   - MEDIUM: Growth Phase (Steady-state recruitment for established sites, 15% - 40%).
   - LOW: Maintenance/Completion Phase (Mature sites approaching their target, > 40%).

Reasoning must emphasize "Weekly Rotation" and "Population Representation". Use professional clinical language.`,
});

const raScheduleFlow = ai.defineFlow(
  {
    name: 'raScheduleFlow',
    inputSchema: RaScheduleInputSchema,
    outputSchema: RaScheduleOutputSchema,
  },
  async input => {
    try {
      const { output } = await prompt(input);
      return output!;
    } catch (error: any) {
      console.warn("AI Service Unavailable, using research-standard fallback:", error.message);
      return generateRuleBasedSchedule(input);
    }
  }
);

/**
 * Fallback Generator: Implements predictable but weekly-variant rotation.
 */
function generateRuleBasedSchedule(input: RaScheduleInput): RaScheduleOutput {
  const assignments: any[] = [];
  const start = parseISO(input.startDate);
  
  // Create a stable but weekly-shuffled list of facilities
  // We use the week of the year as a seed-like offset to ensure variety
  const dayOfYear = Math.floor((start.getTime() - new Date(start.getFullYear(), 0, 0).getTime()) / 86400000);
  const weekSeed = Math.floor(dayOfYear / 7);
  
  // Create a copy and rotate it based on the week seed
  const rotatedFacilities = [...input.facilities];
  for (let i = 0; i < weekSeed % rotatedFacilities.length; i++) {
    rotatedFacilities.push(rotatedFacilities.shift()!);
  }

  // Also rotate RAs so they don't always get the same priority sites
  const rotatedRas = [...input.ras];
  for (let i = 0; i < weekSeed % rotatedRas.length; i++) {
    rotatedRas.push(rotatedRas.shift()!);
  }

  const availableSites = [...rotatedFacilities];

  for (let i = 0; i < 7; i++) {
    const currentDate = addDays(start, i);
    const dayDate = format(currentDate, 'yyyy-MM-dd');
    
    if (isWeekend(currentDate)) continue;
    if (TANZANIA_HOLIDAYS_2026.includes(dayDate)) continue;

    // Use current day to further jitter RA assignments
    const dayRas = [...rotatedRas];
    for (let j = 0; j < i % dayRas.length; j++) {
        dayRas.push(dayRas.shift()!);
    }
    
    dayRas.forEach((ra) => {
        if (availableSites.length === 0) return;

        const fac = availableSites.shift()!;
        let priority: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';

        // Updated nuanced thresholds for better variety
        if (fac.percentage < 15) priority = 'HIGH';
        else if (fac.percentage > 40) priority = 'LOW';

        assignments.push({
            date: dayDate,
            ra_name: ra,
            facility: fac.name,
            priority_level: priority,
            reasoning: `Weekly Rotation Audit: Rotating staff to ${fac.name} to maintain population representation equity and avoid clinical bias.`
        });
    });
  }

  return {
    assignments,
    summary: "SYSTEM ALERT: The deployment plan has been generated using the Rotation Fallback Engine. It enforces unique weekly visits per site and automatically shuffles RA-facility pairings based on the selected week to ensure research variety."
  };
}
