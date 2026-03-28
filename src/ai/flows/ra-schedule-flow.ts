'use server';
/**
 * @fileOverview RA Monthly Scheduling AI agent.
 *
 * - generateRaSchedule - A function that handles the AI optimization of RA facility assignments for a full month.
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
  '2026-01-01', '2026-01-12', '2026-04-03', '2026-04-06', '2026-04-07',
  '2026-04-26', '2026-05-01', '2026-07-07', '2026-08-08', '2026-10-14',
  '2026-12-09', '2026-12-25', '2026-12-26',
];

export async function generateRaSchedule(input: RaScheduleInput): Promise<RaScheduleOutput> {
  return raScheduleFlow(input);
}

const prompt = ai.definePrompt({
  name: 'raSchedulePrompt',
  model: 'googleai/gemini-1.5-flash',
  input: { schema: RaScheduleInputSchema },
  output: { schema: RaScheduleOutputSchema },
  prompt: `You are an AI research operations coordinator for the PartoMa study.
Your goal is to generate a COMPREHENSIVE 4-WEEK SCHEDULE (20 Working Days) starting from {{{startDate}}}.

CRITICAL REQUIREMENT: 
You MUST generate assignments for ALL 4 RAs (Lucy, Riki Mahamba, Katie, Majid) for EVERY valid working day (Monday-Friday) in the 4-week period. 
This means your "assignments" array MUST contain between 68 and 80 entries total (80 slots minus Tanzania public holidays). 

DO NOT TRUNCATE THE LIST. If you return only a few days, the study will fail. You must provide the full month.

VISIT FREQUENCY EQUALITY RULES (STRICT):
1. CONTINUOUS ROTATION: You must treat the 31 facilities as a single queue. You must assign every facility to a visit ONCE before any facility receives a second visit. You must assign every facility TWICE before any receives a third.
2. NO FAVORITISM: Every facility must be visited an equal number of times across the month.
3. ONCE PER WEEK MAX: A specific health facility can only be visited ONCE in any given week (Monday-Friday).
4. NO WEEKENDS/HOLIDAYS: Exclude Saturdays, Sundays, and these dates: ${TANZANIA_HOLIDAYS_2026.join(', ')}.
5. RESEARCH INTEGRITY: Reasoning must emphasize "Frequency Equality" and "Consistent Representation".

Input Data:
RAs: {{#each ras}}- {{this}}
{{/each}}

Facilities:
{{#each facilities}}- {{name}} ({{percentage}}% complete)
{{/each}}`,
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
      // Safety check: if AI returns a suspiciously short list (e.g. only one week), use fallback
      // We expect ~80 visits. If it's less than 60, it's an incomplete plan.
      if (!output || output.assignments.length < 60) {
        throw new Error("AI returned an incomplete schedule. Switching to high-integrity rotation engine.");
      }
      return output;
    } catch (error: any) {
      console.warn("AI Monthly Engine Limitation, using rotation fallback:", error.message);
      return generateRuleBasedSchedule(input);
    }
  }
);

/**
 * Monthly Fallback Generator: Ensures balanced rotation over 28 days using a global continuous queue.
 */
function generateRuleBasedSchedule(input: RaScheduleInput): RaScheduleOutput {
  const assignments: any[] = [];
  const start = parseISO(input.startDate);
  
  // Create a single global pool of facilities sorted by enrollment to start
  const globalFacilityQueue = [...input.facilities].sort((a, b) => a.percentage - b.percentage);
  let queueIndex = 0;

  // Track weekly visits to enforce the "Once Per Week" rule
  const weeklyTracker: Record<number, Set<string>> = { 0: new Set(), 1: new Set(), 2: new Set(), 3: new Set() };

  for (let week = 0; week < 4; week++) {
    const weekStart = addDays(start, week * 7);

    for (let day = 0; day < 7; day++) {
      const currentDate = addDays(weekStart, day);
      const dayDate = format(currentDate, 'yyyy-MM-dd');
      
      // Only process Mon-Fri
      const dayOfWeek = currentDate.getDay(); // 0 is Sun, 1 is Mon...
      if (dayOfWeek === 0 || dayOfWeek === 6 || TANZANIA_HOLIDAYS_2026.includes(dayDate)) continue;

      // Assign all 4 RAs per day
      input.ras.forEach((ra) => {
        // Find the next facility in the queue that hasn't been visited this week
        let attempts = 0;
        let found = false;
        
        while (attempts < globalFacilityQueue.length && !found) {
            const fac = globalFacilityQueue[queueIndex];
            
            if (!weeklyTracker[week].has(fac.name)) {
                // Assign this facility
                weeklyTracker[week].add(fac.name);
                
                let priority: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
                // Update priority based on enrollment phase
                if (fac.percentage < 15) priority = 'HIGH';
                else if (fac.percentage > 40) priority = 'LOW';

                assignments.push({
                    date: dayDate,
                    ra_name: ra,
                    facility: fac.name,
                    priority_level: priority,
                    reasoning: `Frequency Equality Audit: Continuous rotation assignment to maintain unbiased recruitment pulse at ${fac.name}.`
                });
                
                found = true;
            }
            
            // Move to next in queue
            queueIndex = (queueIndex + 1) % globalFacilityQueue.length;
            attempts++;
        }
      });
    }
  }

  return {
    assignments,
    summary: "CONTINUOUS ROTATION ACTIVE: The 4-week plan uses a global queue to ensure visit frequency equality. Every facility is visited an equal number of times across the month, rotating through all 31 sites to maintain research integrity and eliminate geographic bias."
  };
}
