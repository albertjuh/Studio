'use client';
import { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, where, getCountFromServer } from 'firebase/firestore';
import { getFacilityTarget } from '@/lib/facility-targets';

export function useFacilityStatus(facility: string | null) {
  const firestore = useFirestore();
  const [enrolled, setEnrolled] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!facility || !firestore) return;
    setLoading(true);
    const q = query(
      collection(firestore, 'anc_registrations'),
      where('healthFacility', '==', facility)
    );
    getCountFromServer(q)
      .then(snap => setEnrolled(snap.data().count))
      .catch(() => setEnrolled(null))
      .finally(() => setLoading(false));
  }, [facility, firestore]);

  const target = facility ? getFacilityTarget(facility) : 0;
  const remaining = enrolled !== null ? Math.max(0, target - enrolled) : null;
  const isFull = enrolled !== null && enrolled >= target;
  const percentage = target > 0 && enrolled !== null ? Math.round((enrolled / target) * 100) : 0;

  return { enrolled, target, remaining, isFull, percentage, loading };
}
