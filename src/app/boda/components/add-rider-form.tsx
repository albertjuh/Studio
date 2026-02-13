
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
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useState } from 'react';
import { useLanguage } from '../lib/i18n';

const riderFormSchema = z.object({
  name: z.string().min(3, "Rider's name must be at least 3 characters."),
  phone: z.string().min(10, "Please enter a valid phone number."),
  bikePlateNumber: z.string().min(3, "Please enter a valid bike plate number."),
  contractStartDate: z.date({ required_error: "A contract start date is required." }),
});

type RiderFormValues = z.infer<typeof riderFormSchema>;

interface AddRiderFormProps {
  onFormSubmit?: () => void;
}

export function AddRiderForm({ onFormSubmit }: AddRiderFormProps) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<RiderFormValues>({
    resolver: zodResolver(riderFormSchema),
    defaultValues: {
      name: '',
      phone: '',
      bikePlateNumber: '',
      contractStartDate: new Date(),
    }
  });

  const generateUsername = (name: string): string => {
    const parts = name.toLowerCase().split(' ').filter(Boolean);
    if (parts.length === 0) {
      // Fallback for empty name
      return `user${Math.floor(Math.random() * 1000)}`;
    }
    if (parts.length === 1) {
      return parts[0];
    }
    // e.g., "John Doe" -> "j.doe"
    return `${parts[0].charAt(0)}.${parts[parts.length - 1]}`;
  };


  // Mock submission handler
  const onSubmit = (data: RiderFormValues) => {
    setIsLoading(true);

    const generatedUsername = generateUsername(data.name);
    const generatedPassword = 'password'; // Simple default password as requested
    
    const submissionData = { ...data, username: generatedUsername, password: generatedPassword };
    
    console.log("New Rider Data:", submissionData);
    
    setTimeout(() => {
        toast({
            title: t('accountCreated'),
            description: t('accountCreatedDescription', { 
                name: data.name, 
                username: generatedUsername, 
                password: generatedPassword 
            }),
            variant: "success",
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('ridersFullName')}</FormLabel>
              <FormControl>
                <Input placeholder={t('riderNamePlaceholder')} {...field} />
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
              <FormLabel>{t('ridersPhoneNumber')}</FormLabel>
              <FormControl>
                <Input placeholder={t('riderPhonePlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
            control={form.control}
            name="bikePlateNumber"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>{t('bikePlateNumber')}</FormLabel>
                     <FormControl>
                        <Input placeholder={t('bikePlatePlaceholder')} {...field} />
                    </FormControl>
                    <FormDescription>
                        {t('bikePlateDescription')}
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
                <FormLabel>{t('contractStartDate')}</FormLabel>
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
                            <span>{t('pickADate')}</span>
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
        <div className="flex justify-end pt-2">
            <Button type="submit" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                {t('addRider')}
            </Button>
        </div>
      </form>
    </Form>
  )
}
