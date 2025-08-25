
"use client";

import { useEffect, useState } from 'react';
import { DailyReportForm } from '@/components/nyanga-reports/daily-report-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ListChecks, UserPlus } from 'lucide-react';
import { NyangaReportManager } from '@/components/nyanga-reports/nyanga-report-manager';

export default function NyangaReportsPage() {
  const [supervisorName, setSupervisorName] = useState('');

  useEffect(() => {
    // This runs on the client, so localStorage is available.
    const name = localStorage.getItem('supervisorName') || 'Unknown Supervisor';
    setSupervisorName(name);
  }, []);

  return (
    <div className="container mx-auto py-6">
       <div className="flex items-center gap-3 mb-6">
        <ListChecks className="h-8 w-8 text-primary" />
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Nyanga Production Log</h2>
      </div>
      <NyangaReportManager supervisorId={supervisorName} />
    </div>
  );
}
