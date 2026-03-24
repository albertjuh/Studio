
"use client";

import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, limit, orderBy } from 'firebase/firestore';
import { Bell, AlertCircle, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { type StudyNotification, type AncRegistration } from '@/types';
import { useMemo, useEffect, useState } from 'react';
import { resolveParticipantStatuses } from '@/lib/timeline/formulas';

export function NotificationBell() {
    const firestore = useFirestore();
    const [user, setUser] = useState<{ name: string; role: string } | null>(null);

    useEffect(() => {
        const userStr = localStorage.getItem('ancUser');
        if (userStr) {
            setUser(JSON.parse(userStr));
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
        if (!notifications || !user) return { unreadCount: 0, hasCritical: false };
        
        // 1. Count unread AI/System notifications from DB
        const unreadDb = notifications.filter(n => !n.read_by?.includes(user.name));
        
        // 2. Count "Real" Dynamic Tasks & Forecasts (Calculated live from Registry)
        let dynamicCount = 0;
        if (participants) {
            participants.forEach(p => {
                const resolved = resolveParticipantStatuses(p);
                // Count Outreach Tasks (Due Now or Overdue) and Forecasts (Due Soon)
                const hasTask = resolved.overall_status === 'action_needed' || resolved.overall_status === 'overdue';
                const hasForecast = resolved.survey2_status === 'due_soon' || resolved.survey3_status === 'due_soon' || resolved.survey4_status === 'due_soon';
                
                if (hasTask || hasForecast) dynamicCount++;
            });
        }

        return {
            unreadCount: unreadDb.length + dynamicCount,
            hasCritical: unreadDb.some(n => n.criticality === 'CRITICAL')
        };
    }, [notifications, participants, user]);

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
