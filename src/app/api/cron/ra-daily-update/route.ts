
import { NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { format, addDays } from 'date-fns';
import { FACILITY_TARGETS, normalizeSiteName } from '@/lib/facility-targets';

function getAdminDb() {
  if (getApps().length === 0) {
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = (() => { const k = process.env.FIREBASE_ADMIN_PRIVATE_KEY || ''; return k.includes('\\n') ? k.replace(/\\n/g, '\n') : k; })();
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey } as any) });
  }
  return getFirestore();
}

export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const today = new Date();
    const tomorrowStr = format(addDays(today, 1), 'yyyy-MM-dd');

    // 1. Fetch current schedule
    const scheduleRef = db.collection('study_ops').doc('latest_ra_schedule');
    const scheduleSnap = await scheduleRef.get();
    if (!scheduleSnap.exists) return NextResponse.json({ error: 'No schedule found' });
    const schedule = scheduleSnap.data()?.plan;

    // 2. Fetch latest enrollment counts
    const regSnap = await db.collection('anc_registrations').get();
    const counts: Record<string, number> = {};
    regSnap.docs.forEach(d => {
      const facility = d.data().healthFacility || '';
      if (facility) {
        const core = normalizeSiteName(facility);
        counts[core] = (counts[core] || 0) + 1;
      }
    });

    // 3. Review tomorrow's assignments
    let changesMade = false;
    const updatedAssignments = schedule.assignments.map((a: any) => {
      if (a.date === tomorrowStr) {
        const core = normalizeSiteName(a.facility);
        const enrolled = counts[core] || 0;
        const target = FACILITY_TARGETS[a.facility] || 0;

        if (enrolled >= target && target > 0) {
          // Pivot logic: find next facility in rotation
          const facilities = Object.keys(FACILITY_TARGETS);
          const currentIdx = facilities.indexOf(a.facility);
          const nextFacility = facilities[(currentIdx + 1) % facilities.length];
          
          changesMade = true;
          return {
            ...a,
            facility: nextFacility,
            reasoning: `DAILY AI PIVOT: Original site (${a.facility}) reached enrollment target. RA redirected to ${nextFacility}.`
          };
        }
      }
      return a;
    });

    // 4. Update the document with refinement meta
    await scheduleRef.update({
      'plan.assignments': updatedAssignments,
      'plan.summary': `DAILY REFINEMENT ACTIVE: ${changesMade ? 'Tomorrow\'s plan adjusted based on 17:00 recruitment audit.' : 'Schedule validated against current registry - no pivots required.'}`,
      last_daily_sync: FieldValue.serverTimestamp(),
      sync_outcome: changesMade ? 'ADJUSTED' : 'VALIDATED'
    });

    return NextResponse.json({ success: true, changesMade });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
