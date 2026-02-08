
"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, UserPlus, Loader2 } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { BIKE_IDS } from '../lib/constants';
import { useState } from 'react';

const riderFormSchema = z.object({
  name: z.string().min(3, "Rider's name must be at least 3 characters."),
  phone: z.string().min(10, "Please enter a valid phone number."),
  bikeId: z.string().min(1, "You must assign a bike to the rider."),
  contractStartDate: z.date({ required_error: "A contract start date is required." }),
});

type RiderFormValues = z.infer<typeof riderFormSchema>;

interface AddRiderFormProps {
  onFormSubmit?: () => void;
}

export function AddRiderForm({ onFormSubmit }: AddRiderFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<RiderFormValues>({
    resolver: zodResolver(riderFormSchema),
    defaultValues: {
      name: '',
      phone: '',
      bikeId: '',
      contractStartDate: new Date(),
    }
  });

  // Mock submission handler
  const onSubmit = (data: RiderFormValues) => {
    setIsLoading(true);
    console.log("New Rider Data:", data);
    setTimeout(() => {
        toast({
            title: "Rider Added",
            description: `${data.name} has been added and assigned bike ${data.bikeId}.`
        });
        setIsLoading(false);
        form.reset();
        if (onFormSubmit) {
            onFormSubmit();
        }
    }, 1000);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rider's Full Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rider's Phone Number</FormLabel>
              <FormControl>
                <Input placeholder="e.g., 0712 345 678" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
            control={form.control}
            name="bikeId"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Assign Bike</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select an available bike" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {BIKE_IDS.map(id => (
                                <SelectItem key={id} value={id}>{id}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormDescription>
                        Choose a bike from the fleet to assign to this rider.
                    </FormDescription>
                    <FormMessage />
                </FormItem>
            )}
        />
         <FormField
            control={form.control}
            name="contractStartDate"
            render={({ field }) => (
            <FormItem className="flex flex-col">
                <FormLabel>Contract Start Date</FormLabel>
                <Popover>
                    <PopoverTrigger asChild>
                        <FormControl>
                        <Button
                            variant={"outline"}
                            className={cn(
                            "pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                            )}
                        >
                            {field.value ? (
                            format(field.value, "PPP")
                            ) : (
                            <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                        </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                        />
                    </PopoverContent>
                </Popover>
                <FormMessage />
            </FormItem>
            )}
        />
        <div className="flex justify-end">
            <Button type="submit" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                Add Rider
            </Button>
        </div>
      </form>
    </Form>
  )
}
