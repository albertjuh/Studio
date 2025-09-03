
"use client";

import type { TraceabilityFlowOutput } from '@/ai/flows/traceability-flow';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, FileQuestion, ArrowRight, Link as LinkIcon } from 'lucide-react';
import { format } from 'date-fns';

interface TraceabilityResultsDisplayProps {
  results: TraceabilityFlowOutput | null;
  isLoading: boolean;
}

// A simple helper to format values for display
const formatValue = (value: any): string => {
    if (value instanceof Date) {
        return format(value, 'PPp');
    }
    if (typeof value === 'number') {
        return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }
    if (typeof value === 'string' && !isNaN(Date.parse(value))) {
        try {
            return format(new Date(value), 'PPp');
        } catch {
            return value;
        }
    }
    if (value === null || value === undefined) {
        return 'N/A';
    }
    return String(value);
};


export function TraceabilityResultsDisplay({ results, isLoading }: TraceabilityResultsDisplayProps) {

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-3 text-lg text-muted-foreground">Tracing production history...</p>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="text-center py-10 border-2 border-dashed rounded-lg">
        <FileQuestion className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-2 text-sm font-medium text-foreground">Ready to Trace</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter a batch or lot ID above to begin tracing its history.
        </p>
      </div>
    );
  }
  
  const validResults = results.filter(result => result && result.id && result.type);

  if (validResults.length === 0) {
    return (
        <div className="text-center py-10 border-2 border-dashed rounded-lg">
            <FileQuestion className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-medium text-foreground">No Results Found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
                Could not find any production history for the entered ID. Please check the ID and try again.
            </p>
        </div>
    );
  }

  return (
    <div className="space-y-4">
        <h3 className="text-xl font-semibold">Traceability Report for Batch <span className="text-primary font-mono">{validResults[0].id}</span></h3>
        <ul className="space-y-6 border-l-2 border-primary/20 pl-6">
        {validResults.map((result, index) => (
          <li key={`${result.id}-${index}`} className="relative">
             <div className="absolute -left-[35px] top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <span className="text-sm font-bold">{index + 1}</span>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>{result.type}</CardTitle>
                <CardDescription>
                  ID: <span className="font-mono">{result.id}</span> | Date: {format(new Date(result.timestamp), "PPp")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-2 text-sm">
                  {Object.entries(result.details).map(([key, value]) => {
                    const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    return (
                        <div key={key} className="flex flex-col">
                            <dt className="font-medium text-muted-foreground">{formattedKey}</dt>
                            <dd>{formatValue(value)}</dd>
                        </div>
                    );
                  })}
                </dl>
                {result.relatedDocs && result.relatedDocs.length > 0 && (
                    <div className="mt-4 pt-3 border-t">
                        <h4 className="text-xs font-semibold uppercase text-muted-foreground">Linked To:</h4>
                        <ul className="mt-1 text-sm">
                            {result.relatedDocs.map(doc => (
                                <li key={doc.id} className="flex items-center gap-2 text-primary hover:underline cursor-pointer">
                                    <LinkIcon className="h-3 w-3" />
                                    <span>{doc.type}: <span className="font-mono">{doc.id}</span></span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
              </CardContent>
            </Card>
             {index < validResults.length - 1 && (
                <div className="absolute left-[-24px] top-full h-6 w-px bg-primary/20 my-1">
                    <ArrowRight className="h-4 w-4 absolute -right-[8px] top-1/2 -translate-y-1/2 rotate-90 text-primary/50" />
                </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
