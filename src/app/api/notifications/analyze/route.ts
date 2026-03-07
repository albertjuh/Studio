import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function getAdminDb() {
  if (getApps().length === 0) {
    // Robustly handle the base64 environment variable by trimming hidden whitespace
    const b64 = (process.env.FIREBASE_SERVICE_ACCOUNT_B64 || '').trim();
    
    if (!b64) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_B64 environment variable is missing or empty.");
    }

    try {
      // Ensure we decode and parse the JSON correctly
      const decodedSa = Buffer.from(b64, 'base64').toString('utf8');
      const sa = JSON.parse(decodedSa);
      initializeApp({ credential: cert(sa) });
    } catch (error: any) {
      console.error("Firebase Admin Initialization Error:", error.message);
      // Re-throw so the route handler catches it with context
      throw new Error(`Failed to initialize Firebase Admin (Check base64 format): ${error.message}`);
    }
  }
  return getFirestore();
}

export async function POST(req: Request) {
  try {
    const { trigger = 'manual', requestedBy = 'system' } = await req.json();
    const db = getAdminDb();

    // Fetch snapshot of recent study activity
    const [regSnap, recSnap] = await Promise.all([
      db.collection('anc_registrations').limit(200).get(),
      db.collection('recruitment_entries').orderBy('date', 'desc').limit(30).get(),
    ]);

    const participants: any[] = regSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    const recruitment: any[] = recSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    const totalEnrolled = participants.length;
    const today = new Date();

    // Identify pregnancies past 42 weeks without confirmed delivery
    const overdue = participants.filter((p: any) => {
      if (!p.createdAt || !p.gestationalAge) return false;
      const enroll = p.createdAt?.toDate ? p.createdAt.toDate() : new Date(p.createdAt);
      const daysSince = Math.floor((today.getTime() - enroll.getTime()) / 86400000);
      return ((p.gestationalAge || 0) + Math.floor(daysSince / 7)) > 42 && !p.delivery_date_confirmed;
    });

    // Calculate conversion metrics for the last 7 days using correct deduplicated keys
    const recent = recruitment.slice(0, 7);
    const totalANC = recent.reduce((s: number, r: any) => s + (r.total_anc || 0), 0);
    const totalEligible = recent.reduce((s: number, r: any) => s + (r.eligible || 0), 0);
    const totalEnrolledRecent = recent.reduce((s: number, r: any) => s + (r.interviewed || 0), 0);
    const conv = totalEligible > 0 ? ((totalEnrolledRecent / totalEligible) * 100).toFixed(1) : '0';

    const prompt = `You are the PartoMa AI Intelligence Officer. Analyze the following study data and return a JSON array of critical alerts or insights.
    
    GLOBAL COHORT DATA:
    - Total Enrolled Participants: ${totalEnrolled}
    - Overdue Pregnancies (GA > 42wks): ${overdue.length}
    
    RECENT ACTIVITY (Last 7 Days):
    - Total ANC Attendance: ${totalANC}
    - Eligible Women Identified: ${totalEligible}
    - Successfully Enrolled: ${totalEnrolledRecent}
    - Conversion Rate: ${conv}%
    
    Context: Analysis triggered via ${trigger} by ${requestedBy}.
    
    Return ONLY a JSON array of objects with the following schema:
    [{"title":"string","body":"string","full_analysis":"string","recommended_action":"string","criticality":"CRITICAL"|"HIGH"|"MEDIUM"|"LOW","recipients":"ADMINS_ONLY"|"ADMINS_AND_RELEVANT_RA"|"ALL_RAS","relevant_ra":string|null,"participant_id":string|null,"facility":string|null,"data_points":["string"]}]`;

    const msg = await client.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = msg.content[0].type === 'text' ? msg.content[0].text : '[]';
    const cleanText = text.replace(/```json|```/g, '').trim();
    const notes = JSON.parse(cleanText);

    const batch = db.batch();
    const saved: string[] = [];

    for (const n of notes) {
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

    return NextResponse.json({ 
      success: true, 
      count: notes.length, 
      ids: saved,
      stats: { totalEnrolled, overdue: overdue.length, conversion: conv }
    });
  } catch (err: any) {
    console.error("AI Analysis Route Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
