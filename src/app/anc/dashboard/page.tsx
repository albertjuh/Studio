
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMutation, useQueryClient }from '@tanstack/react-query';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc, writeBatch, getDocs } from 'firebase/firestore';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2, Users, UserPlus, Search, Hospital, Eye, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
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
import { AncRegistrationForm } from "@/app/anc/components/registration-form";

const ITEMS_PER_PAGE = 20;

export default function AncDashboardPage() {
    const { toast } = useToast();
    const firestore = useFirestore();

    // State declared at the top to avoid ReferenceErrors/Temporal Dead Zone
    const [isAdmin, setIsAdmin] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [deletePassword, setDeletePassword] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [editingParticipant, setEditingParticipant] = useState<AncRegistration | null>(null);
    const [selectedParticipant, setSelectedParticipant] = useState<AncRegistration | null>(null);

    const registrationsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, 'anc_registrations');
    }, [firestore]);

    const { data: registrations, isLoading } = useCollection<AncRegistration>(registrationsQuery);
    
    useEffect(() => {
        const userStr = localStorage.getItem('ancUser');
        if (userStr) {
            const user = JSON.parse(userStr);
            if (user.role === 'admin') {
                setIsAdmin(true);
            }
        }
    }, []);

    const deleteParticipantMutation = useMutation({
        mutationFn: async (participantId: string) => {
            if (!firestore) throw new Error("Firestore is not available.");
            const docRef = doc(firestore, 'anc_registrations', participantId);
            await deleteDoc(docRef);
            return { success: true };
        },
        onSuccess: (result, participantId) => {
            if (result.success) {
                toast({
                    title: "Participant Deleted",
                    description: `The record for participant ID ${participantId} has been deleted.`,
                    variant: "success",
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
    
    const deleteAllMutation = useMutation({
        mutationFn: async () => {
            if (!firestore) throw new Error("Firestore is not available.");
            const registrationsCollection = collection(firestore, 'anc_registrations');
            const querySnapshot = await getDocs(registrationsCollection);
            
            if (querySnapshot.empty) {
                return { success: true, count: 0 };
            }

            const batch = writeBatch(firestore);
            querySnapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });

            await batch.commit();
            return { success: true, count: querySnapshot.size };
        },
        onSuccess: (result) => {
            if (result.success) {
                toast({
                    title: "All Data Cleared",
                    description: `${result.count} registrations have been deleted.`,
                    variant: "success",
                });
            }
        },
        onError: (error: any) => {
            toast({
                title: "An Error Occurred",
                description: `Could not clear data. Error: ${error.message}`,
                variant: "destructive",
            });
        }
    });

    const processedRegistrations = useMemo(() => {
        if (!registrations) return null;
        return registrations.map(reg => {
            const newReg = { ...reg } as any;
             if (newReg.createdAt && typeof newReg.createdAt.toDate === 'function') {
                newReg.createdAt = newReg.createdAt.toDate().toISOString();
            }
            if (newReg.firstAncDate && typeof newReg.firstAncDate.toDate === 'function') {
                newReg.firstAncDate = newReg.firstAncDate.toDate().toISOString();
            }
            return newReg as AncRegistration;
        });
    }, [registrations]);

    const sortedRegistrations = useMemo(() => {
        if (!processedRegistrations) return [];
        return [...processedRegistrations].sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
        });
    }, [processedRegistrations]);

    const filteredRegistrations = useMemo(() => {
        if (!sortedRegistrations) return [];
        if (!searchTerm) return sortedRegistrations;

        const lowercasedFilter = searchTerm.toLowerCase();

        return sortedRegistrations.filter(reg =>
            (reg.name && reg.name.toLowerCase().includes(lowercasedFilter)) ||
            (reg.participantId && reg.participantId.toLowerCase().includes(lowercasedFilter)) ||
            (reg.registeredBy && reg.registeredBy.toLowerCase().includes(lowercasedFilter)) ||
            (Array.isArray(reg.phoneNumber) && reg.phoneNumber.some(phone => phone && phone.toLowerCase().includes(lowercasedFilter)))
        );
    }, [sortedRegistrations, searchTerm]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const paginatedRegistrations = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredRegistrations.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredRegistrations, currentPage]);

    const totalPages = Math.ceil(filteredRegistrations.length / ITEMS_PER_PAGE);

    const registrationsThisWeek = useMemo(() => {
        if (!sortedRegistrations) return 0;
        const weekAgo = subDays(new Date(), 7);
        return sortedRegistrations.filter(r => r.createdAt && new Date(r.createdAt) > weekAgo).length;
    }, [sortedRegistrations]);
    
    const uniqueFacilities = useMemo(() => {
        if (!sortedRegistrations) return 0;
        const facilities = new Set(sortedRegistrations.map(r => r.healthFacility));
        return facilities.size;
    }, [sortedRegistrations]);

    const handleEditClick = (reg: AncRegistration) => {
        setEditingParticipant(reg);
        setSelectedParticipant(null);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Dashboard</h1>
                    <p className="text-muted-foreground">Overview of the ANC cohort study progress.</p>
                </div>
                <div className="flex items-center gap-2">
                    {isAdmin && (
                         <AlertDialog onOpenChange={(open) => !open && setDeletePassword('')}>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="icon" disabled={deleteAllMutation.isPending}>
                                    {deleteAllMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                    <span className="sr-only">Clear All Data</span>
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action will permanently delete ALL participant registrations. This cannot be undone.
                                        <br/><br/>
                                        To confirm, please type the secret password below.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="py-2">
                                    <Input
                                        type="password"
                                        value={deletePassword}
                                        onChange={(e) => setDeletePassword(e.target.value)}
                                        placeholder="Enter confirmation password"
                                        autoComplete="off"
                                    />
                                </div>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={() => deleteAllMutation.mutate()}
                                        disabled={deletePassword !== 'WOOOyaye21' || deleteAllMutation.isPending}
                                        className="bg-destructive hover:bg-destructive/90"
                                    >
                                        {deleteAllMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Yes, delete all data
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                    <Button asChild>
                        <Link href="/anc/register">
                            <UserPlus className="mr-2 h-4 w-4" />
                            Register Participant
                        </Link>
                    </Button>
                </div>
            </div>
            
            <div className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Participants</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{sortedRegistrations?.length || 0}</div>
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
                        <ScrollArea className="h-[500px]">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Actions</TableHead>
                                        <TableHead>Participant ID</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Health Facility</TableHead>
                                        <TableHead>Phone Number</TableHead>
                                        <TableHead>Registered On</TableHead>
                                        <TableHead>Entered By</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedRegistrations && paginatedRegistrations.length > 0 ? (
                                        paginatedRegistrations.map((reg) => (
                                            <TableRow key={reg.id}>
                                                <TableCell>
                                                    <div className="flex items-center justify-start gap-1">
                                                        <Dialog open={selectedParticipant?.id === reg.id} onOpenChange={(open) => !open && setSelectedParticipant(null)}>
                                                            <DialogTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedParticipant(reg)}>
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
                                                                            <div>{Array.isArray(reg.phoneNumber) ? reg.phoneNumber.join(', ') : reg.phoneNumber || 'N/A'}</div>
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
                                                                            <div>{reg.createdAt ? format(new Date(reg.createdAt), 'PP p') : 'N/A'}</div>
                                                                            <div className="font-medium text-muted-foreground">Registered By:</div>
                                                                            <div>{reg.registeredBy || 'N/A'}</div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                </ScrollArea>
                                                                {isAdmin && (
                                                                    <DialogFooter className="pt-4 border-t gap-2 sm:justify-start">
                                                                        <Button variant="outline" onClick={() => handleEditClick(reg)}>
                                                                            <Pencil className="mr-2 h-4 w-4" />
                                                                            Edit
                                                                        </Button>
                                                                        <AlertDialog>
                                                                            <AlertDialogTrigger asChild>
                                                                                <Button variant="destructive" disabled={deleteParticipantMutation.isPending && deleteParticipantMutation.variables === reg.participantId}>
                                                                                    {deleteParticipantMutation.isPending && deleteParticipantMutation.variables === reg.participantId ? (
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
                                                                                    <AlertDialogAction onClick={() => deleteParticipantMutation.mutate(reg.participantId)} className="bg-destructive hover:bg-destructive/90">
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
                                                <TableCell className="font-mono text-xs">{reg.participantId}</TableCell>
                                                <TableCell className="font-medium">{reg.name}</TableCell>
                                                <TableCell className="text-xs">{reg.healthFacility}</TableCell>
                                                <TableCell className="text-xs">{Array.isArray(reg.phoneNumber) ? reg.phoneNumber.join(', ') : reg.phoneNumber || 'N/A'}</TableCell>
                                                <TableCell className="text-muted-foreground text-xs">{reg.createdAt ? format(new Date(reg.createdAt), 'PP p') : 'N/A'}</TableCell>
                                                <TableCell className="text-muted-foreground text-xs">{reg.registeredBy || 'N/A'}</TableCell>
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

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between py-4 border-t px-2">
                                <div className="text-sm text-muted-foreground">
                                    Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(filteredRegistrations.length, currentPage * ITEMS_PER_PAGE)} of {filteredRegistrations.length} entries
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                    >
                                        <ChevronLeft className="h-4 w-4 mr-1" />
                                        Previous
                                    </Button>
                                    <div className="text-sm font-medium">
                                        Page {currentPage} of {totalPages}
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                    >
                                        Next
                                        <ChevronRight className="h-4 w-4 ml-1" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Edit Participant Dialog */}
            {editingParticipant && (
                <Dialog open={!!editingParticipant} onOpenChange={(open) => !open && setEditingParticipant(null)}>
                    <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Edit Participant</DialogTitle>
                        </DialogHeader>
                        <ScrollArea className="max-h-[80vh]">
                            <div className="p-4">
                                <AncRegistrationForm 
                                    editMode={true} 
                                    initialData={editingParticipant} 
                                    onOpenChange={(open) => !open && setEditingParticipant(null)}
                                />
                            </div>
                        </ScrollArea>
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
}
