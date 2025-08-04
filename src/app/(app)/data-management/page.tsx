
"use client";

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    const [testDataPrefix, setTestDataPrefix] = useState<string>("TEST-");
    
    const mutation = useMutation({
        mutationFn: handleDataManagementAction,
        onSuccess: (data, variables) => {
            if (variables.action === 'delete-test-data') {
                toast({
                    title: "Test Data Deleted",
                    description: `${data.count} records matching the prefix "${variables.prefix}" have been deleted.`,
                });
            }
            if (variables.action === 'export-xml') {
                if (data.xml) {
                    const blob = new Blob([data.xml], { type: 'application/xml' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'production_logs.xml';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                     toast({
                        title: "Export Successful",
                        description: "Your production logs have been downloaded as an XML file.",
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
        if (testDataPrefix) {
            mutation.mutate({ action: 'delete-test-data', prefix: testDataPrefix });
        } else {
            toast({ title: "Prefix Required", description: "Please enter a prefix to identify test data.", variant: 'destructive'});
        }
    };
    
    const handleExport = () => {
        mutation.mutate({ action: 'export-xml' });
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
                            Permanently delete all production logs where the primary ID (e.g., `steam_batch_id`, `lot_number`) starts with a specific prefix. This action cannot be undone.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Warning</AlertTitle>
                            <AlertDescription>
                                This is a destructive action. Be absolutely sure before proceeding. It is recommended to back up your data first.
                            </AlertDescription>
                        </Alert>
                        <div>
                            <Label htmlFor="test-prefix">Test Data Prefix</Label>
                            <Input 
                                id="test-prefix" 
                                value={testDataPrefix}
                                onChange={(e) => setTestDataPrefix(e.target.value)}
                                placeholder="e.g., TEST-"
                            />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" disabled={!testDataPrefix || mutation.isPending}>
                                    {mutation.isPending && mutation.options?.variables?.action === 'delete-test-data' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                    Delete Test Data
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will permanently delete all production logs with IDs starting with <strong className="font-mono text-destructive">{testDataPrefix}</strong>. This action cannot be undone.
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
                            Export a complete set of your production logs to an XML file. This is useful for backups, external analysis, or migrating data.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            Click the button below to generate and download an XML file containing all entries from the production logs collection.
                        </p>
                    </CardContent>
                    <CardFooter>
                         <Button onClick={handleExport} disabled={mutation.isPending}>
                             {mutation.isPending && mutation.options?.variables?.action === 'export-xml' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                            Export All Logs as XML
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
