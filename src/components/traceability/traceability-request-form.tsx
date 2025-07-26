
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchCode, Loader2 } from "lucide-react";
import type { TraceabilityRequest } from "@/types";

interface TraceabilityRequestFormProps {
  onSearch: (request: TraceabilityRequest) => void;
  isLoading: boolean;
}

const formSchema = z.object({
  batchId: z.string().min(3, "Batch or Lot ID must be at least 3 characters."),
});

export function TraceabilityRequestForm({ onSearch, isLoading }: TraceabilityRequestFormProps) {
  const form = useForm<TraceabilityRequest>({
    resolver: zodResolver(formSchema),
    defaultValues: { batchId: "" },
  });

  function onSubmit(data: TraceabilityRequest) {
    onSearch(data);
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SearchCode className="h-5 w-5 text-primary" />
          Traceability Request
        </CardTitle>
        <CardDescription>
          Enter any Batch ID or Lot Number to trace its full production history, from intake to dispatch.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col sm:flex-row items-start gap-4">
            <FormField
              control={form.control}
              name="batchId"
              render={({ field }) => (
                <FormItem className="flex-1 w-full">
                  <FormLabel className="sr-only">Batch or Lot ID</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., PKG-YYYYMMDD-001, LOT-240726-A" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <SearchCode className="mr-2 h-4 w-4" />
              )}
              Trace
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
