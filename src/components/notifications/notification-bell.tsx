
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
            
            const key = `anc_last_viewed_notifications_${userData.name}`;
            const stored = localStorage.getItem(key);
            if (stored) {
                const parsed = new Date(stored).getTime();
                if (!isNaN(parsed)) setLastViewedAt(parsed);
            }
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
        
        const unreadDb = notifications ? notifications.filter(n => !n.read_by?.includes(user.name)) : [];
        
        let unreadDynamic = 0;
        if (participants && Array.isArray(participants)) {
            participants.forEach(p => {
                try {
                    // DEFENSIVE: Skip problematic records during calculation to prevent app crash
                    const res = resolveParticipantStatuses(p);
                    if (!res) return;
                    
                    let taskDate = 0;
                    if (res.overall_status === 'overdue') {
                        const activeS = res.survey2_status === 'overdue' ? 2 : res.survey3_status === 'overdue' ? 3 : 4;
                        const dateVal = res[`survey${activeS}_window_close` as keyof typeof res];
                        if (dateVal instanceof Date) taskDate = dateVal.getTime();
                    } else if (res.overall_status === 'action_needed') {
                        const activeS = res.survey2_status === 'due_now' ? 2 : res.survey3_status === 'due_now' ? 3 : 4;
                        const dateVal = res[`survey${activeS}_window_open` as keyof typeof res];
                        if (dateVal instanceof Date) taskDate = dateVal.getTime();
                    }

                    let forecastDate = 0;
                    const hasUpcoming = res.survey2_status === 'due_soon' || res.survey3_status === 'due_soon' || res.survey4_status === 'due_soon';
                    if (hasUpcoming && res.overall_status === 'on_track') {
                        const activeS = res.survey2_status === 'due_soon' ? 2 : res.survey3_status === 'due_soon' ? 3 : 4;
                        const dateVal = res[`survey${activeS}_forecast_date` as keyof typeof res];
                        if (dateVal instanceof Date) forecastDate = dateVal.getTime();
                    }

                    if (taskDate > 0 && taskDate > lastViewedAt) unreadDynamic++;
                    if (forecastDate > 0 && forecastDate > lastViewedAt) unreadDynamic++;
                } catch (e) {
                    // Silently fail for individual participant to prevent global crash
                    console.warn("Notification engine skipped record:", p.id);
                }
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
