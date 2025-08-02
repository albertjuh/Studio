
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export function DailySummarySection({ className }: { className?: string }) {
  return (
    <Card className={cn("shadow-lg", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Summary
        </CardTitle>
        <CardDescription>
          AI-powered overviews and insights.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert>
            <Sparkles className="h-4 w-4" />
            <AlertTitle>Feature Under Construction</AlertTitle>
            <AlertDescription>
                The AI summary generation feature is currently being rebuilt. Please check back soon for automated insights.
            </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
