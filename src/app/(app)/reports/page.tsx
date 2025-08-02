
"use client";

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ReportFilters } from '@/components/reports/report-filters';
import { ReportDataDisplay } from '@/components/reports/report-data-display';
import type { ReportFilterState, ReportDataPayload } from '@/types';
import { getReportDataAction } from '@/lib/actions';
import { Loader2, AlertCircle, FileText } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

export default function ReportsPage() {
  const { toast } = useToast();
  const [reportData, setReportData] = useState<ReportDataPayload | null>(null);

  const reportMutation = useMutation({
    mutationFn: getReportDataAction,
    onSuccess: (data) => {
      setReportData(data);
    },
    onError: (error) => {
      console.error("Failed to fetch report data:", error);
      toast({
        title: "Error Generating Report",
        description: (error as Error).message || "Could not retrieve data from the database.",
        variant: "destructive",
      });
    },
  });

  const handleFilterChange = async (filters: ReportFilterState) => {
    reportMutation.mutate(filters);
  };

  return (
    <div className="container mx-auto py-6">
      <h2 className="text-3xl font-bold tracking-tight text-foreground mb-6">Reports</h2>
      
      <ReportFilters onFilterChange={handleFilterChange} />

      {reportMutation.isPending && (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="ml-3 text-lg text-muted-foreground">Generating report from database...</p>
        </div>
      )}

      {reportMutation.isError && (
        <Alert variant="destructive" className="my-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Failed to Generate Report</AlertTitle>
          <AlertDescription>
            There was an error fetching data from the database. Please check the console for details and try again.
          </AlertDescription>
        </Alert>
      )}

      {reportData && !reportMutation.isPending && (
        <>
          <ReportDataDisplay data={reportData} />
        </>
      )}
      
      {!reportData && !reportMutation.isPending && !reportMutation.isError && (
         <div className="text-center py-10 border rounded-lg bg-card mt-6">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-medium text-foreground">No Report Generated</h3>
            <p className="mt-1 text-sm text-muted-foreground">Apply filters to generate and view a report.</p>
          </div>
      )}

    </div>
  );
}
