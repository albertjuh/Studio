
"use client";

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { handleDataManagementAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { DatabaseZap, Trash2, Download, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


export default function DataManagementPage() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    
    const mutation = useMutation({
        mutationFn: handleDataManagementAction,
        onSuccess: (data, variables) => {
            if (variables.action === 'delete-test-data') {
                toast({
                    title: "Test Data Deleted",
                    description: `${data.count} records entered by the user "Test" have been deleted and their transactions reversed.`,
                });
                // Invalidate dashboard and inventory queries to force a refresh
                queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
                queryClient.invalidateQueries({ queryKey: ['finishedGoodsStock'] });
                queryClient.invalidateQueries({ queryKey: ['inventoryLogs'] });
            }
            if (variables.action === 'export-csv') {
                if (data.csv) {
                    const blob = new Blob([data.csv], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'production_logs.csv';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                     toast({
                        title: "Export Successful",
                        description: "Your production logs have been downloaded as a CSV file.",
                    });
                }
            }
        },
        onError: (error: any) => {
            toast({
                title: "An Error Occurred",
                description: error.message || "The data management operation failed.",
                variant: "destructive",
            });
        }
    });

    const handleDelete = () => {
        mutation.mutate({ action: 'delete-test-data', username: 'Test' });
    };
    
    const handleExport = () => {
        mutation.mutate({ action: 'export-csv' });
    };

    return (
        <div className="container mx-auto py-6">
            <div className="flex items-center gap-3 mb-6">
                <DatabaseZap className="h-8 w-8 text-primary" />
                <h2 className="text-3xl font-bold tracking-tight text-foreground">Data Management</h2>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle>Delete Test Data</CardTitle>
                        <CardDescription>
                            Permanently delete all production logs where the operator or supervisor was "Test" and reverse the associated inventory transactions. This action cannot be undone.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Warning</AlertTitle>
                            <AlertDescription>
                                This is a destructive action that will alter your inventory stock levels. Be absolutely sure before proceeding. It is recommended to back up your data first.
                            </AlertDescription>
                        </Alert>
                         <p className="text-sm text-muted-foreground">
                            This will find all entries created by the user named "Test" and undo them. Use this to clean up sample data entered during training or testing sessions.
                        </p>
                    </CardContent>
                    <CardFooter>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" disabled={mutation.isPending && mutation.options?.variables?.action === 'delete-test-data'}>
                                    {mutation.isPending && mutation.options?.variables?.action === 'delete-test-data' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                    Delete Test User Data
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will permanently delete all production logs entered by the user <strong className="font-mono text-destructive">Test</strong> and reverse their impact on your inventory. This action cannot be undone.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                                    Yes, delete the data
                                </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </CardFooter>
                </Card>

                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle>Export Data</CardTitle>
                        <CardDescription>
                            Export a complete set of your production logs to a CSV file. This is useful for backups, external analysis, or migrating data.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            Click the button below to generate and download a CSV file containing all entries from the production logs collection.
                        </p>
                    </CardContent>
                    <CardFooter>
                         <Button onClick={handleExport} disabled={mutation.isPending && mutation.options?.variables?.action === 'export-csv'}>
                             {mutation.isPending && mutation.options?.variables?.action === 'export-csv' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                            Export All Logs as CSV
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
