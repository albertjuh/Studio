import { NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

function getAdminDb() {
  if (getApps().length === 0) {
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = (() => { const k = process.env.FIREBASE_ADMIN_PRIVATE_KEY || ''; return k.includes('\\n') ? k.replace(/\\n/g, '\n') : k; })();
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey } as any) });
  }
  return getFirestore();
}

export async function POST(req: Request) {
  try {
    const { userId, token } = await req.json();
    if (!userId || !token) return NextResponse.json({ error: 'Missing userId or token' }, { status: 400 });
    const db = getAdminDb();
    await db.collection('push_tokens').doc(userId).set({ token, userId, updatedAt: Timestamp.now(), platform: 'web' }, { merge: true });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
