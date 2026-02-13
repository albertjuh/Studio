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

        let unsubscribe: Unsubscribe | null = null;

        if (firestore) {
            const q = collection(firestore, "anc_registrations");
            
            unsubscribe = onSnapshot(q, 
                { includeMetadataChanges: true }, 
                (snapshot) => {
                    let pendingCount = 0;
                    snapshot.docs.forEach(doc => {
                        if (doc.metadata.hasPendingWrites) {
                            pendingCount++;
                        }
                    });
                    
                    setPendingWrites(prevCount => {
                        if (pendingCount < prevCount && isOnline) {
                            setIsSyncing(true);
                        } else if (pendingCount === 0) {
                            setIsSyncing(false);
                        }
                        return pendingCount;
                    });
                },
                (error) => {
                    console.error("Firestore snapshot listener failed:", error);
                }
            );
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            if (unsubscribe) {
                unsubscribe();
            }
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
                            <span>{pendingWrites} unsaved</span>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{pendingWrites} registration(s) saved locally. They will sync when you're back online.</p>
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
                            <span>Syncing {pendingWrites > 0 ? `${pendingWrites} left` : ''}...</span>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Sending offline data to the server...</p>
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
                            <span>Synced</span>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>All data is saved to the server.</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    // Default state (e.g., offline with no pending writes)
    return null;
}
