
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { isValid } from 'date-fns';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

/**
 * Robust Date Parser for Analysis
 */
const safeParseDate = (data: any): Date | null => {
  if (!data) return null;
  const dateVal = data.createdAt || data.created_at || data.date || data.enrollment_date || data.firstAncDate;
  if (!dateVal) return null;
  if (dateVal instanceof Date) return dateVal;
  if (typeof dateVal.toDate === 'function') return dateVal.toDate();
  const parsed = new Date(dateVal);
  return isValid(parsed) ? parsed : null;
};

function buildPrompt(trigger: string, data: any): string {
  const { totalEnrolled, overdue, totalANC, totalEligible, totalEnrolledRecent, conversionRate, dueSoon } = data;
  const base = `You are an AI clinical research intelligence system for the Partoma ANC cohort study in Dar es Salaam, Tanzania.`;
  const schema = `Return ONLY a JSON array: [{"title":"max 60 chars","body":"1-2 sentences","full_analysis":"3-5 sentences","recommended_action":"specific action","criticality":"CRITICAL|HIGH|MEDIUM|LOW","recipients":"ADMINS_ONLY|ADMINS_AND_RELEVANT_RA|ALL_RAS","relevant_ra":null,"participant_id":null,"facility":null,"data_points":["stat"]}]`;

  if (trigger === 'daily_report') {
    return `${base} DAILY REPORT for ${new Date().toDateString()}.
Study stats: ${totalEnrolled} total enrolled participants in the verified registry. 
Activity in last 7 days (Production Logs): ${totalANC} total ANC attendance, ${totalEligible} eligible women identified, ${totalEnrolledRecent} women enrolled today/recently, giving a ${conversionRate}% conversion rate.
Generate 2-3 notifications: (1) daily recruitment summary, (2) any urgent action items, (3) commentary on conversion rate.
Be specific with numbers. ${schema}`;
  }

  if (trigger === 'weekly_report') {
    return `${base} WEEKLY REPORT for week of ${new Date().toDateString()}.
Study stats: ${totalEnrolled} total registry records. 
Performance: ${totalANC} ANC flow, ${totalEligible} eligible, ${totalEnrolledRecent} enrolled (${conversionRate}% rate). ${dueSoon} participants due for follow-up windows this week.
Generate 3 notifications: (1) weekly performance trend, (2) follow-up window prep reminders, (3) facility spotlight.
${schema}`;
  }

  if (trigger === 'reminder') {
    return `${base} CLINICAL REMINDERS check.
${dueSoon} participants entering survey windows in next 14 days. ${overdue} overdue pregnancies (GA>42 weeks).
Generate 1-3 targeted reminders for Survey 2 (34-38wk phone), Survey 3 (Delivery), or Survey 4 (Postpartum).
${schema}`;
  }

  return `${base} Study data: ${totalEnrolled} enrolled, ${overdue} overdue, recruitment: ${conversionRate}% conversion. Trigger: ${trigger}.
Generate 1-3 actionable notifications. ${schema}`;
}

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

    // 1. Calculate Overdue/Due Soon from Registry
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
      // Forecast: Survey 2 window (34-38) prep starts early at 32 weeks
      return (currentGA >= 32 && currentGA <= 34) && !p.survey2_completed;
    }).length;

    // 2. Analyze Recruitment Performance (Corrected Fields)
    const productionRecruitment = recruitment.filter(r => {
        const isTest = r.ra_name === 'Admin' || r.ra_name === 'Test User' || r.ra_name === 'Test';
        return !isTest && r.first_row_flag === 1;
    });

    const recent = productionRecruitment.slice(0, 7);
    const totalANC = recent.reduce((s: number, r: any) => s + (Number(r.total_anc) || 0), 0);
    const totalEligible = recent.reduce((s: number, r: any) => s + (Number(r.eligible) || 0), 0);
    const totalEnrolledRecent = recent.reduce((s: number, r: any) => s + (Number(r.interviewed) || 0), 0);
    const conversionRate = totalEligible > 0 ? ((totalEnrolledRecent / totalEligible) * 100).toFixed(1) : '0';

    const prompt = buildPrompt(trigger, { 
        totalEnrolled, 
        overdue, 
        totalANC, 
        totalEligible, 
        totalEnrolledRecent, 
        conversionRate, 
        dueSoon 
    });

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '[]';
    const notifications = JSON.parse(text.replace(/```json|```/g, '').trim());
    
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
    
    if (notifications.length > 0) {
        await batch.commit();
    }

    const urgent = notifications.filter((n: any) => n.criticality === 'CRITICAL' || n.criticality === 'HIGH');
    for (const n of urgent) {
      fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://studio-alberts-projects-e0254391.vercel.app'}/api/notifications/send-push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: n.title, body: n.body, criticality: n.criticality }),
      }).catch(() => {});
    }

    return NextResponse.json({ 
        success: true, 
        count: notifications.length, 
        ids: saved, 
        stats: { totalEnrolled, overdue, conversionRate, recentProcessed: productionRecruitment.length } 
    });
  } catch (err: any) {
    console.error("AI Analysis Failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
