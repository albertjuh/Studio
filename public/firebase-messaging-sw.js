importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');
firebase.initializeApp({
  apiKey: "AIzaSyDFgRU_eAGPt2ckpLviSpphcAvWgodBqa0",
  authDomain: "nutshell-insights.firebaseapp.com",
  projectId: "nutshell-insights",
  storageBucket: "nutshell-insights.firebasestorage.app",
  messagingSenderId: "1003963455184",
  appId: "1:1003963455184:web:0ca1871fde78e3042af0d5"
});
const messaging = firebase.messaging();
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'Partoma Alert';
  const body = payload.notification?.body || '';
  const criticality = payload.data?.criticality || 'MEDIUM';
  self.registration.showNotification(title, {
    body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: payload.data?.notificationId || 'partoma',
    data: payload.data,
    requireInteraction: criticality === 'CRITICAL',
  });
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/anc/notifications'));
});
