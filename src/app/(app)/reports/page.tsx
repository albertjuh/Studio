
"use client";

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ReportFilters } from '@/components/reports/report-filters';
import { ReportDataDisplay } from '@/components/reports/report-data-display';
import type { ReportFilterState, ReportDataPayload } from '@/types';
import { getReportAiSummaryAction, getReportDataAction } from '@/lib/actions';
import { Loader2, Sparkles, AlertCircle, FileText } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function ReportsPage() {
  const { toast } = useToast();
  const [reportData, setReportData] = useState<ReportDataPayload | null>(null);
  const [aiReportSummary, setAiReportSummary] = useState<string | null>(null);

  const reportMutation = useMutation({
    mutationFn: getReportDataAction,
    onSuccess: (data) => {
      setReportData(data);
      setAiReportSummary(null); // Clear previous AI summary
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

  const aiSummaryMutation = useMutation({
    mutationFn: getReportAiSummaryAction,
    onSuccess: (data) => {
      setAiReportSummary(data.summary);
    },
    onError: (error) => {
      console.error("Failed to generate AI report summary:", error);
      toast({
        title: "Error Generating AI Summary",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  });

  const handleGenerateAiSummary = () => {
    if (reportData) {
      aiSummaryMutation.mutate(reportData);
    }
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
          <Card className="my-6 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Report Summary
              </CardTitle>
              <CardDescription>
                An AI-generated summary of the current report data.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {aiSummaryMutation.isPending && (
                <div className="flex items-center">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  <span>Generating AI summary...</span>
                </div>
              )}
              {aiSummaryMutation.isError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>Could not generate AI summary. Please try again.</AlertDescription>
                </Alert>
              )}
              {aiReportSummary && !aiSummaryMutation.isPending && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{aiReportSummary}</p>
              )}
              {!aiReportSummary && !aiSummaryMutation.isPending && !aiSummaryMutation.isError && (
                 <p className="text-muted-foreground mb-4">No AI summary generated for this report yet.</p>
              )}
              <Button
                onClick={handleGenerateAiSummary}
                disabled={aiSummaryMutation.isPending || !reportData}
                className="mt-4"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {aiReportSummary ? "Regenerate AI Summary" : "Generate AI Summary"}
              </Button>
            </CardContent>
          </Card>
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
