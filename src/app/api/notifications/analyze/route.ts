import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

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

function buildPrompt(trigger: string, data: any): string {
  const { totalEnrolled, overdue, totalANC, totalEligible, totalEnrolledRecent, conversionRate, dueSoon, recent } = data;
  const base = `You are an AI clinical research intelligence system for the Partoma ANC cohort study in Dar es Salaam, Tanzania.`;
  const schema = `Return ONLY a JSON array: [{"title":"max 60 chars","body":"1-2 sentences","full_analysis":"3-5 sentences","recommended_action":"specific action","criticality":"CRITICAL|HIGH|MEDIUM|LOW","recipients":"ADMINS_ONLY|ADMINS_AND_RELEVANT_RA|ALL_RAS","relevant_ra":null,"participant_id":null,"facility":null,"data_points":["stat"]}]`;

  if (trigger === 'daily_report') {
    return `${base} DAILY REPORT for ${new Date().toDateString()}.
Study stats: ${totalEnrolled} total enrolled, last 7 days: ${totalANC} ANC attendance, ${totalEligible} eligible, ${totalEnrolledRecent} enrolled, ${conversionRate}% conversion.
Generate 2-3 notifications: (1) daily recruitment summary with yesterday performance, (2) any urgent action items, (3) conversion rate commentary if below 60%.
Be specific with numbers. ${schema}`;
  }

  if (trigger === 'weekly_report') {
    return `${base} WEEKLY REPORT for week of ${new Date().toDateString()}.
Study stats: ${totalEnrolled} total enrolled, 7-day: ${totalANC} ANC, ${totalEligible} eligible, ${totalEnrolledRecent} enrolled, ${conversionRate}% conversion, ${dueSoon} participants due for follow-up this week.
Generate 3 notifications: (1) weekly performance summary with trend, (2) follow-up reminders for Survey 2/3/4, (3) RA performance or facility spotlight.
${schema}`;
  }

  if (trigger === 'monthly_report') {
    return `${base} MONTHLY REPORT for ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}.
Study stats: ${totalEnrolled} total enrolled, monthly: ${totalANC} ANC attendance, ${totalEligible} eligible, ${totalEnrolledRecent} enrolled, ${conversionRate}% conversion, ${overdue} overdue pregnancies.
Generate 3-4 notifications: (1) monthly enrollment summary vs targets, (2) overdue pregnancy review, (3) survey completion rates, (4) strategic recommendation.
${schema}`;
  }

  if (trigger === 'reminder') {
    return `${base} CLINICAL REMINDERS check.
${dueSoon} participants entering survey windows in next 14 days. ${overdue} overdue pregnancies (GA>42 weeks). ${totalEnrolled} total enrolled.
Generate 1-3 targeted reminder notifications for specific clinical actions needed TODAY. Focus on Survey 2 (34-38wk phone call), Survey 3 (delivery records), Survey 4 (6wk postpartum). Be very specific.
${schema}`;
  }

  // default / manual
  return `${base} Study data: ${totalEnrolled} enrolled, ${overdue} overdue, 7d: ${totalANC} ANC, ${totalEligible} eligible, ${totalEnrolledRecent} enrolled, ${conversionRate}% conversion, trigger: ${trigger}.
Generate 1-3 actionable notifications. ${schema}`;
}

export async function POST(req: Request) {
  try {
    const { trigger = 'manual', requestedBy = 'system' } = await req.json();
    const db = getAdminDb();
    const [regSnap, recSnap] = await Promise.all([
      db.collection('anc_registrations').limit(200).get(),
      db.collection('recruitment_entries').orderBy('date', 'desc').limit(30).get(),
    ]);
    const participants: any[] = regSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const recruitment: any[] = recSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const totalEnrolled = participants.length;
    const today = new Date();

    const overdue = participants.filter((p: any) => {
      if (!p.createdAt || !p.gestationalAge) return false;
      const enroll = p.createdAt?.toDate ? p.createdAt.toDate() : new Date(p.createdAt);
      const daysSince = Math.floor((today.getTime() - enroll.getTime()) / 86400000);
      return ((p.gestationalAge || 0) + Math.floor(daysSince / 7)) > 42 && !p.delivery_date_confirmed;
    }).length;

    const dueSoon = participants.filter((p: any) => {
      if (!p.createdAt || !p.gestationalAge) return false;
      const enroll = p.createdAt?.toDate ? p.createdAt.toDate() : new Date(p.createdAt);
      const daysSince = Math.floor((today.getTime() - enroll.getTime()) / 86400000);
      const currentGA = (p.gestationalAge || 0) + Math.floor(daysSince / 7);
      return (currentGA >= 32 && currentGA <= 34) || (currentGA >= 36 && currentGA <= 38);
    }).length;

    const recent = recruitment.slice(0, 7);
    const totalANC = recent.reduce((s: number, r: any) => s + (r.totalAncAttendance || 0), 0);
    const totalEligible = recent.reduce((s: number, r: any) => s + (r.eligible || 0), 0);
    const totalEnrolledRecent = recent.reduce((s: number, r: any) => s + (r.enrolled || 0), 0);
    const conversionRate = totalEligible > 0 ? ((totalEnrolledRecent / totalEligible) * 100).toFixed(1) : '0';

    const prompt = buildPrompt(trigger, { totalEnrolled, overdue, totalANC, totalEligible, totalEnrolledRecent, conversionRate, dueSoon, recent });

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
      batch.set(ref, { ...n, ai_generated: true, created_at: Timestamp.now(), delivered_to: [], read_by: [], actioned_by: null, actioned_at: null, trigger, requested_by: requestedBy });
      saved.push(ref.id);
    }
    await batch.commit();

    // Send push for HIGH/CRITICAL
    const urgent = notifications.filter((n: any) => n.criticality === 'CRITICAL' || n.criticality === 'HIGH');
    for (const n of urgent) {
      fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://studio-alberts-projects-e0254391.vercel.app'}/api/notifications/send-push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: n.title, body: n.body, criticality: n.criticality }),
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, count: notifications.length, ids: saved, stats: { totalEnrolled, overdue, conversionRate } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
