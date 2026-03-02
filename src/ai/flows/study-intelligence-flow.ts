
'use server';
/**
 * @fileOverview PartoMa Study Intelligence AI Agent.
 *
 * - analyzeStudyStatus - Analyzes enrollment, recruitment, and participant tracking tasks.
 * - AnalyzeStudyInput - The input type for the analysis.
 * - AnalyzeStudyOutput - The return type for the analysis.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AnalyzeStudyInputSchema = z.object({
  reportType: z.enum(['daily', 'weekly']).describe('The frequency/type of analysis.'),
  siteStats: z.array(z.object({
    facility: z.string(),
    enrolledCount: z.number(),
    recruitmentRate: z.number(),
  })).describe('Current stats per health facility.'),
  atRiskParticipants: z.array(z.object({
    id: z.string(),
    name: z.string(),
    reason: z.string(),
    lastContact: z.string(),
    phoneNumber: z.array(z.string()).optional(),
  })).describe('Participants identified as needing outreach (overdue, lost to follow-up).'),
  targetEnrollment: z.number().describe('The study target goal.'),
  currentTotal: z.number().describe('Total study population to date.'),
});

export type AnalyzeStudyInput = z.infer<typeof AnalyzeStudyInputSchema>;

const AnalyzeStudyOutputSchema = z.object({
  notifications: z.array(z.object({
    criticality: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
    recipients: z.enum(['ADMINS_ONLY', 'ADMINS_AND_RELEVANT_RA', 'ALL_RAS']),
    title: z.string(),
    body: z.string(),
    fullAnalysis: z.string(),
    recommendedAction: z.string(),
    participantId: z.string().nullable(),
    facility: z.string().nullable(),
    isOutreachTask: z.boolean().describe('Whether this is a task for staff to contact a participant.'),
  })),
  summary: z.object({
    headline: z.string(),
    status: z.enum(['on_track', 'behind', 'critical']),
    keyWins: z.array(z.string()),
    keyConcerns: z.array(z.string()),
    aiRecommendation: z.string(),
  }),
});

export type AnalyzeStudyOutput = z.infer<typeof AnalyzeStudyOutputSchema>;

export async function analyzeStudyStatus(input: AnalyzeStudyInput): Promise<AnalyzeStudyOutput> {
  return analyzeStudyFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeStudyPrompt',
  input: { schema: AnalyzeStudyInputSchema },
  output: { schema: AnalyzeStudyOutputSchema },
  prompt: `You are the AI Intelligence Engine for the PartoMa ANC Cohort Study.
Your goal is to scan study data for vulnerabilities and generate tasks for study staff.

IMPORTANT: Participants do NOT have access to this system. All "Outreach" tasks are for STAFF to execute via phone or visit.

REPORT TYPE: {{{reportType}}}
TARGET: {{{targetEnrollment}}}
CURRENT TOTAL: {{{currentTotal}}}

SITE STATS:
{{#each siteStats}}
- {{facility}}: {{enrolledCount}} enrolled, {{recruitmentRate}}% recruitment rate
{{/each}}

AT-RISK PARTICIPANTS (Staff follow-up needed):
{{#each atRiskParticipants}}
- {{name}} (ID: {{id}}): {{reason}} (Last Contact: {{lastContact}})
{{/each}}

INTELLIGENCE TASKS:
1. Scan for critical vulnerabilities (e.g., participants past 42 weeks gestation, data anomalies).
2. Generate STAFF-FACING outreach tasks. If a participant needs an appointment reminder, create a task for the RA.
   - Example Task: "Mamake [Name] anahitaji kukumbushwa Survey 2. Piga simu namba: {{phoneNumber.[0]}}"
3. Celebrate recruitment milestones at specific sites.
4. Flag facilities where recruitment has dropped significantly.

Provide specific, actionable recommendations for study leads and RAs. Mark participant-related follow-ups as isOutreachTask: true.`,
});

const analyzeStudyFlow = ai.defineFlow(
  {
    name: 'analyzeStudyFlow',
    inputSchema: AnalyzeStudyInputSchema,
    outputSchema: AnalyzeStudyOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
