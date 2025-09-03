
"use client";

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getNyangaWorkersAction, addNyangaWorkerAction, deleteNyangaWorkerAction } from '@/lib/nyanga-actions';
import type { NyangaWorker } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import { Loader2, Trash2, UserPlus, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle as UiAlertTitle } from '@/components/ui/alert';

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
      toast({ title: 'Worker Added', description: `"${newWorkerName}" has been added to the list.` });
      setNewWorkerName('');
      queryClient.invalidateQueries({ queryKey: ['nyangaWorkers'] });
    },
    onError: (error) => {
      toast({ title: 'Error Adding Worker', description: (error as Error).message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNyangaWorkerAction,
    onSuccess: (_, workerId) => {
      toast({ title: 'Worker Deleted', description: 'The worker has been removed from the list.' });
      queryClient.invalidateQueries({ queryKey: ['nyangaWorkers'] });
    },
    onError: (error) => {
      toast({ title: 'Error Deleting Worker', description: (error as Error).message, variant: 'destructive' });
    },
  });

  const handleAddWorker = () => {
    if (newWorkerName.trim()) {
      addMutation.mutate(newWorkerName.trim());
    }
  };
  
  const handleDeleteWorker = (id: string) => {
    deleteMutation.mutate(id);
  };

  return (
    <div className="container mx-auto py-6">
       <div className="flex items-center gap-3 mb-6">
          <UserPlus className="h-8 w-8 text-primary" />
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Manage Nyanga Workers</h2>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Add New Worker</CardTitle>
            <CardDescription>Enter the full name of the new worker to add them to the list.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="e.g., Jane Doe"
                value={newWorkerName}
                onChange={(e) => setNewWorkerName(e.target.value)}
                disabled={addMutation.isPending}
              />
              <Button onClick={handleAddWorker} disabled={addMutation.isPending || !newWorkerName.trim()}>
                {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Worker'}
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Current Worker List</CardTitle>
            <CardDescription>
                A list of all active workers available for selection in the Nyanga Production Log.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            )}
            {isError && (
                 <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <UiAlertTitle>Error Loading Workers</UiAlertTitle>
                    <AlertDescription>{(error as Error).message}</AlertDescription>
                </Alert>
            )}
            {workers && (
              <div className="border rounded-md max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Date Added</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center h-24">No workers found. Add one to get started.</TableCell>
                      </TableRow>
                    )}
                    {workers.map((worker) => (
                      <TableRow key={worker.id}>
                        <TableCell className="font-medium">{worker.name}</TableCell>
                        <TableCell>{format(new Date(worker.createdAt), 'PPP')}</TableCell>
                        <TableCell className="text-right">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" disabled={deleteMutation.isPending && deleteMutation.variables === worker.id}>
                                    {deleteMutation.isPending && deleteMutation.variables === worker.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                </Button>
                            </AlertDialogTrigger>
                             <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will permanently delete <strong className="text-destructive">{worker.name}</strong> from the worker list. This action cannot be undone.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteWorker(worker.id)} className="bg-destructive hover:bg-destructive/90">
                                    Yes, delete worker
                                </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

