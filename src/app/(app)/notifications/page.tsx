
"use client";

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getNotificationSettingsAction, saveNotificationSettingsAction, isEmailServiceConfiguredAction } from '@/lib/actions';
import type { NotificationSettings } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription, FormMessage } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Loader2, Mail, Save, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

const notificationSettingsSchema = z.object({
  dailySummaryEmailEnabled: z.boolean().default(false),
  recipientEmail: z.string().email({ message: "Please enter a valid email address." }).or(z.literal("")).optional(),
}).refine(data => {
    if (data.dailySummaryEmailEnabled) {
        return data.recipientEmail && data.recipientEmail !== "";
    }
    return true;
}, {
    message: "A recipient email is required when daily summaries are enabled.",
    path: ["recipientEmail"],
});

export default function NotificationsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: isEmailConfigured, isLoading: isLoadingConfig } = useQuery<boolean>({
    queryKey: ['emailConfigStatus'],
    queryFn: isEmailServiceConfiguredAction,
  });

  const { data: settings, isLoading: isLoadingSettings, isError, error } = useQuery<NotificationSettings>({
    queryKey: ['notificationSettings'],
    queryFn: getNotificationSettingsAction,
    enabled: !!isEmailConfigured, // Only fetch settings if email is configured
  });

  const form = useForm<NotificationSettings>({
    resolver: zodResolver(notificationSettingsSchema),
    defaultValues: {
      dailySummaryEmailEnabled: false,
      recipientEmail: '',
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset(settings);
    }
  }, [settings, form]);
  
  const mutation = useMutation({
      mutationFn: saveNotificationSettingsAction,
      onSuccess: () => {
          toast({
              title: "Settings Saved",
              description: "Your notification settings have been updated.",
          });
          queryClient.invalidateQueries({ queryKey: ['notificationSettings'] });
      },
      onError: (error: any) => {
          toast({
              title: "Error Saving Settings",
              description: error.message || "Could not save your settings. Please try again.",
              variant: "destructive",
          });
      }
  });
  
  const onSubmit = (data: NotificationSettings) => {
      mutation.mutate(data);
  };

  const isLoading = isLoadingConfig || isLoadingSettings;

  return (
    <div className="container mx-auto py-6">
      <h2 className="text-3xl font-bold tracking-tight text-foreground mb-6">Email Notifications</h2>
      
      {!isLoadingConfig && !isEmailConfigured && (
          <Alert variant="destructive" className="mb-6 max-w-2xl mx-auto">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Email Service Not Configured</AlertTitle>
              <AlertDescription>
                  The email sending service is not set up correctly. Please provide `SENDGRID_API_KEY` and `SENDGRID_FROM_EMAIL` in your environment variables to enable this feature. Notifications cannot be sent until this is resolved.
              </AlertDescription>
          </Alert>
      )}

      <Card className="shadow-lg max-w-2xl mx-auto">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Notification Settings
              </CardTitle>
              <CardDescription>
                Manage your preferences for automated email notifications, such as daily AI summaries.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoading ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between space-x-4">
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-6 w-12 rounded-full" />
                  </div>
                  <div className="space-y-2">
                     <Skeleton className="h-4 w-1/4" />
                     <Skeleton className="h-10 w-full" />
                  </div>
                </div>
              ) : isError ? (
                 <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error Loading Settings</AlertTitle>
                  <AlertDescription>{(error as Error)?.message || 'Could not load your settings.'}</AlertDescription>
                </Alert>
              ) : (
                <>
                  <FormField
                    control={form.control}
                    name="dailySummaryEmailEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Daily AI Summary Emails</FormLabel>
                          <FormDescription>
                            Receive an email each day with the AI-generated summary.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={!isEmailConfigured}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="recipientEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Recipient Email Address</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., manager@example.com" {...field} 
                            disabled={!isEmailConfigured || !form.watch('dailySummaryEmailEnabled')}
                          />
                        </FormControl>
                        <FormDescription>
                          The email address where the notifications will be sent.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
                <Button type="submit" disabled={mutation.isPending || isLoading || !isEmailConfigured}>
                    {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Settings
                </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
    
