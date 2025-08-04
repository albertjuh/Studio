
"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addNyangaWorkerAction, deleteNyangaWorkerAction } from '@/lib/nyanga-actions';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Loader2, Trash2, AlertCircle } from 'lucide-react';
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
import { Skeleton } from '../ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';

const addWorkerSchema = z.object({
  name: z.string().min(2, "Worker name must be at least 2 characters."),
});

interface AddWorkerFormProps {
  workers?: NyangaWorker[];
  isLoading: boolean;
  isError: boolean;
}

export function AddWorkerForm({ workers, isLoading, isError }: AddWorkerFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
    onSuccess: (result) => {
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
  
  const renderWorkerList = () => {
    if (isLoading) {
      return (
        <div className="space-y-3 p-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
        </div>
      )
    }

    if (isError) {
      return (
         <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Workers</AlertTitle>
          <AlertDescription>Could not load the list of workers. Please try again later.</AlertDescription>
        </Alert>
      )
    }

    if (!workers || workers.length === 0) {
      return <p className="text-center text-xs text-muted-foreground py-4">No workers added yet.</p>
    }

    return (
      <div className="p-2 space-y-2">
        {workers.map(worker => (
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
                    disabled={deleteMutation.isPending && deleteMutation.options?.variables === worker.id}
                  >
                    {deleteMutation.isPending && deleteMutation.options?.variables === worker.id ? <Loader2 className="mr-2 animate-spin" /> : null}
                    Yes, remove worker
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Add a New Worker</h3>
        <p className="text-sm text-muted-foreground">Enter the full name of a new worker to add them to the daily report list.</p>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Worker Name</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                        <Input placeholder="Enter full name" {...field} />
                    </FormControl>
                     <Button type="submit" disabled={addMutation.isPending}>
                        {addMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                        Add
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-medium">Current Worker List</h3>
        <p className="text-sm text-muted-foreground mb-2">The list of all active workers who will appear on the daily entry form.</p>
        <ScrollArea className="h-72 pr-4 border rounded-md">
            {renderWorkerList()}
        </ScrollArea>
      </div>
    </div>
  );
}
