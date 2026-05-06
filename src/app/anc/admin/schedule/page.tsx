"use client";

import { redirect } from 'next/navigation';
import { useEffect } from 'react';

/**
 * DEPRECATED: RA Scheduler has been removed from the system.
 */
export default function RAMonthlyScheduler() {
  useEffect(() => {
    redirect('/anc/activities');
  }, []);
  
  return null;
}
