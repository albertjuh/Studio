'use client';

import { useState, useEffect } from 'react';
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  CollectionReference,
} from 'firebase/firestore';

export type WithId<T> = T & { id: string };

export interface UseCollectionResult<T> {
  data: WithId<T>[] | null;
  isLoading: boolean;
  isFromCache: boolean;
  error: FirestoreError | Error | null;
}

/**
 * Enhanced hook for real-time collection synchronization.
 * Includes metadata tracking to identify if data is live or cached.
 * Gracefully handles connectivity drops without triggering fatal errors.
 */
export function useCollection<T = any>(
  memoizedQuery: Query<DocumentData> | CollectionReference<DocumentData> | null | undefined
): UseCollectionResult<T> {
  const [data, setData] = useState<WithId<T>[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFromCache, setIsFromCache] = useState<boolean>(false);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  useEffect(() => {
    if (!memoizedQuery) {
      setData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      memoizedQuery,
      { includeMetadataChanges: true },
      (snapshot) => {
        const results: WithId<T>[] = snapshot.docs.map(doc => ({
          ...(doc.data() as T),
          id: doc.id
        }));
        
        setData(results);
        setIsFromCache(snapshot.metadata.fromCache);
        setIsLoading(false);
        
        if (snapshot.metadata.fromCache && !navigator.onLine) {
          // Suppress noise, app is functioning in intended offline mode
        }
      },
      (err) => {
        // Log network failures as warnings, maintain existing data state
        if (err.code === 'unavailable') {
            console.warn("Firestore: Connection deferred. Operating in offline-cached mode.");
        } else {
            console.error("Firestore useCollection Error:", err);
        }
        setError(err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [memoizedQuery]);

  return { data, isLoading, isFromCache, error };
}
