"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Users, Building2, TrendingUp, Calendar, Pencil, Trash2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteDoc, doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { RegistrationForm } from '../components/registration-form';
import { useCollection } from '@/hooks/use-collection';

export default function AdminPanel() {
    const router = useRouter();
    const firestore = useFirestore();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [user, setUser] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingParticipant, setEditingParticipant] = useState<any>(null);
    
    useEffect(() => {
        const userStr = localStorage.getItem('ancUser');
        if (!userStr) {
            router.push('/anc/login');
            return;
        }
        const userData = JSON.parse(userStr);
        if (userData.role !== 'admin') {
            router.push('/anc/dashboard');
            return;
        }
        setUser(userData);
    }, [router]);

    const { data: registrations, isLoading } = useCollection('anc_registrations');

    const deleteParticipantMutation = useMutation({
        mutationFn: async (participantId: string) => {
            if (!firestore) throw new Error("Firestore not available");
            const docRef = doc(firestore, 'anc_registrations', participantId);
            await deleteDoc(docRef);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['anc_registrations'] });
            toast({ title: "Participant deleted", variant: "success" });
        },
        onError: (error: any) => {
            toast({ title: "Delete failed", description: error.message, variant: "destructive" });
        }
    });

    if (!user || isLoading) return <div className="p-8">Loading...</div>;

    // Calculate statistics
    const total = registrations?.length || 0;
    const byFacility = registrations?.reduce((acc: any, reg: any) => {
        acc[reg.healthFacility] = (acc[reg.healthFacility] || 0) + 1;
        return acc;
    }, {});
    
    const thisWeek = registrations?.filter((r: any) => {
        const regDate = new Date(r.createdAt);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return regDate > weekAgo;
    }).length || 0;

    // Filter registrations by search
    const filteredRegistrations = registrations?.filter((r: any) => 
        r.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.participantId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.healthFacility?.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    const avgAge = registrations?.length 
        ? (registrations.reduce((sum: number, r: any) => sum + (r.age || 0), 0) / registrations.length).toFixed(1)
        : 0;

    const exportToExcel = () => {
        if (!registrations || registrations.length === 0) {
            toast({ title: "No data to export", variant: "destructive" });
            return;
        }

        // Create CSV content
        const headers = ['Participant ID', 'Name', 'Age', 'Marital Status', 'Health Facility', 'Phone Numbers', 'Next of Kin', 'Alternative Contact', 'Gestational Age', 'First ANC Date', 'Registered By', 'Created At'];
        const csvRows = [headers.join(',')];
        
        registrations.forEach((reg: any) => {
            const row = [
                reg.participantId || '',
                reg.name || '',
                reg.age || '',
                reg.maritalStatus || '',
                reg.healthFacility || '',
                (reg.phoneNumber || []).map((p: any) => p.value).join('; '),
                reg.nextOfKinName || '',
                reg.alternativeContact || '',
                reg.gestationalAge || '',
                reg.firstAncDate || '',
                reg.registeredBy || '',
                reg.createdAt || ''
            ];
            csvRows.push(row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','));
        });

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `partoma-registrations-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast({ title: "Export successful", description: `Exported ${registrations.length} registrations`, variant: "success" });
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Admin Panel</h1>
                    <p className="text-muted-foreground">PartoMa Project Analytics</p>
                </div>
                <Button onClick={exportToExcel}>
                    <Download className="mr-2 h-4 w-4" />
                    Export to Excel
                </Button>
            </div>

            {/* Statistics Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Registrations</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{total}</div>
                        <p className="text-xs text-muted-foreground">All time</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">This Week</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{thisWeek}</div>
                        <p className="text-xs text-muted-foreground">Last 7 days</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Health Facilities</CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{Object.keys(byFacility || {}).length}</div>
                        <p className="text-xs text-muted-foreground">Active facilities</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Average Age</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{avgAge} years</div>
                        <p className="text-xs text-muted-foreground">Participant average</p>
                    </CardContent>
                </Card>
            </div>

            {/* Facility Breakdown */}
            <Card>
                <CardHeader>
                    <CardTitle>Registrations by Facility</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {Object.entries(byFacility || {}).map(([facility, count]: [string, any]) => (
                            <div key={facility} className="flex justify-between items-center">
                                <span className="text-sm font-medium">{facility}</span>
                                <span className="text-sm text-muted-foreground">{count} patients</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Data Table */}
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>All Registrations ({filteredRegistrations.length})</CardTitle>
                        <div className="relative w-72">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name, ID, or facility..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ID</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Age</TableHead>
                                    <TableHead>Facility</TableHead>
                                    <TableHead>Phone</TableHead>
                                    <TableHead>Gest. Age</TableHead>
                                    <TableHead>Registered</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredRegistrations.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center text-muted-foreground">
                                            No registrations found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredRegistrations.map((reg: any) => (
                                        <TableRow key={reg.participantId}>
                                            <TableCell className="font-mono text-xs">{reg.participantId}</TableCell>
                                            <TableCell className="font-medium">{reg.name}</TableCell>
                                            <TableCell>{reg.age}</TableCell>
                                            <TableCell className="text-xs">{reg.healthFacility}</TableCell>
                                            <TableCell className="text-xs">{reg.phoneNumber?.[0]?.value || 'N/A'}</TableCell>
                                            <TableCell>{reg.gestationalAge} wks</TableCell>
                                            <TableCell className="text-xs">{new Date(reg.createdAt).toLocaleDateString()}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setEditingParticipant(reg)}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon">
                                                                <Trash2 className="h-4 w-4 text-destructive" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Delete Participant</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    Are you sure you want to delete {reg.name}? This action cannot be undone.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    onClick={() => deleteParticipantMutation.mutate(reg.participantId)}
                                                                    className="bg-destructive text-destructive-foreground"
                                                                >
                                                                    Delete
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Edit Dialog */}
            {editingParticipant && (
                <RegistrationForm 
                    open={!!editingParticipant}
                    onOpenChange={(open) => !open && setEditingParticipant(null)}
                    editMode={true}
                    initialData={editingParticipant}
                />
            )}
        </div>
    );
}
