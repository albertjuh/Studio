
"use client";

import { useEffect, useRef } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { type StudyNotification } from '@/types';

export function NotificationPopupManager() {
    const firestore = useFirestore();
    const notifiedIds = useRef<Set<string>>(new Set());
    const initialLoadDone = useRef(false);

    useEffect(() => {
        if (!firestore) return;

        // Listen for new notifications in real-time
        const q = query(collection(firestore, 'notifications'), orderBy('created_at', 'desc'), limit(5));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                const data = change.doc.data() as StudyNotification;
                const id = change.doc.id;

                // Only process newly added documents
                if (change.type === 'added') {
                    // Check if document was created very recently (within last 30 seconds)
                    // or if it's the very first time we're seeing it in this session.
                    const createdAt = data.created_at?.toDate ? data.created_at.toDate().getTime() : Date.now();
                    const isRecent = (Date.now() - createdAt) < 30000;

                    // During initial load, onSnapshot "adds" existing docs. 
                    // We only want to trigger popups for truly new ones or very recent ones.
                    if (initialLoadDone.current && isRecent && !notifiedIds.current.has(id)) {
                        triggerNativeNotification(data);
                        notifiedIds.current.add(id);
                    } else {
                        // Just add to seen set so we don't notify later
                        notifiedIds.current.add(id);
                    }
                }
            });
            initialLoadDone.current = true;
        });

        return () => unsubscribe();
    }, [firestore]);

    const triggerNativeNotification = (data: StudyNotification) => {
        if (!('Notification' in window)) return;
        if (Notification.permission !== 'granted') return;

        const title = data.ai_generated ? `AI Alert: ${data.title}` : `System Alert: ${data.title}`;
        const options = {
            body: data.body,
            icon: 'https://picsum.photos/seed/partoma/192/192',
            badge: 'https://picsum.photos/seed/partoma/192/192',
            tag: data.id,
            requireInteraction: data.criticality === 'CRITICAL'
        };

        try {
            new Notification(title, options);
        } catch (e) {
            console.error("Failed to trigger browser notification", e);
        }
    };

    return null; // This component has no UI, it just manages popups
}
