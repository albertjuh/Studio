'use client';

import { useState, useEffect } from 'react';
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  CollectionReference,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/** Utility type to add an 'id' field to a given type T. */
export type WithId<T> = T & { id: string };

/**
 * Interface for the return value of the useCollection hook.
 * @template T Type of the document data.
 */
export interface UseCollectionResult<T> {
  data: WithId<T>[] | null; // Document data with ID, or null.
  isLoading: boolean;       // True if loading.
  error: FirestoreError | Error | null; // Error object, or null.
}

export interface InternalQuery extends Query<DocumentData> {
  _query: {
    path: {
      canonicalString(): string;
      toString(): string;
    }
  }
}

/**
 * React hook to subscribe to a Firestore collection or query in real-time.
 * Handles nullable references/queries and prevents errors if a path string is passed.
 */
export function useCollection<T = any>(
    memoizedTargetRefOrQuery: ((CollectionReference<DocumentData> | Query<DocumentData>) & {__memo?: boolean})  | null | undefined,
): UseCollectionResult<T> {
  type ResultItemType = WithId<T>;
  type StateDataType = ResultItemType[] | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  useEffect(() => {
    // Guard: If null, undefined, or accidentally a string (prevents _delegate errors)
    if (!memoizedTargetRefOrQuery || typeof memoizedTargetRefOrQuery === 'string') {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Final safety check to ensure we have a proper onSnapshot-compatible object
    const isQuery = typeof (memoizedTargetRefOrQuery as any).onSnapshot === 'function' || 
                    (memoizedTargetRefOrQuery as any).type === 'collection' || 
                    (memoizedTargetRefOrQuery as any).type === 'query' ||
                    !!(memoizedTargetRefOrQuery as any).firestore;

    if (!isQuery) {
        console.warn("useCollection: memoizedTargetRefOrQuery is not a valid Firestore reference", memoizedTargetRefOrQuery);
        setIsLoading(false);
        return;
    }

    const unsubscribe = onSnapshot(
      memoizedTargetRefOrQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const results: ResultItemType[] = [];
        snapshot.forEach((doc) => {
          results.push({ ...(doc.data() as T), id: doc.id });
        });
        setData(results);
        setError(null);
        setIsLoading(false);
      },
      (error: FirestoreError) => {
        let path: string = 'unknown_path';
        try {
          path =
            memoizedTargetRefOrQuery.type === 'collection'
              ? (memoizedTargetRefOrQuery as CollectionReference).path
              : (memoizedTargetRefOrQuery as unknown as InternalQuery)._query.path.canonicalString()
        } catch (e) {
            console.warn("Could not determine path for Firestore error:", e);
        }

        // Only emit to global listener if it's a permission error.
        // Network errors (unavailable, timeout) should be handled gracefully by UI indicators.
        if (error.code === 'permission-denied' || error.code === 'unauthenticated') {
            const contextualError = new FirestorePermissionError({
              operation: 'list',
              path,
            });
            setError(contextualError);
            errorEmitter.emit('permission-error', contextualError);
        } else {
            console.warn(`Firestore collection error (${error.code}):`, error.message);
            setError(error);
        }

        setData(null);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [memoizedTargetRefOrQuery]);

  return { data, isLoading, error };
}
