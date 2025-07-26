
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { useNotifications } from '@/contexts/notification-context';
import { getDailyAiSummaryAction, getReportDataAction } from '@/lib/actions';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getDashboardMetricsAction } from '@/lib/inventory-actions';
import { cn } from '@/lib/utils';
import { format, startOfDay, endOfDay } from 'date-fns';

function formatLogsForAISummary(logs: any[]): string {
  if (!logs || logs.length === 0) {
    return "No activities recorded for today.";
  }
  return logs.map(log => {
      // Create a string representation of the log entry. This can be more sophisticated.
      const logDetails = Object.entries(log)
        .filter(([key, value]) => key !== 'id' && key !== 'stage_name' && value)
        .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
        .join(', ');
      return `- ${log.stage_name}: ${logDetails}`;
  }).join('\n');
}


export function DailySummarySection({ className }: { className?: string }) {
  const { addNotification } = useNotifications();
  const [summaryData, setSummaryData] = useState<{ summary: string, insights: string } | null>(null);

  const { data: metrics, isLoading: isLoadingMetrics } = useQuery({
    queryKey: ['dashboardMetricsForSummary'],
    queryFn: getDashboardMetricsAction,
  });

  const mutation = useMutation({
    mutationFn: getDailyAiSummaryAction,
    onSuccess: (data) => {
        setSummaryData(data);
        addNotification({ message: "Today's AI Summary has been generated." });
    },
    onError: (error) => {
        console.error("Failed to generate AI summary:", error);
    }
  });


  const handleGenerateSummary = async () => {
    if (!metrics) return;
    
    // Fetch real data for today
    const today = new Date();
    const reportForToday = await getReportDataAction({ startDate: startOfDay(today), endDate: endOfDay(today) });
    
    // Format logs for the AI prompt
    const productionHighlights = formatLogsForAISummary(reportForToday.productionLogs.filter(log => !log.stage_name?.toLowerCase().includes('intake') && !log.stage_name?.toLowerCase().includes('dispatch')));
    const inventoryChanges = formatLogsForAISummary(reportForToday.productionLogs.filter(log => log.stage_name?.toLowerCase().includes('intake') || log.stage_name?.toLowerCase().includes('dispatch')));

    mutation.mutate({
      inventoryChanges: inventoryChanges,
      productionHighlights: productionHighlights,
      rcnStockTonnes: metrics.rcnStockTonnes,
      productionTargetTonnes: 20, // This should come from a constant or config
    });
  };

  return (
    <Card className={cn("shadow-lg", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Today's AI Summary
        </CardTitle>
        <CardDescription>
          An AI-generated overview of today's key activities and insights, using live stock data.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {mutation.isPending && (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2 text-muted-foreground">Generating summary...</p>
          </div>
        )}
        {mutation.isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Could not generate the summary. Please try again later.
            </AlertDescription>
          </Alert>
        )}
        {summaryData && !mutation.isPending && (
          <div className="space-y-3">
            <div>
              <h4 className="font-semibold text-foreground">Summary:</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{summaryData.summary}</p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground">Actionable Insights:</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{summaryData.insights}</p>
            </div>
          </div>
        )}
        {!summaryData && !mutation.isPending && !mutation.isError && (
          <div className="text-center py-4">
            <p className="text-muted-foreground mb-4">No summary generated for today yet.</p>
            <Button onClick={handleGenerateSummary} disabled={mutation.isPending || isLoadingMetrics}>
              {isLoadingMetrics ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Generate Today's Summary
            </Button>
          </div>
        )}
         {summaryData && !mutation.isPending && (
            <Button onClick={handleGenerateSummary} disabled={mutation.isPending || isLoadingMetrics} variant="outline" className="mt-4">
              <Sparkles className="mr-2 h-4 w-4" />
              Regenerate Summary
            </Button>
        )}
      </CardContent>
    </Card>
  );
}
