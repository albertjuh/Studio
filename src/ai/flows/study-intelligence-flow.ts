
'use server';
/**
 * @fileOverview PartoMa Study Intelligence AI Agent.
 *
 * - analyzeStudyStatus - Analyzes enrollment, recruitment, and participant risks.
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
  })).describe('Participants identified as at-risk (overdue, lost to follow-up).'),
  targetEnrollment: z.number().describe('The study target goal.'),
  currentTotal: z.number().describe('Total study population to date.'),
});

export type AnalyzeStudyInput = z.infer<typeof AnalyzeStudyInputSchema>;

const AnalyzeStudyOutputSchema = z.object({
  notifications: z.array(z.object({
    criticality: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
    recipients: z.enum(['ADMINS_ONLY', 'ADMINS_AND_RELEVANT_RA', 'ALL_RAS', 'PARTICIPANTS', 'SPECIFIC_PARTICIPANT']),
    title: z.string(),
    body: z.string(),
    fullAnalysis: z.string(),
    recommendedAction: z.string(),
    participantId: z.string().nullable(),
    facility: z.string().nullable(),
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
  prompt: `You are the AI Intelligence Engine for the PartoMa ANC Cohort Study in Tanzania.
Analyze the following study data and generate actionable notifications for staff and outreach for participants.

REPORT TYPE: {{{reportType}}}
TARGET: {{{targetEnrollment}}}
CURRENT TOTAL: {{{currentTotal}}}

SITE STATS:
{{#each siteStats}}
- {{facility}}: {{enrolledCount}} enrolled, {{recruitmentRate}}% recruitment rate
{{/each}}

AT-RISK PARTICIPANTS:
{{#each atRiskParticipants}}
- {{name}} (ID: {{id}}): {{reason}} (Last Contact: {{lastContact}})
{{/each}}

INTELLIGENCE TASKS:
1. Identify critical vulnerabilities (overdue pregnancies, sites with dropping rates).
2. Generate patient-facing outreach if a participant needs an appointment reminder or check-in.
   - For PARTICIPANTS outreach, use warm, clinical Swahili/English mixed where appropriate.
   - Example: "Mama [Name], PartoMa inakukumbusha kliniki ya Survey 2 leo. Tafadhali fika kituoni."
3. Provide staff-level recommendations for study leads.

Identify vulnerabilities, celebrate progress, and provide specific recommendations for both staff and participants.`,
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
