
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
Your goal is to generate a balanced weekly schedule (Monday to Friday starting from {{{startDate}}}) for the Research Assistants (RAs).

Available RAs: 
{{#each ras}}- {{this}}
{{/each}}

Current Facility Enrollment Progress:
{{#each facilities}}
- {{name}}: {{enrolled}}/{{target}} enrolled ({{percentage}}%)
{{/each}}

RESEARCH INTEGRITY & CONSISTENCY RULES:
1. REPRESENTATION EQUITY: The primary goal is to ensure every facility is recruited evenly. Each health facility represents a distinct sub-population. To avoid selection bias, maintain a steady recruitment pulse at EVERY site.
2. ONCE PER WEEK RULE: Each health facility must be assigned to the schedule ONLY ONCE per week. With 31 sites and 20 RA-days (4 RAs x 5 days), you must rotate which sites are visited to ensure global coverage.
3. MOMENTUM MAINTENANCE: High-performing sites (>= 50%) must continue to be visited consistently to build a robust dataset. Do not ignore them.
4. MONDAY TO FRIDAY ONLY: No assignments on Saturdays or Sundays.
5. EXCLUDE PUBLIC HOLIDAYS: Check if the date is in this list: ${TANZANIA_HOLIDAYS_2026.join(', ')}.
6. PRIORITY DEFINITION (Balanced):
   - CRITICAL: Stalled sites with < 5% enrollment (Needs urgent startup support).
   - HIGH: Early recruitment sites (5% - 30%).
   - MEDIUM: Developing sites (30% - 70%).
   - LOW: Mature sites (> 70% target reached).

Output a structured schedule. Reasoning must emphasize "Research Consistency" and "Representation Equity".`,
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
 * Fallback Generator: Implements the "Once-per-Week" and "Even Representation" logic.
 */
function generateRuleBasedSchedule(input: RaScheduleInput): RaScheduleOutput {
  const assignments: any[] = [];
  const start = parseISO(input.startDate);
  
  // Sort facilities to prioritize representation
  const sortedFacilities = [...input.facilities].sort((a, b) => a.percentage - b.percentage);
  const availableSites = [...sortedFacilities];

  for (let i = 0; i < 7; i++) {
    const currentDate = addDays(start, i);
    const dayDate = format(currentDate, 'yyyy-MM-dd');
    
    if (isWeekend(currentDate)) continue;
    if (TANZANIA_HOLIDAYS_2026.includes(dayDate)) continue;

    const rasToAssign = [...input.ras];
    
    rasToAssign.forEach((ra) => {
        if (availableSites.length === 0) return;

        const fac = availableSites.shift()!;
        let priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';

        if (fac.percentage < 5) priority = 'CRITICAL';
        else if (fac.percentage < 30) priority = 'HIGH';
        else if (fac.percentage > 70) priority = 'LOW';

        assignments.push({
            date: dayDate,
            ra_name: ra,
            facility: fac.name,
            priority_level: priority,
            reasoning: `Consistency Audit: Maintaining a steady recruitment pulse at ${fac.name} to ensure population representation equity.`
        });
    });
  }

  return {
    assignments,
    summary: "SYSTEM ALERT: The deployment plan has been generated to ensure research consistency. It enforces unique weekly visits per site and balances geographic representation across the Temeke municipality."
  };
}
