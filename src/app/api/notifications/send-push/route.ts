import { NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

function getAdminApp() {
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
    const { title, body, criticality = 'MEDIUM', notificationId } = await req.json();
    const db = getAdminApp();
    const tokensSnap = await db.collection('push_tokens').get();
    const tokens = tokensSnap.docs.map(d => d.data().token as string).filter(Boolean);
    if (tokens.length === 0) return NextResponse.json({ success: true, sent: 0 });
    const messaging = getMessaging();
    const result = await messaging.sendEachForMulticast({
      tokens,
      notification: { title, body },
      data: { criticality, notificationId: notificationId || '' },
      webpush: {
        notification: { icon: '/icons/icon-192x192.png', badge: '/icons/icon-72x72.png', requireInteraction: criticality === 'CRITICAL' },
        fcmOptions: { link: '/anc/notifications' },
      },
    });
    return NextResponse.json({ success: true, sent: result.successCount, failed: result.failureCount });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
