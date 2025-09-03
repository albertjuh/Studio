
"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getNyangaWorkersAction, addNyangaWorkerAction, deleteNyangaWorkerAction } from '@/lib/nyanga-actions';
import type { NyangaWorker } from '@/types';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, Trash2, Plus, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
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
} from "@/components/ui/alert-dialog"

export default function ManageNyangaWorkersPage() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [newWorkerName, setNewWorkerName] = useState('');

    const { data: workers, isLoading, isError, error } = useQuery<NyangaWorker[]>({
        queryKey: ['nyangaWorkers'],
        queryFn: getNyangaWorkersAction,
    });

    const addMutation = useMutation({
        mutationFn: addNyangaWorkerAction,
        onSuccess: () => {
            toast({ title: "Worker Added", description: `"${newWorkerName}" has been added to the list.` });
            setNewWorkerName('');
            queryClient.invalidateQueries({ queryKey: ['nyangaWorkers'] });
        },
        onError: (error) => {
            toast({ title: "Error Adding Worker", description: (error as Error).message, variant: "destructive" });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: deleteNyangaWorkerAction,
        onSuccess: (data, workerName) => {
            toast({ title: "Worker Deleted", description: `"${workerName}" has been removed.` });
            queryClient.invalidateQueries({ queryKey: ['nyangaWorkers'] });
        },
        onError: (error) => {
             toast({ title: "Error Deleting Worker", description: (error as Error).message, variant: "destructive" });
        }
    });

    const handleAddWorker = () => {
        if (newWorkerName.trim()) {
            addMutation.mutate(newWorkerName.trim());
        }
    };
    
    const handleDeleteWorker = (workerId: string, workerName: string) => {
        deleteMutation.mutate({workerId, workerName});
    };

    return (
        <div className="container mx-auto py-6">
            <div className="flex items-center gap-3 mb-6">
                <Users className="h-8 w-8 text-primary" />
                <h2 className="text-3xl font-bold tracking-tight text-foreground">Manage Nyanga Workers</h2>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Add New Worker</CardTitle>
                        <CardDescription>Add a new worker to the list available in the Nyanga production form.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center space-x-2">
                             <Input 
                                placeholder="Enter worker's full name" 
                                value={newWorkerName}
                                onChange={(e) => setNewWorkerName(e.target.value)}
                                disabled={addMutation.isPending}
                             />
                             <Button onClick={handleAddWorker} disabled={addMutation.isPending || !newWorkerName.trim()}>
                                {addMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                                Add
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                 <Card className="md:col-span-1">
                    <CardHeader>
                        <CardTitle>Current Worker List</CardTitle>
                        <CardDescription>This is the list of active workers who can be assigned production in the data entry forms.</CardDescription>
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
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>{(error as Error).message}</AlertDescription>
                            </Alert>
                        )}
                        {workers && (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Date Added</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {workers.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center h-24">No workers have been added yet.</TableCell>
                                        </TableRow>
                                    ) : (
                                        workers.map(worker => (
                                            <TableRow key={worker.id}>
                                                <TableCell className="font-medium">{worker.name}</TableCell>
                                                <TableCell>{format(new Date(worker.createdAt), 'PPP')}</TableCell>
                                                <TableCell className="text-right">
                                                   <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10">
                                                                {deleteMutation.isPending && deleteMutation.variables?.workerId === worker.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    This will permanently delete <strong className="text-foreground">{worker.name}</strong> from the worker list. This action cannot be undone.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDeleteWorker(worker.id, worker.name)} className="bg-destructive hover:bg-destructive/90">
                                                                    Yes, delete worker
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
