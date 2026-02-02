'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { CalendarIcon, Languages, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

const formSchema = z.object({
  // Personal Info
  fullName: z.string().min(1, { message: 'Full Name is required.' }),
  age: z.coerce.number().min(15).max(50),
  phoneNumber: z.string().regex(/^(?:\+255|0)\d{9}$/, { message: 'Invalid Tanzanian phone number.' }),
  altPhoneNumber: z.string().optional(),
  maritalStatus: z.enum(['Single', 'Married', 'Divorced/Separated', 'Widowed']),

  // Address
  ward: z.string().min(1, 'Ward/Mtaa is required.'),
  street: z.string().min(1, 'Street Name is required.'),
  houseNumber: z.string().optional(),
  chairpersonName: z.string().optional(),
  
  // Health Facility
  facility: z.string().min(1, 'Health facility is required.'),
  firstAncDate: z.date(),
  
  // Pregnancy Info
  lmpDate: z.date(),
  previousPregnancies: z.string(),
  isPlanned: z.enum(['Yes', 'No']),
  
  // Consent
  agreeToParticipate: z.boolean().refine(val => val === true, { message: 'You must agree to participate.' }),
  understandConfidentiality: z.boolean().refine(val => val === true, { message: 'You must agree to the confidentiality terms.' }),
});

export default function AncRegistrationPage() {
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: '',
      age: undefined,
      phoneNumber: '',
      altPhoneNumber: '',
      maritalStatus: undefined,
      ward: '',
      street: '',
      houseNumber: '',
      chairpersonName: '',
      facility: undefined,
      firstAncDate: undefined,
      lmpDate: undefined,
      previousPregnancies: '0',
      isPlanned: undefined,
      agreeToParticipate: false,
      understandConfidentiality: false,
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
    toast({
      title: "Submission Received (DEMO)",
      description: "This is a demonstration. Data has not been saved.",
    });
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <header className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-blue-900">ANC Cohort Study Registration</h1>
          <Button variant="outline">
            <Languages className="mr-2 h-4 w-4" /> English
          </Button>
        </header>

        <Card className="shadow-lg">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardHeader>
                <CardTitle>Andikisha Mshiriki / Register Participant</CardTitle>
                <CardDescription>Please fill in the details below. Fields with * are required.</CardDescription>
                <Progress value={33} className="mt-2" />
              </CardHeader>

              <CardContent className="space-y-8">
                {/* Personal Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Personal Information</h3>
                  <FormField control={form.control} name="fullName" render={({ field }) => (
                    <FormItem><FormLabel>Full Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="age" render={({ field }) => (
                      <FormItem><FormLabel>Age * (15-50)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                     <FormField control={form.control} name="maritalStatus" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Marital Status *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select status..." /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="Single">Single</SelectItem>
                              <SelectItem value="Married">Married</SelectItem>
                              <SelectItem value="Divorced/Separated">Divorced/Separated</SelectItem>
                              <SelectItem value="Widowed">Widowed</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                   </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                      <FormItem><FormLabel>Phone Number *</FormLabel><FormControl><Input {...field} placeholder="e.g., 0712345678" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="altPhoneNumber" render={({ field }) => (
                      <FormItem><FormLabel>Alternative Contact</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                </div>
                
                {/* Address */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Address</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="ward" render={({ field }) => (
                        <FormItem><FormLabel>Ward/Mtaa *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                       <FormField control={form.control} name="street" render={({ field }) => (
                        <FormItem><FormLabel>Street Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                   </div>
                </div>

                {/* Health Facility */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Health & Pregnancy Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <FormField control={form.control} name="facility" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Health Facility *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select facility..." /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="Changombe">Chang'ombe</SelectItem>
                              <SelectItem value="Keko Mwanga">Keko Mwanga</SelectItem>
                              <SelectItem value="Sandali">Sandali</SelectItem>
                              <SelectItem value="Kilakala">Kilakala</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="firstAncDate" render={({ field }) => (
                        <FormItem className="flex flex-col"><FormLabel>Date of First ANC Visit *</FormLabel><Popover>
                            <PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button></FormControl></PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                        </Popover><FormMessage /></FormItem>
                      )} />
                  </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <FormField control={form.control} name="lmpDate" render={({ field }) => (
                        <FormItem className="flex flex-col"><FormLabel>Last Menstrual Period Date *</FormLabel><Popover>
                            <PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button></FormControl></PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                        </Popover><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="previousPregnancies" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Previous Pregnancies *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select number..." /></SelectTrigger></FormControl>
                            <SelectContent>
                              {[...Array(11).keys()].map(i => <SelectItem key={i} value={String(i)}>{i === 10 ? '10+' : i}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                  </div>
                </div>

                {/* Consent */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Consent *</h3>
                   <FormField control={form.control} name="agreeToParticipate" render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>I agree to participate in this study.</FormLabel>
                           <FormMessage />
                        </div>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="understandConfidentiality" render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>I understand my information will be kept confidential.</FormLabel>
                           <FormMessage />
                        </div>
                      </FormItem>
                    )} />
                </div>

              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" size="lg">Submit</Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </div>
    </div>
  );
}
