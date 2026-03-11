'use client';
import { useEffect, useState } from 'react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { initializeFirebase } from '@/firebase';

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

export function usePushNotifications(userId: string | null) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || typeof window === 'undefined') return;
    setPermission(Notification.permission);
  }, [userId]);

  const requestPermission = async () => {
    if (!userId) return;
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') return;
      const { firebaseApp } = initializeFirebase();
      const messaging = getMessaging(firebaseApp);
      const fcmToken = await getToken(messaging, { vapidKey: VAPID_KEY });
      if (!fcmToken) return;
      setToken(fcmToken);
      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, token: fcmToken }),
      });
      onMessage(messaging, (payload) => {
        const title = payload.notification?.title || 'Partoma Alert';
        const body = payload.notification?.body || '';
        if (Notification.permission === 'granted') {
          new Notification(title, { body, icon: '/icons/icon-192x192.png' });
        }
      });
    } catch (err) {
      console.error('Push notification setup failed:', err);
    }
  };

  return { permission, token, requestPermission };
}
