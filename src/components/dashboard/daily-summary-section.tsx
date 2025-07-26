
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle as DialogTitleComponent } from '@/components/ui/dialog';
import { Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { useNotifications } from '@/contexts/notification-context';
import { getDailyAiSummaryAction, getReportDataAction } from '@/lib/actions';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getDashboardMetricsAction } from '@/lib/inventory-actions';
import { cn } from '@/lib/utils';
import { startOfDay, endOfDay } from 'date-fns';
import { AiSummaryCard } from '@/components/ai/ai-summary-card';
import type { DailyAiSummary } from '@/types';

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
  const [summaryData, setSummaryData] = useState<DailyAiSummary | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: metrics, isLoading: isLoadingMetrics } = useQuery({
    queryKey: ['dashboardMetricsForSummary'],
    queryFn: getDashboardMetricsAction,
  });

  const mutation = useMutation({
    mutationFn: getDailyAiSummaryAction,
    onSuccess: (data) => {
        const newSummary: DailyAiSummary = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            summary: data.summary,
            insights: data.insights,
            rawInventoryChanges: data.rawInventoryChanges,
            rawProductionHighlights: data.rawProductionHighlights,
        };
        setSummaryData(newSummary);
        addNotification({ message: "Today's AI Summary has been generated." });
        setIsDialogOpen(true); // Open the dialog on success
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
    <>
      <Card className={cn("shadow-lg", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Today's AI Summary
          </CardTitle>
          <CardDescription>
            Click to generate an AI-powered overview of today's key activities and insights.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mutation.isError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error Generating Summary</AlertTitle>
              <AlertDescription>
                Could not generate the summary. Please try again later.
              </AlertDescription>
            </Alert>
          )}
          <div className="flex justify-center">
            <Button onClick={handleGenerateSummary} disabled={mutation.isPending || isLoadingMetrics} size="lg">
              {mutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
              )}
              Generate Today's Summary
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-2xl">
              {summaryData && (
                <AiSummaryCard summaryData={summaryData} />
              )}
          </DialogContent>
      </Dialog>
    </>
  );
}
