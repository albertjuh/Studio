
"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Users, Building2, TrendingUp, Pencil, Trash2, Search, ShieldCheck, PieChart, Activity } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, deleteDoc, doc } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { AncRegistrationForm } from '../components/registration-form';
import { format } from 'date-fns';

export default function AdminPanel() {
    const router = useRouter();
    const firestore = useFirestore();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [user, setUser] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingParticipant, setEditingParticipant] = useState<any>(null);
    const [mounted, setMounted] = useState(false);
    
    useEffect(() => {
        setMounted(true);
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
            toast({ title: "Participant Record Purged", variant: "success" });
        },
        onError: (error: any) => {
            toast({ title: "Operation Failed", description: error.message, variant: "destructive" });
        }
    });

    if (!mounted || !user || isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Activity className="h-10 w-10 animate-spin text-primary" />
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Synchronizing Cohort Data...</p>
            </div>
        );
    }

    const filteredRegistrations = (registrations || []).filter((r: any) => 
        r.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.participantId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.healthFacility?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const prodRegistrations = registrations?.filter((r: any) => 
        r.registeredBy !== 'Admin' && r.registeredBy !== 'Test User' && r.registeredBy !== 'Test'
    ) || [];

    const total = prodRegistrations.length || 0;
    const byFacility = prodRegistrations.reduce((acc: any, reg: any) => {
        acc[reg.healthFacility] = (acc[reg.healthFacility] || 0) + 1;
        return acc;
    }, {});
    
    const thisWeek = prodRegistrations.filter((r: any) => {
        const regDate = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.createdAt);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return regDate > weekAgo;
    }).length || 0;

    const avgAge = prodRegistrations.length 
        ? (prodRegistrations.reduce((sum: number, r: any) => sum + (r.age || 0), 0) / prodRegistrations.length).toFixed(1)
        : 0;

    const exportToExcel = () => {
        if (!registrations || registrations.length === 0) return;
        const headers = ['Participant ID', 'Name', 'Age', 'Facility', 'First ANC', 'Registered By'];
        const rows = registrations.map((reg: any) => [
            reg.participantId, reg.name, reg.age, reg.healthFacility, reg.firstAncDate, reg.registeredBy
        ]);
        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cohort_registry_${format(new Date(), 'yyyy-MM-dd')}.csv`;
        a.click();
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-24 lg:pb-12">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
                    <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-[10px] mb-1">
                        <ShieldCheck className="h-4 w-4" /> Global Cohort Registry
                    </div>
                    <h1 className="text-4xl font-black tracking-tighter">Cohort Analysis</h1>
                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest opacity-60">PartoMa Project Population Intelligence</p>
                </div>
                <div className="flex items-center gap-2 w-full lg:w-auto">
                    <Button onClick={exportToExcel} className="flex-1 lg:flex-none h-11 rounded-xl font-bold shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90">
                        <Download className="mr-2 h-4 w-4" /> Export Dataset
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                {[
                  { label: "Total Enrolled", value: total, icon: Users, color: "text-primary", bg: "bg-primary/5", desc: "Cohort Pop" },
                  { label: "Velocity", value: `+${thisWeek}`, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50", desc: "Weekly Growth" },
                  { label: "Active Sites", value: Object.keys(byFacility || {}).length, icon: Building2, color: "text-blue-600", bg: "bg-blue-50", desc: "Facility Reach" },
                  { label: "Avg. Age", value: avgAge, icon: PieChart, color: "text-amber-600", bg: "bg-amber-50", desc: "Cohort Pulse" },
                ].map((stat, i) => (
                  <Card key={i} className="border-none ring-1 ring-border shadow-sm group hover:ring-primary/40 transition-all">
                    <CardHeader className="p-4 pb-0 flex flex-row items-center justify-between space-y-0">
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{stat.label}</span>
                      <div className={`p-2 rounded-xl ${stat.bg} ${stat.color}`}>
                        <stat.icon className="h-4 w-4" />
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-1">
                      <div className="text-2xl font-black tracking-tight">{stat.value}</div>
                      <p className="text-[9px] text-muted-foreground font-bold uppercase mt-0.5">{stat.desc}</p>
                    </CardContent>
                  </Card>
                ))}
            </div>

            <Card className="border-none ring-1 ring-border shadow-xl overflow-hidden">
                <CardHeader className="border-b bg-primary/5">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <CardTitle className="text-xl font-black tracking-tight">Participant Registry</CardTitle>
                            <CardDescription className="text-xs font-bold uppercase tracking-widest opacity-60">Search and manage individual enrollments</CardDescription>
                        </div>
                        <div className="relative w-full md:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search registry..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 h-11 rounded-xl border-2 font-medium"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-emerald-50/60">
                            <TableRow>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-emerald-800/70 pl-6">Participant ID</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-emerald-800/70">Full Name</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-emerald-800/70">Age</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-emerald-800/70">Health Facility</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-emerald-800/70">Gest. Age</TableHead>
                                <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-emerald-800/70 pr-6">Controls</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredRegistrations.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-20 text-muted-foreground font-bold italic">
                                        No registry records match your query.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredRegistrations.map((reg: any) => (
                                    <TableRow 
                                        key={reg.participantId} 
                                        className="group transition-all duration-300 hover:bg-primary/[0.04] hover:translate-x-1 border-l-4 border-l-transparent hover:border-l-primary/50"
                                    >
                                        <TableCell className="font-mono text-[10px] text-slate-500 font-bold pl-6 py-4">{reg.participantId}</TableCell>
                                        <TableCell className="font-extrabold text-sm">{reg.name}</TableCell>
                                        <TableCell className="text-xs font-bold">{reg.age} yrs</TableCell>
                                        <TableCell className="text-[10px] font-black text-muted-foreground uppercase truncate max-w-[150px]">{reg.healthFacility}</TableCell>
                                        <TableCell className="text-xs font-black text-primary bg-primary/5 px-2 py-1 rounded-lg inline-block my-3">
                                            {reg.gestationalAge} <span className="text-[9px] opacity-60">wks</span>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary"
                                                    onClick={() => setEditingParticipant(reg)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-rose-100 hover:text-rose-600">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent className="rounded-2xl">
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle className="font-black text-2xl tracking-tight">Purge Record?</AlertDialogTitle>
                                                            <AlertDialogDescription className="font-medium">
                                                                This will permanently remove <span className="text-foreground font-extrabold">{reg.name}</span> from the ANC cohort dataset. This operation cannot be reversed.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel className="rounded-xl font-bold">Cancel</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => deleteParticipantMutation.mutate(reg.participantId)}
                                                                className="bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700"
                                                            >
                                                                Purge Record
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
                </CardContent>
            </Card>

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
