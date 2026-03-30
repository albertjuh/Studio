
"use client";

import { useState, useEffect } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { collection, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function SyncStatusIndicator() {
    const [pendingWrites, setPendingWrites] = useState(0);
    const [isOnline, setIsOnline] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const firestore = useFirestore();
    const { user: fbUser } = useUser();

    useEffect(() => {
        // Set initial online status
        if (typeof navigator !== 'undefined') {
            setIsOnline(navigator.onLine);
        }

        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        let unsubRegs: Unsubscribe | null = null;
        let unsubRecruitment: Unsubscribe | null = null;

        if (firestore && fbUser) {
            const snapshots = new Map();
            
            const trackSnapshot = (id: string, snapshot: any) => {
                let count = 0;
                snapshot.docs.forEach((doc: any) => {
                    if (doc.metadata.hasPendingWrites) count++;
                });
                snapshots.set(id, count);
                
                const total = Array.from(snapshots.values()).reduce((a, b) => a + b, 0);
                
                setPendingWrites(prevCount => {
                    if (total < prevCount && isOnline) {
                        setIsSyncing(true);
                    } else if (total === 0) {
                        setIsSyncing(false);
                    }
                    return total;
                });
            };

            unsubRegs = onSnapshot(collection(firestore, "anc_registrations"), 
                { includeMetadataChanges: true }, 
                (snap) => trackSnapshot('regs', snap)
            );

            unsubRecruitment = onSnapshot(collection(firestore, "recruitment_entries"), 
                { includeMetadataChanges: true }, 
                (snap) => trackSnapshot('recruit', snap)
            );
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            if (unsubRegs) unsubRegs();
            if (unsubRecruitment) unsubRecruitment();
        };
    }, [firestore, fbUser, isOnline]);
    
    if (!isOnline && pendingWrites > 0) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="flex items-center gap-2 text-sm text-amber-600">
                            <WifiOff className="h-4 w-4" />
                            <span className="font-bold text-[10px] uppercase tracking-widest">{pendingWrites} local</span>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{pendingWrites} entry/entries saved locally. They will sync automatically when your connection is restored.</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }
    
    if (isOnline && (pendingWrites > 0 || isSyncing)) {
         return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                         <div className="flex items-center gap-2 text-sm text-blue-600">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="font-bold text-[10px] uppercase tracking-widest">Syncing {pendingWrites > 0 ? `${pendingWrites}` : ''}...</span>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Uploading offline data to the PartoMa study server...</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    if (isOnline && pendingWrites === 0 && !isSyncing) {
        return (
             <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="flex items-center gap-2 text-sm text-green-600">
                            <Wifi className="h-4 w-4" />
                            <span className="font-bold text-[10px] uppercase tracking-widest">Synced</span>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>All study data is securely saved to the server.</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    if (!isOnline && pendingWrites === 0) {
        return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground/40">
                <WifiOff className="h-4 w-4" />
                <span className="font-bold text-[10px] uppercase tracking-widest">Offline</span>
            </div>
        );
    }

    return null;
}
