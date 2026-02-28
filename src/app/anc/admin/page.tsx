
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
import { collection, deleteDoc, doc } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { AncRegistrationForm } from '../components/registration-form';

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

    const registrationsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, 'anc_registrations');
    }, [firestore]);

    const { data: registrations, isLoading } = useCollection(registrationsQuery);

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
                (reg.phoneNumber || []).join('; '),
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
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `partoma-registrations-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        toast({ title: "Export successful", description: `Exported ${registrations.length} registrations`, variant: "success" });
    };

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight">Cohort Analysis</h1>
                    <p className="text-muted-foreground text-sm">PartoMa Project Registration Intelligence</p>
                </div>
                <Button onClick={exportToExcel} className="rounded-xl font-bold shadow-md">
                    <Download className="mr-2 h-4 w-4" />
                    Export Dataset
                </Button>
            </div>

            {/* Statistics Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-none ring-1 ring-border shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Enrolled</CardTitle>
                        <Users className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black">{total}</div>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase mt-1 tracking-tighter">Cohort Population</p>
                    </CardContent>
                </Card>

                <Card className="border-none ring-1 ring-border shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">New This Week</CardTitle>
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black">+{thisWeek}</div>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase mt-1 tracking-tighter">Enrollment Velocity</p>
                    </CardContent>
                </Card>

                <Card className="border-none ring-1 ring-border shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Active Facilities</CardTitle>
                        <Building2 className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black">{Object.keys(byFacility || {}).length}</div>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase mt-1 tracking-tighter">Site Engagement</p>
                    </CardContent>
                </Card>

                <Card className="border-none ring-1 ring-border shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Avg. Cohort Age</CardTitle>
                        <Calendar className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black">{avgAge} <span className="text-sm font-bold text-muted-foreground">yrs</span></div>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase mt-1 tracking-tighter">Demographic Pulse</p>
                    </CardContent>
                </Card>
            </div>

            {/* Data Table */}
            <Card className="border-none ring-1 ring-border shadow-lg">
                <CardHeader>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <CardTitle className="text-xl font-black">Participant Registry ({filteredRegistrations.length})</CardTitle>
                        <div className="relative w-full md:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search registry..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 h-10 rounded-xl"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-xl border overflow-hidden">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest">ID</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Name</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Age</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Facility</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Gest. Age</TableHead>
                                    <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredRegistrations.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-12 text-muted-foreground font-medium">
                                            No registry matches found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredRegistrations.map((reg: any) => (
                                        <TableRow key={reg.participantId} className="hover:bg-slate-50/50">
                                            <TableCell className="font-mono text-[10px] text-slate-500">{reg.participantId}</TableCell>
                                            <TableCell className="font-bold text-sm">{reg.name}</TableCell>
                                            <TableCell className="text-sm">{reg.age}</TableCell>
                                            <TableCell className="text-[10px] font-medium text-slate-500 truncate max-w-[150px]">{reg.healthFacility}</TableCell>
                                            <TableCell className="text-sm font-bold text-primary">{reg.gestationalAge} <span className="text-[10px] font-medium text-muted-foreground">wks</span></TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 rounded-lg"
                                                        onClick={() => setEditingParticipant(reg)}
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive">
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent className="rounded-2xl">
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle className="font-black text-xl">Purge Participant Record?</AlertDialogTitle>
                                                                <AlertDialogDescription className="font-medium">
                                                                    This will permanently remove <span className="text-foreground font-bold">{reg.name}</span> from the ANC cohort registry. This action is irreversible.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel className="rounded-xl font-bold">Cancel</AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    onClick={() => deleteParticipantMutation.mutate(reg.participantId)}
                                                                    className="bg-destructive text-destructive-foreground rounded-xl font-bold"
                                                                >
                                                                    Confirm Purge
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
                <AncRegistrationForm 
                    open={!!editingParticipant}
                    onOpenChange={(open) => !open && setEditingParticipant(null)}
                    editMode={true}
                    initialData={editingParticipant}
                />
            )}
        </div>
    );
}
