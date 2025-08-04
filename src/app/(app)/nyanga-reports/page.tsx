
"use client";

import { useEffect, useState } from 'react';
import { DailyReportForm } from '@/components/nyanga-reports/daily-report-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ListChecks } from 'lucide-react';

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
      <Card>
        <CardHeader>
          <CardTitle>Daily Production Entry</CardTitle>
          <CardDescription>
            Select the date and shift, then use the floating button to add entries for each worker's production.
          </CardDescription>
        </CardHeader>
        <CardContent>
           <DailyReportForm supervisorId={supervisorName} />
        </CardContent>
      </Card>
    </div>
  );
}
