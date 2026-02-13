
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteAncRegistrationAction, getAncRegistrationsAction } from '@/lib/anc-actions';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2, Users, UserPlus, Search, Hospital, Eye, Pencil, Trash2 } from 'lucide-react';
import Link from "next/link";
import { format, subDays } from 'date-fns';
import type { AncRegistration } from "@/types";
import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";


function AncDashboardClient() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isAdmin, setIsAdmin] = useState(false);
    
    const { data: registrations, isLoading, isError, error } = useQuery<AncRegistration[]>({
        queryKey: ['ancRegistrations'],
        queryFn: () => getAncRegistrationsAction(),
        refetchInterval: 60000,
    });
    
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const userStr = localStorage.getItem('ancUser');
        if (userStr) {
            const user = JSON.parse(userStr);
            if (user.role === 'admin') {
                setIsAdmin(true);
            }
        }
    }, []);

    const deleteMutation = useMutation({
        mutationFn: deleteAncRegistrationAction,
        onSuccess: (result, participantId) => {
            if (result.success) {
                toast({
                    title: "Participant Deleted",
                    description: `The record for participant ID ${participantId} has been deleted.`,
                    variant: "success",
                });
                queryClient.invalidateQueries({ queryKey: ['ancRegistrations'] });
            } else {
                toast({
                    title: "Deletion Failed",
                    description: result.error,
                    variant: "destructive",
                });
            }
        },
        onError: (error: any, participantId) => {
            toast({
                title: "An Error Occurred",
                description: `Could not delete participant ${participantId}. Error: ${error.message}`,
                variant: "destructive",
            });
        }
    });

    const handleEditClick = () => {
        toast({
            title: "Coming Soon!",
            description: "Editing functionality is currently under development.",
        });
    };

    const filteredRegistrations = useMemo(() => {
        if (!registrations) return [];
        if (!searchTerm) return registrations;

        const lowercasedFilter = searchTerm.toLowerCase();

        return registrations.filter(reg =>
            (reg.name && reg.name.toLowerCase().includes(lowercasedFilter)) ||
            (reg.participantId && reg.participantId.toLowerCase().includes(lowercasedFilter)) ||
            (reg.registeredBy && reg.registeredBy.toLowerCase().includes(lowercasedFilter)) ||
            (Array.isArray(reg.phoneNumber) && reg.phoneNumber.some(phone => phone && phone.toLowerCase().includes(lowercasedFilter)))
        );
    }, [registrations, searchTerm]);

    const registrationsThisWeek = registrations?.filter(r => new Date(r.createdAt) > subDays(new Date(), 7)).length || 0;
    
    const uniqueFacilities = useMemo(() => {
        if (!registrations) return 0;
        const facilities = new Set(registrations.map(r => r.healthFacility));
        return facilities.size;
    }, [registrations]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    if (isError) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error Loading Data</AlertTitle>
                <AlertDescription>
                    Could not load registration data. Error: {(error as Error).message}
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Participants</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{registrations?.length || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Registrations (Last 7 Days)</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">+{registrationsThisWeek}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Health Facilities</CardTitle>
                        <Hospital className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{uniqueFacilities}</div>
                    </CardContent>
                </Card>
            </div>
            
            <Card>
                 <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <CardTitle>Participants Data View</CardTitle>
                            <CardDescription>Search and view all registered study participants.</CardDescription>
                        </div>
                         <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name, ID, or phone..."
                                className="pl-10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[400px]">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Participant ID</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Health Facility</TableHead>
                                    <TableHead>Phone Number</TableHead>
                                    <TableHead>Registered On</TableHead>
                                    <TableHead>Entered By</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredRegistrations && filteredRegistrations.length > 0 ? (
                                    filteredRegistrations.map((reg) => (
                                        <TableRow key={reg.id}>
                                            <TableCell className="font-mono">{reg.participantId}</TableCell>
                                            <TableCell className="font-medium">{reg.name}</TableCell>
                                            <TableCell>{reg.healthFacility}</TableCell>
                                            <TableCell>{Array.isArray(reg.phoneNumber) ? reg.phoneNumber[0] : reg.phoneNumber || 'N/A'}</TableCell>
                                            <TableCell className="text-muted-foreground text-xs">{format(new Date(reg.createdAt), 'PP p')}</TableCell>
                                            <TableCell className="text-muted-foreground text-xs">{reg.registeredBy || 'N/A'}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Dialog>
                                                        <DialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent className="sm:max-w-2xl">
                                                            <DialogHeader>
                                                                <DialogTitle>Participant Details</DialogTitle>
                                                                <DialogDescription>
                                                                    Full registration details for participant ID: <span className="font-mono text-foreground">{reg.participantId}</span>.
                                                                </DialogDescription>
                                                            </DialogHeader>
                                                            <ScrollArea className="max-h-[60vh] pr-6">
                                                            <div className="py-4 space-y-4 text-sm">
                                                                <div>
                                                                    <h4 className="font-semibold text-base mb-2">Participant Information</h4>
                                                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                                                        <div className="font-medium text-muted-foreground">Name:</div>
                                                                        <div>{reg.name || 'N/A'}</div>
                                                                        <div className="font-medium text-muted-foreground">Age:</div>
                                                                        <div>{reg.age || 'N/A'}</div>
                                                                        <div className="font-medium text-muted-foreground">Marital Status:</div>
                                                                        <div>{reg.maritalStatus || 'N/A'}</div>
                                                                        <div className="font-medium text-muted-foreground">Phone Numbers:</div>
                                                                        <div>{Array.isArray(reg.phoneNumber) ? reg.phoneNumber.join(', ') : (reg.phoneNumber || 'N/A')}</div>
                                                                    </div>
                                                                </div>
                                                                <Separator />
                                                                <div>
                                                                    <h4 className="font-semibold text-base mb-2">Clinical Information</h4>
                                                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                                                        <div className="font-medium text-muted-foreground">Gestational Age:</div>
                                                                        <div>{reg.gestationalAge ? `${reg.gestationalAge} weeks` : 'N/A'}</div>
                                                                        <div className="font-medium text-muted-foreground">First ANC Date:</div>
                                                                        <div>{reg.firstAncDate ? format(new Date(reg.firstAncDate), 'PPP') : 'N/A'}</div>
                                                                    </div>
                                                                </div>
                                                                <Separator />
                                                                <div>
                                                                    <h4 className="font-semibold text-base mb-2">Next of Kin</h4>
                                                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                                                        <div className="font-medium text-muted-foreground">Name:</div>
                                                                        <div>{reg.nextOfKinName || 'N/A'}</div>
                                                                        <div className="font-medium text-muted-foreground">Contact:</div>
                                                                        <div>{reg.alternativeContact || 'N/A'}</div>
                                                                    </div>
                                                                </div>
                                                                <Separator />
                                                                <div>
                                                                    <h4 className="font-semibold text-base mb-2">Registration Details</h4>
                                                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                                                        <div className="font-medium text-muted-foreground">Health Facility:</div>
                                                                        <div>{reg.healthFacility || 'N/A'}</div>
                                                                        <div className="font-medium text-muted-foreground">Registered On:</div>
                                                                        <div>{format(new Date(reg.createdAt), 'PP p')}</div>
                                                                        <div className="font-medium text-muted-foreground">Registered By:</div>
                                                                        <div>{reg.registeredBy || 'N/A'}</div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            </ScrollArea>
                                                             {isAdmin && (
                                                                <DialogFooter className="pt-4 border-t gap-2 sm:justify-start">
                                                                    <Button variant="outline" onClick={handleEditClick}>
                                                                        <Pencil className="mr-2 h-4 w-4" />
                                                                        Edit
                                                                    </Button>
                                                                    <AlertDialog>
                                                                        <AlertDialogTrigger asChild>
                                                                            <Button variant="destructive">
                                                                                {deleteMutation.isPending && deleteMutation.variables === reg.participantId ? (
                                                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                                                ) : (
                                                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                                                )}
                                                                                Delete
                                                                            </Button>
                                                                        </AlertDialogTrigger>
                                                                        <AlertDialogContent>
                                                                            <AlertDialogHeader>
                                                                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                                                <AlertDialogDescription>
                                                                                    This will permanently delete the registration for <strong className="text-foreground">{reg.name || reg.participantId}</strong>. This action cannot be undone.
                                                                                </AlertDialogDescription>
                                                                            </AlertDialogHeader>
                                                                            <AlertDialogFooter>
                                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                                <AlertDialogAction onClick={() => deleteMutation.mutate(reg.participantId)} className="bg-destructive hover:bg-destructive/90">
                                                                                    Yes, delete registration
                                                                                </AlertDialogAction>
                                                                            </AlertDialogFooter>
                                                                        </AlertDialogContent>
                                                                    </AlertDialog>
                                                                </DialogFooter>
                                                            )}
                                                        </DialogContent>
                                                    </Dialog>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center">
                                            {searchTerm ? "No participants match your search." : "No participants registered yet."}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}

export default function AncDashboardPage() {
    return (
        <>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Dashboard</h1>
                    <p className="text-muted-foreground">Overview of the ANC cohort study progress.</p>
                </div>
                <Button asChild>
                    <Link href="/anc/register">
                        <UserPlus className="mr-2 h-4 w-4" />
                        Register Participant
                    </Link>
                </Button>
            </div>
            <AncDashboardClient />
        </>
    );
}
