
"use client";

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { AiSummaryCard } from '@/components/ai/ai-summary-card';
import type { DailyAiSummary, DailySummaryInput } from '@/types';
import { getDailyAiSummaryAction, getStoredAiSummariesAction } from '@/lib/actions';
import { Loader2, Sparkles, CalendarIcon, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useNotifications } from '@/contexts/notification-context';
import { getDashboardMetricsAction } from '@/lib/inventory-actions';

export default function AiSummaryPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [currentSummary, setCurrentSummary] = useState<DailyAiSummary | null>(null);
  const { addNotification } = useNotifications();
  const queryClient = useQueryClient();
  
  useEffect(() => {
    setSelectedDate(new Date());
  }, []);

  const { data: metrics, isLoading: isLoadingMetrics } = useQuery({
    queryKey: ['dashboardMetricsForSummary'],
    queryFn: getDashboardMetricsAction,
  });

  const { data: availableSummaries, isLoading: isLoadingAvailable } = useQuery<DailyAiSummary[]>({
    queryKey: ['availableAiSummaries'],
    queryFn: getStoredAiSummariesAction, 
  });

  useEffect(() => {
    if (selectedDate && availableSummaries) {
      const foundSummary = availableSummaries.find(s => 
        s.date && new Date(s.date).toDateString() === selectedDate.toDateString()
      );
      setCurrentSummary(foundSummary || null);
    }
  }, [selectedDate, availableSummaries]);


  const mutation = useMutation({
    mutationFn: getDailyAiSummaryAction,
    onSuccess: (data, variables) => {
      const newSummary: DailyAiSummary = {
        id: Date.now().toString(),
        date: variables.dateObject?.toISOString() || new Date().toISOString(),
        summary: data.summary,
        insights: data.insights,
        rawInventoryChanges: variables.inventoryChanges,
        rawProductionHighlights: variables.productionHighlights,
      };
      setCurrentSummary(newSummary);
      addNotification({ message: 'Successfully generated new AI summary.' });
      queryClient.invalidateQueries({ queryKey: ['availableAiSummaries'] });
    },
    onError: (error) => {
      console.error("Failed to generate AI summary:", error);
    }
  });

  const handleGenerateSummaryForDate = () => {
    if (!selectedDate || !metrics) return;
    
    const inputForDate: DailySummaryInput = {
      inventoryChanges: `Received 30 tonnes RCN. Dispatched 15 tonnes Finished Goods. Used 500 boxes and 500 vacuum bags.`,
      productionHighlights: `Steamed 22 tonnes RCN. Shelled 20 tonnes. Packaged 15 tonnes of W320.`,
      previousDaySummary: availableSummaries?.find(s => 
        s.date && selectedDate &&
        new Date(s.date).toDateString() === new Date(new Date(selectedDate).setDate(selectedDate.getDate() -1)).toDateString()
      )?.summary || "No previous summary available.",
      rcnStockTonnes: metrics.rcnStockTonnes,
      productionTargetTonnes: 20, 
      dateObject: selectedDate
    };
    mutation.mutate(inputForDate);
  };

  return (
    <div className="container mx-auto py-6">
      <h2 className="text-3xl font-bold tracking-tight text-foreground mb-6">Daily AI Summaries</h2>
      
      <div className="mb-6 p-4 border rounded-lg bg-card shadow flex flex-col sm:flex-row gap-4 items-center">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-full sm:w-[280px] justify-start text-left font-normal",
                !selectedDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                setSelectedDate(date);
                const foundSummary = availableSummaries?.find(s => 
                  date && s.date && new Date(s.date).toDateString() === date.toDateString()
                );
                setCurrentSummary(foundSummary || null);
                mutation.reset(); 
              }}
              disabled={(date) => date > new Date() || date < new Date("2020-01-01")}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <Button 
          onClick={handleGenerateSummaryForDate} 
          disabled={mutation.isPending || !selectedDate || isLoadingMetrics}
          className="w-full sm:w-auto"
        >
          {mutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          {currentSummary ? "Regenerate Summary" : "Generate Summary for Selected Date"}
        </Button>
      </div>

      {isLoadingAvailable && (
         <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2 text-muted-foreground">Loading available summaries...</p>
        </div>
      )}

      {mutation.isError && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Generating Summary</AlertTitle>
          <AlertDescription>
            Could not generate the summary for {selectedDate ? format(selectedDate, "PPP") : 'the selected date'}. Please try again.
          </AlertDescription>
        </Alert>
      )}

      {currentSummary && !mutation.isPending && !mutation.isError && (
        <AiSummaryCard summaryData={currentSummary} className="shadow-lg" />
      )}
      
      {!isLoadingAvailable && !currentSummary && !mutation.isPending && !mutation.isError && selectedDate && (
        <div className="text-center py-10 border rounded-lg bg-card shadow">
          <Sparkles className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-sm font-medium text-foreground">No AI Summary Available</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            No summary found for {format(selectedDate, "PPP")}. You can generate one using the button above.
          </p>
        </div>
      )}
       {!isLoadingAvailable && !selectedDate && (
         <div className="text-center py-10 border rounded-lg bg-card shadow">
            <CalendarIcon className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-medium text-foreground">Select a Date</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Please select a date to view or generate its AI summary.
            </p>
          </div>
       )}
    </div>
  );
}
