
"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addNyangaWorkerAction, deleteNyangaWorkerAction } from '@/lib/nyanga-actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Loader2, Users, Trash2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getNyangaWorkersAction } from '@/lib/nyanga-actions';
import type { NyangaWorker } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
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

const addWorkerSchema = z.object({
  name: z.string().min(2, "Worker name must be at least 2 characters."),
});

export function AddWorkerForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: workers } = useQuery<NyangaWorker[]>({
    queryKey: ['nyangaWorkers'],
    queryFn: getNyangaWorkersAction,
  });

  const form = useForm<{ name: string }>({
    resolver: zodResolver(addWorkerSchema),
    defaultValues: { name: '' },
  });

  const addMutation = useMutation({
    mutationFn: addNyangaWorkerAction,
    onSuccess: (result) => {
      if (result.success) {
        toast({ title: 'Worker Added', description: `Successfully added ${form.getValues('name')}.` });
        queryClient.invalidateQueries({ queryKey: ['nyangaWorkers'] });
        form.reset();
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    },
    onError: (error) => {
      toast({ title: 'Error', description: (error as Error).message, variant: 'destructive' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNyangaWorkerAction,
    onSuccess: (result, deletedWorkerId) => {
       if (result.success) {
        toast({ title: 'Worker Removed', description: `Worker has been removed from the list.` });
        queryClient.invalidateQueries({ queryKey: ['nyangaWorkers'] });
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    },
     onError: (error) => {
      toast({ title: 'Error', description: (error as Error).message, variant: 'destructive' });
    }
  });


  const onSubmit = (data: { name: string }) => {
    addMutation.mutate(data.name);
  };
  
  const handleDelete = (workerId: string) => {
    deleteMutation.mutate(workerId);
  }

  return (
    <Card className="sticky top-20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Users /> Manage Workers</CardTitle>
        <CardDescription>Add new workers to the list or remove existing ones.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Worker Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter full name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={addMutation.isPending} className="w-full">
              {addMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
              Add Worker
            </Button>
          </form>
        </Form>
        <div className="mt-6">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Current Worker List</h4>
            <ScrollArea className="h-64 pr-4 border rounded-md">
                <div className="p-2 space-y-2">
                {workers && workers.filter(w => w.status === 'active').map(worker => (
                    <div key={worker.id} className="flex items-center justify-between text-sm p-2 rounded-md hover:bg-muted">
                        <span>{worker.name}</span>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                             <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/70 hover:text-destructive hover:bg-destructive/10">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                             <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will remove <strong className="font-mono text-destructive">{worker.name}</strong> from the active list. They will no longer appear for daily entries. This action can be reversed by your administrator.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive hover:bg-destructive/90"
                                onClick={() => handleDelete(worker.id)}
                                disabled={deleteMutation.isPending}
                              >
                                {deleteMutation.isPending && deleteMutation.options?.variables === worker.id ? <Loader2 className="mr-2 animate-spin" /> : null}
                                Yes, remove worker
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                    </div>
                ))}
                 {workers?.length === 0 && <p className="text-center text-xs text-muted-foreground py-4">No workers added yet.</p>}
                </div>
            </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
