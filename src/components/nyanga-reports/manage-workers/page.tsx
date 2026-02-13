"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getNyangaWorkersAction, deleteNyangaWorkerAction } from '@/lib/nyanga-actions';
import type { NyangaWorker } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AddNyangaWorkerForm } from "@/components/data-entry/add-nyanga-worker-form";
import { Loader2, AlertCircle, Trash2, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function ManageNyangaWorkersPage() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: workers, isLoading, isError, error } = useQuery<NyangaWorker[]>({
        queryKey: ['nyangaWorkers'],
        queryFn: getNyangaWorkersAction,
    });

    const deleteMutation = useMutation({
        mutationFn: deleteNyangaWorkerAction,
        onSuccess: (result, workerId) => {
            if (result.success) {
                toast({ title: "Worker Removed", description: `The worker has been successfully removed.`, variant: "success" });
                queryClient.invalidateQueries({ queryKey: ['nyangaWorkers'] });
            } else {
                toast({ title: "Error", description: result.error, variant: "destructive" });
            }
        },
        onError: (error: any) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    });

    const handleWorkerAdded = () => {
        queryClient.invalidateQueries({ queryKey: ['nyangaWorkers'] });
    }

    return (
        <div className="container mx-auto py-6">
             <div className="flex items-center gap-3 mb-6">
                <Users className="h-8 w-8 text-primary" />
                <h2 className="text-3xl font-bold tracking-tight text-foreground">Manage Nyanga Workers</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Add New Worker</CardTitle>
                        <CardDescription>Add a new person to the Nyanga team.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <AddNyangaWorkerForm onFormSubmit={handleWorkerAdded} onFormDirtyChange={() => {}} />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Current Workers</CardTitle>
                        <CardDescription>The list of all active Nyanga workers.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading && (
                             <div className="flex items-center justify-center p-8">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        )}
                        {isError && (
                             <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Error Loading Workers</AlertTitle>
                                <AlertDescription>{(error as Error).message}</AlertDescription>
                            </Alert>
                        )}
                        {workers && (
                            <ScrollArea className="h-72">
                                <div className="space-y-2">
                                    {workers.map((worker) => (
                                        <div key={worker.id} className="flex items-center justify-between p-3 rounded-md border bg-muted/50">
                                            <span className="font-medium">{worker.name}</span>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This will permanently remove <strong className="text-foreground">{worker.name}</strong>. This action cannot be undone.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => deleteMutation.mutate(worker.id)} className="bg-destructive hover:bg-destructive/90">
                                                            Yes, remove worker
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    ))}
                                    {workers.length === 0 && <p className="text-center text-muted-foreground py-4">No workers have been added yet.</p>}
                                </div>
                            </ScrollArea>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
