import { NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { isValid } from 'date-fns';

function getAdminDb() {
  if (getApps().length === 0) {
    const b64 = (process.env.FIREBASE_SERVICE_ACCOUNT_B64 || '').replace(/[^A-Za-z0-9+/=]/g, '');
    if (b64) {
      const sa = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
      initializeApp({ credential: cert(sa) });
    } else {
      const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
      const privateKey = (() => { const k = process.env.FIREBASE_ADMIN_PRIVATE_KEY || ''; return k.includes('\\n') ? k.replace(/\\n/g, '\n') : k; })();
      initializeApp({ credential: cert({ projectId, clientEmail, privateKey } as any) });
    }
  }
  return getFirestore();
}

const safeParseDate = (data: any): Date | null => {
  if (!data) return null;
  const dateVal = data.createdAt || data.created_at || data.date || data.enrollment_date || data.firstAncDate;
  if (!dateVal) return null;
  if (dateVal instanceof Date) return dateVal;
  if (typeof dateVal.toDate === 'function') return dateVal.toDate();
  const parsed = new Date(dateVal);
  return isValid(parsed) ? parsed : null;
};

const NotificationOutputSchema = z.array(z.object({
  title: z.string().max(60),
  body: z.string(),
  full_analysis: z.string(),
  recommended_action: z.string(),
  criticality: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  recipients: z.enum(['ADMINS_ONLY', 'ADMINS_AND_RELEVANT_RA', 'ALL_RAS']),
  relevant_ra: z.string().nullable(),
  participant_id: z.string().nullable(),
  facility: z.string().nullable(),
  data_points: z.array(z.string()),
}));

const analysisPrompt = ai.definePrompt({
  name: 'notificationAnalysisPrompt',
  input: { schema: z.object({ trigger: z.string(), data: z.any() }) },
  output: { schema: NotificationOutputSchema },
  prompt: `You are an AI clinical research intelligence system for the Partoma ANC cohort study in Dar es Salaam, Tanzania.
Analysis Trigger: {{{trigger}}}

Study Data Summary:
- Total Enrolled: {{{data.totalEnrolled}}}
- Overdue Pregnancies: {{{data.overdue}}}
- Recent ANC Flow: {{{data.totalANC}}}
- Eligible Women Identified: {{{data.totalEligible}}}
- Conversion Rate: {{{data.conversionRate}}}%
- Forecast (Entering windows): {{{data.dueSoon}}}

Generate actionable notifications based on this trigger. 
If 'daily_report': Generate 2-3 items covering recruitment and urgent actions.
If 'weekly_report': Generate 3 items on trends and facility spotlights.
If 'reminder': Focus on follow-up window prep and overdue cases.

Return a JSON array of objects fitting the schema.`,
});

export async function POST(req: Request) {
  try {
    const { trigger = 'manual', requestedBy = 'system' } = await req.json();
    const db = getAdminDb();
    
    const [regSnap, recSnap] = await Promise.all([
      db.collection('anc_registrations').limit(500).get(),
      db.collection('recruitment_entries').orderBy('date', 'desc').limit(100).get(),
    ]);

    const participants: any[] = regSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const recruitment: any[] = recSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const totalEnrolled = participants.length;
    const today = new Date();

    const overdue = participants.filter((p: any) => {
      const enroll = safeParseDate(p);
      if (!enroll || !p.gestationalAge) return false;
      const daysSince = Math.floor((today.getTime() - enroll.getTime()) / 86400000);
      const currentGA = (p.gestationalAge || 0) + Math.floor(daysSince / 7);
      return currentGA > 42 && !p.survey3_completed;
    }).length;

    const dueSoon = participants.filter((p: any) => {
      const enroll = safeParseDate(p);
      if (!enroll || !p.gestationalAge) return false;
      const daysSince = Math.floor((today.getTime() - enroll.getTime()) / 86400000);
      const currentGA = (p.gestationalAge || 0) + Math.floor(daysSince / 7);
      return (currentGA >= 32 && currentGA <= 34) && !p.survey2_completed;
    }).length;

    const productionRecruitment = recruitment.filter(r => {
        const isTest = r.ra_name === 'Admin' || r.ra_name === 'Test User' || r.ra_name === 'Test';
        return !isTest && r.first_row_flag === 1;
    });

    const recent = productionRecruitment.slice(0, 7);
    const totalANC = recent.reduce((s: number, r: any) => s + (Number(r.total_anc) || 0), 0);
    const totalEligible = recent.reduce((s: number, r: any) => s + (Number(r.eligible) || 0), 0);
    const totalEnrolledRecent = recent.reduce((s: number, r: any) => s + (Number(r.interviewed) || 0), 0);
    const conversionRate = totalEligible > 0 ? ((totalEnrolledRecent / totalEligible) * 100).toFixed(1) : '0';

    const { output: notifications } = await analysisPrompt({
      trigger,
      data: { totalEnrolled, overdue, totalANC, totalEligible, conversionRate, dueSoon }
    });

    if (!notifications) throw new Error("AI failed to generate analysis.");
    
    const batch = db.batch();
    const saved: string[] = [];
    
    for (const n of notifications) {
      const ref = db.collection('notifications').doc();
      batch.set(ref, { 
          ...n, 
          ai_generated: true, 
          created_at: Timestamp.now(), 
          delivered_to: [], 
          read_by: [], 
          actioned_by: null, 
          actioned_at: null, 
          trigger, 
          requested_by: requestedBy 
      });
      saved.push(ref.id);
    }
    
    await batch.commit();

    const urgent = notifications.filter((n: any) => n.criticality === 'CRITICAL' || n.criticality === 'HIGH');
    for (const n of urgent) {
      fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/notifications/send-push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: n.title, body: n.body, criticality: n.criticality }),
      }).catch(() => {});
    }

    return NextResponse.json({ 
        success: true, 
        count: notifications.length, 
        ids: saved, 
        stats: { totalEnrolled, overdue, conversionRate } 
    });
  } catch (err: any) {
    console.error("AI Analysis Failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
