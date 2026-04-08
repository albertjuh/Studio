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
  const { totalEnrolled, overdue, totalANC, totalEligible, totalEnrolledRecent, conversionRate, dueSoon } = data;
  const base = `You are an AI clinical research intelligence system for the Partoma ANC cohort study in Dar es Salaam, Tanzania.`;
  const schema = `Return ONLY a JSON array: [{"title":"max 60 chars","body":"1-2 sentences","full_analysis":"3-5 sentences","recommended_action":"specific action","criticality":"CRITICAL|HIGH|MEDIUM|LOW","recipients":"ADMINS_ONLY|ADMINS_AND_RELEVANT_RA|ALL_RAS","relevant_ra":null,"participant_id":null,"facility":null,"data_points":["stat"]}]`;
  if (trigger === 'daily_report') return `${base} DAILY REPORT ${new Date().toDateString()}. ${totalEnrolled} enrolled, 7d: ${totalANC} ANC, ${totalEligible} eligible, ${totalEnrolledRecent} enrolled, ${conversionRate}% conversion. 2-3 notifications: daily summary, urgent actions. ${schema}`;
  if (trigger === 'weekly_report') return `${base} WEEKLY REPORT. ${totalEnrolled} enrolled, ${dueSoon} due follow-up, ${conversionRate}% conversion. 3 notifications: weekly summary, follow-up reminders, spotlight. ${schema}`;
  if (trigger === 'monthly_report') return `${base} MONTHLY REPORT ${new Date().toLocaleString('default',{month:'long',year:'numeric'})}. ${totalEnrolled} enrolled, ${overdue} overdue. 3-4 notifications: monthly summary, overdue, survey rates, recommendation. ${schema}`;
  if (trigger === 'reminder') return `${base} REMINDERS. ${dueSoon} entering survey windows. ${overdue} overdue. Generate 1-3 targeted reminders for Survey 2/3/4. ${schema}`;
  return `${base} Data: ${totalEnrolled} enrolled, ${overdue} overdue, ${conversionRate}% conversion, trigger: ${trigger}. Generate 1-3 notifications. ${schema}`;
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
    const totalANC = recent.reduce((s: number, r: any) => s + (r.total_anc || 0), 0);
    const totalEligible = recent.reduce((s: number, r: any) => s + (r.eligible || 0), 0);
    const totalEnrolledRecent = recent.reduce((s: number, r: any) => s + (r.interviewed || 0), 0);
    const conversionRate = totalEligible > 0 ? ((totalEnrolledRecent / totalEligible) * 100).toFixed(1) : '0';
    const prompt = buildPrompt(trigger, { totalEnrolled, overdue, totalANC, totalEligible, totalEnrolledRecent, conversionRate, dueSoon });
    const message = await client.messages.create({ model: 'claude-sonnet-4-20250514', max_tokens: 1500, messages: [{ role: 'user', content: prompt }] });
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
    const urgent = notifications.filter((n: any) => n.criticality === 'CRITICAL' || n.criticality === 'HIGH');
    for (const n of urgent) {
      fetch('https://studio-alberts-projects-e0254391.vercel.app/api/notifications/send-push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: n.title, body: n.body, criticality: n.criticality }) }).catch(() => {});
    }
    return NextResponse.json({ success: true, count: notifications.length, ids: saved, stats: { totalEnrolled, overdue, conversionRate } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}