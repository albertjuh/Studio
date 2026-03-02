
"use client";

import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, limit } from 'firebase/firestore';
import { Bell, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { type StudyNotification } from '@/types';
import { useMemo } from 'react';

export function NotificationBell() {
    const firestore = useFirestore();

    const notificationsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        // Mock user ID 'test' for now. In real app use auth.currentUser.uid
        return query(collection(firestore, 'notifications'), limit(20));
    }, [firestore]);

    const { data: notifications } = useCollection<StudyNotification>(notificationsQuery);

    const { unreadCount, hasCritical } = useMemo(() => {
        if (!notifications) return { unreadCount: 0, hasCritical: false };
        const unread = notifications.filter(n => !n.read_by?.includes('test'));
        return {
            unreadCount: unread.length,
            hasCritical: unread.some(n => n.criticality === 'CRITICAL')
        };
    }, [notifications]);

    return (
        <Link href="/anc/notifications" className="relative group">
            <div className={cn(
                "p-2 rounded-xl transition-all duration-500",
                hasCritical ? "bg-rose-500/10 text-rose-600 animate-pulse" : "bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
            )}>
                {hasCritical ? <AlertCircle className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
            </div>
            
            {unreadCount > 0 && (
                <span className={cn(
                    "absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[8px] font-black text-white ring-2 ring-background",
                    hasCritical ? "bg-rose-600 animate-bounce" : "bg-primary"
                )}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                </span>
            )}
        </Link>
    );
}
