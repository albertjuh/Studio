
"use client";

import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, limit, orderBy } from 'firebase/firestore';
import { Bell, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { type StudyNotification, type AncRegistration } from '@/types';
import { useMemo, useEffect, useState } from 'react';
import { resolveParticipantStatuses } from '@/lib/timeline/formulas';

export function NotificationBell() {
    const firestore = useFirestore();
    const [user, setUser] = useState<{ name: string; role: string } | null>(null);
    const [lastViewedAt, setLastViewedAt] = useState<number>(0);

    useEffect(() => {
        const userStr = localStorage.getItem('ancUser');
        if (userStr) {
            const userData = JSON.parse(userStr);
            setUser(userData);
            
            // Get user-specific last viewed timestamp
            const key = `anc_last_viewed_notifications_${userData.name}`;
            const stored = localStorage.getItem(key);
            if (stored) setLastViewedAt(new Date(stored).getTime());
        }
    }, []);

    const notificationsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'notifications'), orderBy('created_at', 'desc'), limit(20));
    }, [firestore]);

    const participantsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, 'anc_registrations');
    }, [firestore]);

    const { data: notifications } = useCollection<StudyNotification>(notificationsQuery);
    const { data: participants } = useCollection<AncRegistration>(participantsQuery);

    const { unreadCount, hasCritical } = useMemo(() => {
        if (!user) return { unreadCount: 0, hasCritical: false };
        
        // 1. Unread Database Notifications (User-independent via 'read_by' array)
        const unreadDb = notifications ? notifications.filter(n => !n.read_by?.includes(user.name)) : [];
        
        // 2. Unread Dynamic Alerts (Newer than last visit to Intelligence Hub)
        let unreadDynamic = 0;
        if (participants) {
            participants.forEach(p => {
                const res = resolveParticipantStatuses(p);
                
                // Tasks Activation Date
                let taskDate = 0;
                if (res.overall_status === 'overdue') {
                    const activeS = res.survey2_status === 'overdue' ? 2 : res.survey3_status === 'overdue' ? 3 : 4;
                    taskDate = (res[`survey${activeS}_window_close` as keyof typeof res] as Date).getTime();
                } else if (res.overall_status === 'action_needed') {
                    const activeS = res.survey2_status === 'due_now' ? 2 : res.survey3_status === 'due_now' ? 3 : 4;
                    taskDate = (res[`survey${activeS}_window_open` as keyof typeof res] as Date).getTime();
                }

                // Forecast Activation Date
                let forecastDate = 0;
                const hasUpcoming = res.survey2_status === 'due_soon' || res.survey3_status === 'due_soon' || res.survey4_status === 'due_soon';
                if (hasUpcoming && res.overall_status === 'on_track') {
                    const activeS = res.survey2_status === 'due_soon' ? 2 : res.survey3_status === 'due_soon' ? 3 : 4;
                    forecastDate = (res[`survey${activeS}_forecast_date` as keyof typeof res] as Date).getTime();
                }

                // Count if achieved AFTER the last time the user looked at the hub
                if (taskDate > lastViewedAt) unreadDynamic++;
                if (forecastDate > lastViewedAt) unreadDynamic++;
            });
        }

        return {
            unreadCount: unreadDb.length + unreadDynamic,
            hasCritical: unreadDb.some(n => n.criticality === 'CRITICAL')
        };
    }, [notifications, participants, user, lastViewedAt]);

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
                    hasCritical ? "bg-rose-600 animate-bounce" : "bg-primary shadow-[0_0_10px_rgba(16,185,129,0.4)]"
                )}>
                    {unreadCount}
                </span>
            )}
        </Link>
    );
}
