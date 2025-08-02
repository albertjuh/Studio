
"use client";

import { AlertCircle, Sparkles } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function AiSummaryPage() {
  return (
    <div className="container mx-auto py-6">
      <h2 className="text-3xl font-bold tracking-tight text-foreground mb-6">AI Summaries</h2>
      
      <Alert variant="destructive">
        <Sparkles className="h-4 w-4" />
        <AlertTitle>Feature Under Construction</AlertTitle>
        <AlertDescription>
          The AI Summaries feature is currently being rebuilt. Please check back later.
        </AlertDescription>
      </Alert>
    </div>
  );
}
