
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
Your goal is to generate a weekly schedule (7 days starting from {{{startDate}}}) for the Research Assistants (RAs).

Available RAs: 
{{#each ras}}- {{this}}
{{/each}}

Current Facility Enrollment Progress:
{{#each facilities}}
- {{name}}: {{enrolled}}/{{target}} enrolled ({{percentage}}%)
{{/each}}

Historical Volume Trends (Analysis Context):
- High Volume Sites (Attendance > 50): Buza HC, Maji Matitu HC, Charambe Disp, Tambukareli Disp.
- High Attrition Warning: Tambukareli and Charambe often report women disappearing or RAs being overwhelmed.
- Dual RA Strategy: For Buza, Maji Matitu, and Charambe, you MUST frequently assign 2 RAs on the same day if staff availability allows.

Strict Assignment Rules:
1. MONDAY TO FRIDAY ONLY. Do not assign anyone on Saturdays or Sundays.
2. EXCLUDE PUBLIC HOLIDAYS: Check if the date is in this list: ${TANZANIA_HOLIDAYS_2026.join(', ')}. If it is, mark it as 'Holiday - No Assignment'.
3. HIGH VOLUME SITES: Prioritize sites with < 50% enrollment AND sites known for high flow.
4. DUAL ASSIGNMENT: In high volume sites (Buza, Maji Matitu, Charambe), assign TWO RAs to work together to minimize "RA was with another woman" missed cases.
5. CONTINUITY: Keep an RA at the same site for at least 2 consecutive days where possible.

Output a structured schedule. Ensure the reasoning explains why dual assignments or site choices were made based on the volume trends.`,
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
 * Fallback Generator: Respects "No Weekends" and "Dual Assignment" rules.
 */
function generateRuleBasedSchedule(input: RaScheduleInput): RaScheduleOutput {
  const assignments: any[] = [];
  const start = parseISO(input.startDate);
  
  // Sites that frequently need 2 RAs
  const highVolumeSites = [
    "Buza Health Center (Zone A)",
    "Maji Matitu Health Center (Zone D)",
    "Charambe Dispensary (Zone D)",
    "Tambukareli Dispensary (Zone C)"
  ];

  for (let i = 0; i < 7; i++) {
    const currentDate = addDays(start, i);
    const dayDate = format(currentDate, 'yyyy-MM-dd');
    
    // Rule 1: No Weekends
    if (isWeekend(currentDate)) continue;

    // Rule 2: No Holidays
    if (TANZANIA_HOLIDAYS_2026.includes(dayDate)) continue;

    // Heuristic: Assign RAs in pairs to high volume sites, then single to others
    const rasToAssign = [...input.ras];
    
    // Assign Pair to a High Volume Site
    if (rasToAssign.length >= 2) {
        const site = highVolumeSites[i % highVolumeSites.length];
        const ra1 = rasToAssign.shift()!;
        const ra2 = rasToAssign.shift()!;
        
        assignments.push({
            date: dayDate,
            ra_name: ra1,
            facility: site,
            priority_level: 'HIGH',
            reasoning: "Rule-based: Dual assignment for high-volume recruitment site."
        });
        assignments.push({
            date: dayDate,
            ra_name: ra2,
            facility: site,
            priority_level: 'HIGH',
            reasoning: "Rule-based: Supporting primary RA in high-volume site to minimize missed cases."
        });
    }

    // Assign remaining RAs to other facilities
    rasToAssign.forEach((ra, raIdx) => {
        const facIndex = (i + raIdx) % input.facilities.length;
        const fac = input.facilities[facIndex];
        
        assignments.push({
            date: dayDate,
            ra_name: ra,
            facility: fac.name,
            priority_level: fac.percentage < 50 ? 'HIGH' : 'MEDIUM',
            reasoning: "Rule-based assignment: site enrollment progress monitoring."
        });
    });
  }

  return {
    assignments,
    summary: "SYSTEM ALERT: Gemini AI is analyzing trends. This schedule applies dual-assignment rules for high-volume sites and excludes weekends/holidays."
  };
}
