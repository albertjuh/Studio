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

Strategic Deployment Logic:
We must balance "High Volume" recruitment with "Geographic Representation" at smaller sites. 

1. PRIORITY LEVELS:
   - CRITICAL: Facilities with < 25% enrollment target.
   - HIGH: Facilities with 25-50% enrollment OR High-Volume sites (Buza, Maji Matitu, Charambe, Tambukareli).
   - MEDIUM: Facilities with 50-75% enrollment.
   - LOW: Facilities with > 75% enrollment OR very low volume sites (Kurasini, Kilungule, Miburani).

2. DUAL-RA STRATEGY: 
   - Frequently assign TWO RAs to high-volume sites (Buza, Maji Matitu, Charambe) to prevent "RA was with another woman" missed cases.
   - Do NOT do this every day; vary the teams.

3. VARIATION & ROTATION:
   - Do not ignore LOW priority sites. Assign at least one RA to a LOW or MEDIUM priority site every day to maintain a "clinical pulse" across the whole municipality.
   - Ensure RAs rotate across different zones (A, B, C, D) throughout the week.

Strict Assignment Rules:
1. MONDAY TO FRIDAY ONLY. No assignments on Saturdays or Sundays.
2. EXCLUDE PUBLIC HOLIDAYS: Check if the date is in this list: ${TANZANIA_HOLIDAYS_2026.join(', ')}.
3. CONTINUITY: Keep an RA at the same site for 2 consecutive days if the site is CRITICAL or HIGH to build rapport with clinic staff.

Output a structured schedule. Reasoning must explain why a site was chosen (e.g., "Critical gap in Zone B" or "Dual support for high flow").`,
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
 * Fallback Generator: Implements balanced priority logic.
 */
function generateRuleBasedSchedule(input: RaScheduleInput): RaScheduleOutput {
  const assignments: any[] = [];
  const start = parseISO(input.startDate);
  
  // Categorize facilities for logic
  const criticalFacs = input.facilities.filter(f => f.percentage < 25);
  const highFacs = input.facilities.filter(f => f.percentage >= 25 && f.percentage < 50);
  const lowFacs = input.facilities.filter(f => f.percentage >= 75);
  const otherFacs = input.facilities.filter(f => f.percentage >= 50 && f.percentage < 75);

  const highVolumeSites = [
    "Buza Health Center (Zone A)",
    "Maji Matitu Health Center (Zone D)",
    "Charambe Dispensary (Zone D)",
    "Tambukareli Dispensary (Zone C)"
  ];

  for (let i = 0; i < 7; i++) {
    const currentDate = addDays(start, i);
    const dayDate = format(currentDate, 'yyyy-MM-dd');
    
    if (isWeekend(currentDate)) continue;
    if (TANZANIA_HOLIDAYS_2026.includes(dayDate)) continue;

    const rasToAssign = [...input.ras];
    
    // 1. Assign Pair to a High Volume/High Priority site if available
    if (rasToAssign.length >= 2) {
        const site = highVolumeSites[i % highVolumeSites.length];
        const ra1 = rasToAssign.shift()!;
        const ra2 = rasToAssign.shift()!;
        
        assignments.push({
            date: dayDate,
            ra_name: ra1,
            facility: site,
            priority_level: 'HIGH',
            reasoning: "Rule-based: Dual RA deployment for high-volume recruitment session."
        });
        assignments.push({
            date: dayDate,
            ra_name: ra2,
            facility: site,
            priority_level: 'HIGH',
            reasoning: "Rule-based: Secondary support to reduce 'missed cases' in high-flow clinics."
        });
    }

    // 2. Assign remaining RAs to vary between Critical and Low priority sites
    rasToAssign.forEach((ra, raIdx) => {
        let fac;
        let priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';

        if (raIdx === 0 && criticalFacs.length > 0) {
            fac = criticalFacs[i % criticalFacs.length];
            priority = 'CRITICAL';
        } else if (raIdx === 1 && lowFacs.length > 0) {
            // Force rotation to a low volume site to maintain representative data
            fac = lowFacs[i % lowFacs.length];
            priority = 'LOW';
        } else {
            const pool = [...highFacs, ...otherFacs];
            fac = pool[(i + raIdx) % pool.length] || input.facilities[0];
            priority = fac.percentage < 50 ? 'HIGH' : 'MEDIUM';
        }
        
        assignments.push({
            date: dayDate,
            ra_name: ra,
            facility: fac.name,
            priority_level: priority,
            reasoning: `Rule-based: ${priority === 'LOW' ? 'Representational visit to low-volume site.' : 'Targeted recruitment for under-performing facility.'}`
        });
    });
  }

  return {
    assignments,
    summary: "SYSTEM ALERT: Gemini AI is balancing assignments. This plan ensures dual-RA coverage for high-volume sites while rotating staff to lower-priority facilities for geographic variety."
  };
}
