
"use client";

import { useState } from 'react';
import type { TraceabilityFlowRequest, TraceabilityFlowOutput } from '@/ai/flows/traceability-flow';
import { TraceabilityRequestForm } from '@/components/traceability/traceability-request-form';
import { TraceabilityResultsDisplay } from '@/components/traceability/traceability-results-display';
import { History, PackageSearch } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { getTraceabilityReportAction } from '@/lib/actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import { VacuumBagTraceability } from '@/components/traceability/vacuum-bag-traceability';

export default function TraceabilityPage() {
    const { toast } = useToast();
    const [results, setResults] = useState<TraceabilityFlowOutput | null>(null);

    const mutation = useMutation({
        mutationFn: async (request: TraceabilityFlowRequest) => {
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

    const handleSearch = (request: TraceabilityFlowRequest) => {
        setResults(null); // Clear previous results before new search
        mutation.mutate(request);
    };

    return (
        <div className="container mx-auto py-6">
             <Tabs defaultValue="product">
                <div className="flex items-center justify-between mb-6">
                    <TabsList>
                        <TabsTrigger value="product">
                            <History className="mr-2 h-4 w-4" />
                            Product Traceability
                        </TabsTrigger>
                        <TabsTrigger value="bags">
                            <PackageSearch className="mr-2 h-4 w-4" />
                            Vacuum Bag Traceability
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="product">
                    <div className="space-y-6">
                        <TraceabilityRequestForm onSearch={handleSearch} isLoading={mutation.isPending} />
                        <div className="mt-8">
                            <TraceabilityResultsDisplay results={results} isLoading={mutation.isPending} />
                        </div>
                    </div>
                </TabsContent>
                <TabsContent value="bags">
                    <VacuumBagTraceability />
                </TabsContent>
            </Tabs>
        </div>
    );
}
