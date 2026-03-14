import { NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { FACILITY_TARGETS } from '@/lib/facility-targets';

function getAdminDb() {
  if (getApps().length === 0) {
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = (() => { const k = process.env.FIREBASE_ADMIN_PRIVATE_KEY || ''; return k.includes('\\n') ? k.replace(/\\n/g, '\n') : k; })();
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey } as any) });
  }
  return getFirestore();
}

export async function GET() {
  try {
    const db = getAdminDb();
    const snap = await db.collection('anc_registrations').get();
    const counts: Record<string, number> = {};
    snap.docs.forEach(d => {
      const facility = d.data().healthFacility || d.data().facility || '';
      if (facility) counts[facility] = (counts[facility] || 0) + 1;
    });
    const status: Record<string, { enrolled: number; target: number; remaining: number; isFull: boolean; percentage: number }> = {};
    for (const [facility, target] of Object.entries(FACILITY_TARGETS)) {
      const enrolled = counts[facility] || 0;
      const remaining = Math.max(0, target - enrolled);
      const percentage = target > 0 ? Math.round((enrolled / target) * 100) : 100;
      status[facility] = { enrolled, target, remaining, isFull: enrolled >= target, percentage };
    }
    return NextResponse.json({ success: true, status, totalEnrolled: snap.size, totalTarget: 1148 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
