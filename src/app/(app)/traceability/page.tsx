
"use client";

import { useState } from 'react';
import type { TraceabilityRequest, TraceabilityResult } from '@/types';
import { TraceabilityRequestForm } from '@/components/traceability/traceability-request-form';
import { TraceabilityResultsDisplay } from '@/components/traceability/traceability-results-display';
import { History } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { getTraceabilityReportAction } from '@/lib/actions'; // Placeholder for the actual action

export default function TraceabilityPage() {
    const [results, setResults] = useState<TraceabilityResult[] | null>(null);

    const mutation = useMutation({
        // This mutation will eventually call a server action to fetch traceability data.
        // For now, it returns mock data to demonstrate the UI.
        mutationFn: async (request: TraceabilityRequest) => {
            console.log("Fetching traceability for:", request.batchId);
            // Replace with: await getTraceabilityReportAction(request);
            // Mock delay
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Mock data structure
            return [
                { id: 'PKG-20230727-001', type: 'Packaging', timestamp: new Date().toISOString(), details: { 'Kernel Grade': 'W240', 'Packages Produced': 100 }, relatedDocs: [{ id: 'QC-FIN-20230727-001', type: 'Final QC'}] },
                { id: 'QC-FIN-20230727-001', type: 'Final QC', timestamp: new Date().toISOString(), details: { 'Result': 'Approved', 'Moisture': '4.5%' }, relatedDocs: [{ id: 'MP-20230727-001', type: 'Manual Peeling'}] },
                { id: 'MP-20230727-001', type: 'Manual Peeling', timestamp: new Date().toISOString(), details: { 'Input KG': 50, 'Output KG': 48.5 }, relatedDocs: [{ id: 'DRY-20230726-003', type: 'Drying'}] },
            ] as TraceabilityResult[];
        },
        onSuccess: (data) => {
            setResults(data);
        },
        onError: (error) => {
            console.error("Traceability search failed:", error);
            // Here you would use a toast to show an error message
        }
    });

    const handleSearch = (request: TraceabilityRequest) => {
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
