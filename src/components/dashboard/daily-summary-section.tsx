
"use client";

import { useQuery } from "@tanstack/react-query";
import { getDailyAiSummaryAction } from '@/lib/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, RefreshCw, Sparkles, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DailyAiSummary } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";

function SummaryDialogContent({ data }: { data: DailyAiSummary }) {
    return (
        <>
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    AI Daily Summary Report
                </DialogTitle>
                <DialogDescription>
                    Generated on {new Date(data.date).toLocaleString()}
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-4">
                <div>
                    <h4 className="font-semibold text-lg mb-2 text-foreground">Key Summary</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{data.summary}</p>
                </div>
                {data.insights && (
                    <div>
                        <h4 className="font-semibold text-lg mb-2 text-foreground">Actionable Insights</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{data.insights}</p>
                    </div>
                )}
            </div>
        </>
    );
}

export function DailySummarySection({ className }: { className?: string }) {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<DailyAiSummary | null>({
    queryKey: ['dailyAiSummary'],
    queryFn: () => getDailyAiSummaryAction(false), // Pass false to use cache by default
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    refetchOnWindowFocus: false, // Don't refetch just because window is focused
    refetchOnReconnect: false, // Don't refetch on network reconnect
  });

  const handleRegenerate = () => {
    // Call the action with true to force a regeneration, bypassing the cache
    refetch({ queryKey: ['dailyAiSummary', true]});
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      );
    }

    if (isError) {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Generating Summary</AlertTitle>
          <AlertDescription>
            {(error as Error)?.message || "The AI summary could not be generated at this time."}
          </AlertDescription>
        </Alert>
      );
    }
    
    if (!data?.summary) {
        return (
            <Alert>
                <Sparkles className="h-4 w-4" />
                <AlertTitle>No Data for Summary</AlertTitle>
                <AlertDescription>
                    There might not be enough production data from today to generate a summary. Please try again later.
                </AlertDescription>
            </Alert>
        )
    }

    // Display a snippet of the summary
    const summarySnippet = data.summary.split('\n')[0];

    return (
        <div className="space-y-2">
            <p className="text-sm text-muted-foreground italic truncate">
                "{summarySnippet}"
            </p>
        </div>
    );
  };

  return (
    <Dialog>
        <Card className={cn("shadow-lg flex flex-col", className)}>
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Daily Summary
            </CardTitle>
            <CardDescription>
            An AI-powered overview of today's factory operations.
            </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow">
            {renderContent()}
        </CardContent>
        <CardFooter className="border-t pt-4 flex justify-between items-center">
            <Button
                variant="outline"
                size="sm"
                onClick={handleRegenerate}
                disabled={isFetching}
            >
                <RefreshCw className={cn("mr-2 h-4 w-4", isFetching && "animate-spin")} />
                {isFetching ? "Regenerating..." : "Regenerate"}
            </Button>
            {data && data.summary && !isError && (
                 <DialogTrigger asChild>
                    <Button size="sm">
                        <Eye className="mr-2 h-4 w-4" />
                        View Full Report
                    </Button>
                </DialogTrigger>
            )}
        </CardFooter>
        </Card>
        
        {data && (
            <DialogContent className="sm:max-w-2xl">
                <SummaryDialogContent data={data} />
            </DialogContent>
        )}
    </Dialog>
  );
}
