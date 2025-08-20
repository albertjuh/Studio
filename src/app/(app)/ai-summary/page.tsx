
"use client";

import { useState } from 'react';
import type { TraceabilityRequest, TraceabilityResult, VacuumBagBatch } from '@/types';
import { TraceabilityRequestForm } from '@/components/traceability/traceability-request-form';
import { TraceabilityResultsDisplay } from '@/components/traceability/traceability-results-display';
import { History } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getTraceabilityReportAction, getVacuumBagTraceabilityReportAction } from '@/lib/actions'; // Placeholder for the actual action
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { VacuumBagTraceabilityDashboard } from '@/components/traceability/vacuum-bag-dashboard';

export default function TraceabilityPage({ params, searchParams }: { params: {}; searchParams: {} }) {
    const [results, setResults] = useState<TraceabilityResult[] | null>(null);

    const mutation = useMutation({
        mutationFn: async (request: TraceabilityRequest) => {
            console.log("Fetching traceability for:", request.batchId);
            // In a real scenario, this would call getTraceabilityReportAction
            // For now, it returns mock data to demonstrate the UI.
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
            
            <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="general">Product/Lot Traceability</TabsTrigger>
                    <TabsTrigger value="vacuum-bags">Vacuum Bag Traceability</TabsTrigger>
                </TabsList>
                <TabsContent value="general" className="mt-4">
                     <TraceabilityRequestForm onSearch={handleSearch} isLoading={mutation.isPending} />
                     <div className="mt-8">
                        <TraceabilityResultsDisplay results={results} isLoading={mutation.isPending} />
                    </div>
                </TabsContent>
                <TabsContent value="vacuum-bags" className="mt-4">
                    <Card>
                        <CardHeader>
                             <CardTitle>Vacuum Bag Traceability Dashboard</CardTitle>
                             <CardDescription>
                                An overview of all vacuum bag shipments, showing usage, wastage, and current stock levels for each batch.
                             </CardDescription>
                        </CardHeader>
                        <CardContent>
                           <VacuumBagTraceabilityDashboard />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
