
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function getAdminDb() {
  if (getApps().length === 0) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (projectId && clientEmail && privateKey) {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    } else {
      const b64 = (process.env.FIREBASE_SERVICE_ACCOUNT_B64 || '').replace(/[^A-Za-z0-9+/=]/g, '');
      if (!b64) throw new Error('Firebase Admin configuration missing');
      const sa = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
      initializeApp({ credential: cert(sa) });
    }
  }
  return getFirestore();
}

export async function POST(req: Request) {
  try {
    const { trigger = 'manual', requestedBy = 'system' } = await req.json();
    const db = getAdminDb();

    const [regSnap, recSnap] = await Promise.all([
      db.collection('anc_registrations').get(),
      db.collection('recruitment_entries').orderBy('date', 'desc').limit(100).get(),
    ]);

    const participants: any[] = regSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    const recruitment: any[] = recSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    const totalEnrolledCount = participants.length;
    const today = new Date();

    // 1. Identify clinical vulnerabilities
    const overdue = participants.filter((p: any) => {
      if (!p.createdAt || !p.gestationalAge) return false;
      const enroll = p.createdAt?.toDate ? p.createdAt.toDate() : new Date(p.createdAt);
      const daysSince = Math.floor((today.getTime() - enroll.getTime()) / 86400000);
      return ((p.gestationalAge || 0) + Math.floor(daysSince / 7)) > 42 && !p.delivery_date_confirmed;
    });

    // 2. Calculate operational conversion & mismatches
    const sessionMap: { [key: string]: any } = {};
    recruitment.forEach(r => {
      const dateStr = r.date?.toDate ? r.date.toDate().toISOString().split('T')[0] : r.date_string || 'N/A';
      const key = `${dateStr}_${r.facility}_${r.ra_name}`.toLowerCase();
      if (!sessionMap[key] || r.first_row_flag === 1) {
        sessionMap[key] = r;
      }
    });

    const uniqueSessions = Object.values(sessionMap);
    const reportedTotalInterviewed = uniqueSessions.reduce((s: number, r: any) => s + (r.interviewed || 0), 0);
    
    // System logic alert: Registry Mismatch
    const mismatchCount = Math.abs(totalEnrolledCount - reportedTotalInterviewed);
    const hasMismatch = mismatchCount > 0;

    const prompt = `You are the PartoMa AI Intelligence Officer. Analyze the data and return a JSON array of strategic alerts.
    
    GLOBAL COHORT STATUS:
    - Total Enrolled (Real Records): ${totalEnrolledCount}
    - Reported Interviews (Logs): ${reportedTotalInterviewed}
    - Registry Mismatch: ${mismatchCount} records difference.
    - Overdue Pregnancies (>42wks): ${overdue.length}
    
    Context: Triggered via ${trigger} by ${requestedBy}.
    
    Return ONLY a JSON array of objects:
    [{"title":"string","body":"string","full_analysis":"string","recommended_action":"string","criticality":"CRITICAL"|"HIGH"|"MEDIUM"|"LOW","recipients":"ADMINS_ONLY"|"ADMINS_AND_RELEVANT_RA"|"ALL_RAS","relevant_ra":string|null,"participant_id":string|null,"facility":string|null,"data_points":["string"]}]`;

    const msg = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = msg.content[0].type === 'text' ? msg.content[0].text : '[]';
    const notes = JSON.parse(text.replace(/```json|```/g, '').trim());

    // Add manual "System Logic" alert if mismatch is large
    if (hasMismatch && mismatchCount > 5) {
        notes.push({
            title: "System Logic: Large Registry Mismatch",
            body: `Integrity Alert: There are ${totalEnrolledCount} women registered, but RAs reported ${reportedTotalInterviewed} interviews. Please audit recent logs.`,
            full_analysis: "The sum of interviewed participants in workload logs does not match the total count of registrations in the Firestore database.",
            recommended_action: "Review 'System Logs' and filter by RA to identify who is reporting interviews without registering the participants.",
            criticality: "HIGH",
            recipients: "ADMINS_ONLY",
            relevant_ra: null,
            participant_id: null,
            facility: "Global Municipal Audit",
            data_points: [`Mismatch: ${mismatchCount}`]
        });
    }

    const batch = db.batch();
    for (const n of notes) {
      const ref = db.collection('notifications').doc();
      batch.set(ref, {
        ...n,
        ai_generated: n.title.includes("Officer") || !n.title.includes("System"),
        created_at: Timestamp.now(),
        delivered_to: [],
        read_by: [],
        trigger,
        requested_by: requestedBy
      });
    }

    await batch.commit();

    return NextResponse.json({ success: true, count: notes.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
