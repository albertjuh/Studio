
"use client";

import { useState } from 'react';
import type { TraceabilityRequest, TraceabilityResult } from '@/types';
import { TraceabilityRequestForm } from '@/components/traceability/traceability-request-form';
import { TraceabilityResultsDisplay } from '@/components/traceability/traceability-results-display';
import { History } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { getTraceabilityReportAction } from '@/lib/actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function TraceabilityPage() {
    const { toast } = useToast();
    const [results, setResults] = useState<TraceabilityResult[] | null>(null);

    const mutation = useMutation({
        mutationFn: async (request: TraceabilityRequest) => {
            console.log("Fetching traceability for:", request.batchId);
            return getTraceabilityReportAction(request);
        },
        onSuccess: (data) => {
            if (data && data.length > 0) {
                setResults(data);
                 toast({
                    title: "Trace Complete",
                    description: `Found ${data.length} step(s) in the production history.`,
                });
            } else {
                setResults([]);
                 toast({
                    title: "No Results Found",
                    description: "Could not find any history for the provided ID. Please check the ID and try again.",
                    variant: "destructive",
                });
            }
        },
        onError: (error) => {
            console.error("Traceability search failed:", error);
            toast({
                title: "Traceability Error",
                description: (error as Error).message,
                variant: "destructive",
            });
            setResults([]);
        }
    });

    const handleSearch = (request: TraceabilityRequest) => {
        setResults(null); // Clear previous results before new search
        mutation.mutate(request);
    };

    return (
        <div className="container mx-auto py-6">
            <div className="flex items-center gap-3 mb-6">
                <History className="h-8 w-8 text-primary" />
                <h2 className="text-3xl font-bold tracking-tight text-foreground">Product Traceability</h2>
            </div>
            
             <TraceabilityRequestForm onSearch={handleSearch} isLoading={mutation.isPending} />
             <div className="mt-8">
                <TraceabilityResultsDisplay results={results} isLoading={mutation.isPending} />
            </div>
        </div>
    );
}
