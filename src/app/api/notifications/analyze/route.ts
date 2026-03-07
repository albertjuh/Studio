
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Initializes and returns the Firebase Admin Firestore instance.
 * Supports individual environment variables (standard production pattern) 
 * with a fallback to the robust base64 JSON string parsing.
 */
function getAdminDb() {
  if (getApps().length === 0) {
    const b64 = (process.env.FIREBASE_SERVICE_ACCOUNT_B64 || '').replace(/[^A-Za-z0-9+/=]/g, '');
    if (!b64) throw new Error('FIREBASE_SERVICE_ACCOUNT_B64 missing');
    const sa = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
    initializeApp({ credential: cert(sa) });
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
      db.collection('recruitment_entries').orderBy('date', 'desc').limit(50).get(),
    ]);

    const participants: any[] = regSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    const recruitment: any[] = recSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    const totalEnrolled = participants.length;
    const today = new Date();

    // Identify clinical vulnerabilities (Pregnancies past 42 weeks without confirmed delivery)
    const overdue = participants.filter((p: any) => {
      if (!p.createdAt || !p.gestationalAge) return false;
      const enroll = p.createdAt?.toDate ? p.createdAt.toDate() : new Date(p.createdAt);
      const daysSince = Math.floor((today.getTime() - enroll.getTime()) / 86400000);
      return ((p.gestationalAge || 0) + Math.floor(daysSince / 7)) > 42 && !p.delivery_date_confirmed;
    });

    // Calculate conversion metrics using session-grouping to prevent duplicate counts
    const sessionMap: { [key: string]: any } = {};
    recruitment.forEach(r => {
      const dateStr = r.date?.toDate ? r.date.toDate().toISOString().split('T')[0] : r.date_string || 'N/A';
      const key = `${dateStr}_${r.facility}_${r.ra_name}`.toLowerCase();
      if (!sessionMap[key] || r.first_row_flag === 1) {
        sessionMap[key] = r;
      }
    });

    const uniqueSessions = Object.values(sessionMap).slice(0, 14); 
    const totalANC = uniqueSessions.reduce((s: number, r: any) => s + (r.total_anc || 0), 0);
    const totalEligible = uniqueSessions.reduce((s: number, r: any) => s + (r.eligible || 0), 0);
    const totalEnrolledRecent = uniqueSessions.reduce((s: number, r: any) => s + (r.interviewed || 0), 0);
    const conv = totalEligible > 0 ? ((totalEnrolledRecent / totalEligible) * 100).toFixed(1) : '0';

    const prompt = `You are the PartoMa AI Intelligence Officer. Analyze the following Antenatal Care (ANC) cohort data and return a JSON array of critical alerts or strategic insights.
    
    GLOBAL COHORT STATUS:
    - Total Enrolled Participants (Current Size): ${totalEnrolled}
    - Overdue Pregnancies (GA > 42wks, delivery not recorded): ${overdue.length}
    
    RECRUITMENT PERFORMANCE (Last 14 Unique Sessions):
    - Total ANC Attendance: ${totalANC}
    - Eligible Women (1st Visit): ${totalEligible}
    - Successfully Interviewed/Enrolled: ${totalEnrolledRecent}
    - Conversion Rate: ${conv}%
    
    Context: Analysis triggered via ${trigger} by ${requestedBy}.
    
    Return ONLY a JSON array of objects with the following schema:
    [{"title":"string","body":"string","full_analysis":"string","recommended_action":"string","criticality":"CRITICAL"|"HIGH"|"MEDIUM"|"LOW","recipients":"ADMINS_ONLY"|"ADMINS_AND_RELEVANT_RA"|"ALL_RAS","relevant_ra":string|null,"participant_id":string|null,"facility":string|null,"data_points":["string"]}]`;

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
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
