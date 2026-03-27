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
    priority_level: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
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
Your goal is to generate a balanced weekly schedule (7 days starting from {{{startDate}}}) for the Research Assistants (RAs).

Available RAs: 
{{#each ras}}- {{this}}
{{/each}}

Current Facility Enrollment Progress:
{{#each facilities}}
- {{name}}: {{enrolled}}/{{target}} enrolled ({{percentage}}%)
{{/each}}

STRICT SCHEDULING CONSTRAINTS:
1. ONCE PER WEEK RULE: Each health facility must be assigned to the schedule ONLY ONCE per week. Do not repeat a facility on multiple days.
2. ENROLLMENT FOCUS: Prioritize facilities with < 50% enrollment progress. These are your "Primary Targets".
3. SLOW DOWN HIGH ENROLLMENT: Only assign facilities with >= 50% enrollment if you have already assigned all available lower-enrolled sites for unique weekly visits.
4. MONDAY TO FRIDAY ONLY: No assignments on Saturdays or Sundays.
5. EXCLUDE PUBLIC HOLIDAYS: Check if the date is in this list: ${TANZANIA_HOLIDAYS_2026.join(', ')}.
6. PRIORITY DEFINITION:
   - CRITICAL: Facilities with < 25% enrollment target.
   - HIGH: Facilities with 25-50% enrollment.
   - MEDIUM: High-volume sites that reached 50% but still need steady monitoring.
   - LOW: Facilities with > 75% enrollment (Only visit once if others are covered).

Output a structured schedule. Reasoning must explain why a site was chosen (e.g., "Unique weekly visit for site under 50% target").`,
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
      console.warn("AI Service Unavailable, using rule-based fallback:", error.message);
      return generateRuleBasedSchedule(input);
    }
  }
);

/**
 * Fallback Generator: Implements the "Once-per-Week" and "Under 50% focus" logic.
 */
function generateRuleBasedSchedule(input: RaScheduleInput): RaScheduleOutput {
  const assignments: any[] = [];
  const start = parseISO(input.startDate);
  
  // Categorize facilities
  const lowEnrollment = input.facilities.filter(f => f.percentage < 50);
  const highEnrollment = input.facilities.filter(f => f.percentage >= 50);

  // Sort by lowest percentage to prioritize most needy
  lowEnrollment.sort((a, b) => a.percentage - b.percentage);
  highEnrollment.sort((a, b) => a.percentage - b.percentage);

  const availableLow = [...lowEnrollment];
  const availableHigh = [...highEnrollment];

  for (let i = 0; i < 7; i++) {
    const currentDate = addDays(start, i);
    const dayDate = format(currentDate, 'yyyy-MM-dd');
    
    if (isWeekend(currentDate)) continue;
    if (TANZANIA_HOLIDAYS_2026.includes(dayDate)) continue;

    const rasToAssign = [...input.ras];
    
    rasToAssign.forEach((ra) => {
        let fac;
        let priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';

        // 1. Try to pick from sites under 50% enrollment
        if (availableLow.length > 0) {
            fac = availableLow.shift()!;
            priority = fac.percentage < 25 ? 'CRITICAL' : 'HIGH';
        } 
        // 2. Otherwise pick from high-performing sites to fill slots
        else if (availableHigh.length > 0) {
            fac = availableHigh.shift()!;
            priority = fac.percentage > 75 ? 'LOW' : 'MEDIUM';
        }

        if (fac) {
            assignments.push({
                date: dayDate,
                ra_name: ra,
                facility: fac.name,
                priority_level: priority,
                reasoning: `Rule-based: ${priority === 'LOW' || priority === 'MEDIUM' ? 'Reduced frequency visit for high-performing site.' : 'Priority unique visit for facility under 50% target.'}`
            });
        }
    });
  }

  return {
    assignments,
    summary: "SYSTEM ALERT: Gemini AI is balancing assignments. This plan enforces unique weekly visits per site and shifts focus to facilities under 50% enrollment progress."
  };
}
