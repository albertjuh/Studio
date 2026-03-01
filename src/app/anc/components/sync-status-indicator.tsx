
"use client";

import { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collection, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function SyncStatusIndicator() {
    const [pendingWrites, setPendingWrites] = useState(0);
    const [isOnline, setIsOnline] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const firestore = useFirestore();

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

        if (firestore) {
            // Monitor ANC Registrations
            unsubRegs = onSnapshot(collection(firestore, "anc_registrations"), 
                { includeMetadataChanges: true }, 
                (snapshot) => {
                    updatePendingCount();
                }
            );

            // Monitor Recruitment Logs
            unsubRecruitment = onSnapshot(collection(firestore, "recruitment_entries"), 
                { includeMetadataChanges: true }, 
                (snapshot) => {
                    updatePendingCount();
                }
            );

            const updatePendingCount = () => {
                // In a production app with large datasets, we'd use more efficient metadata tracking
                // but for this study tool, snapshot metadata is highly reliable for offline feedback.
                // Note: The actual count is handled internally by Firestore, 
                // we're simply checking if ANY snapshots have pending writes globally to show state.
                const hasPending = document.querySelector('[data-pending="true"]') !== null;
                // Since we can't easily query all snapshots at once without overhead,
                // we'll rely on the snapshot metadata available to the current views.
            };
            
            // Re-implementing specific count tracking for the two core collections
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
    }, [firestore, isOnline]);
    
    // If offline and there are pending writes
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
    
    // If online and there are pending writes (or we just finished)
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

    // If online and everything is synced up
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

    // Default offline state with no pending writes
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
