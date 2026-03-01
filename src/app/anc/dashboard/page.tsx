
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMutation } from '@tanstack/react-query';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc, writeBatch, getDocs } from 'firebase/firestore';
import { AlertCircle, Loader2, Users, UserPlus, Search, Hospital, Eye, Pencil, Trash2, Target, TrendingUp, ShieldCheck, Activity, BarChart3, ChevronRight } from 'lucide-react';
import Link from "next/link";
import { format } from 'date-fns';
import type { AncRegistration, RecruitmentEntry } from "@/types";
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
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { AncRegistrationForm } from "@/app/anc/components/registration-form";
import { Badge } from "@/components/ui/badge";

export default function AncDashboardPage() {
    const { toast } = useToast();
    const firestore = useFirestore();

    const [isAdmin, setIsAdmin] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [deletePassword, setDeletePassword] = useState('');
    const [editingParticipant, setEditingParticipant] = useState<AncRegistration | null>(null);
    const [selectedParticipant, setSelectedParticipant] = useState<AncRegistration | null>(null);

    const registrationsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, 'anc_registrations');
    }, [firestore]);

    const recruitmentQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, 'recruitment_entries');
    }, [firestore]);

    const { data: registrations, isLoading: isRegLoading } = useCollection<AncRegistration>(registrationsQuery);
    const { data: recruitment, isLoading: isRecLoading } = useCollection<RecruitmentEntry>(recruitmentQuery);
    
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

    const recruitmentStats = useMemo(() => {
        if (!recruitment) return null;

        const workloadEntries = recruitment.filter(e => e.first_row_flag === 1);

        const totalEligible = workloadEntries.reduce((sum, e) => sum + (e.eligible || 0), 0);
        const totalInterviewed = workloadEntries.reduce((sum, e) => sum + (e.interviewed || 0), 0);
        const successRate = totalEligible > 0 ? (totalInterviewed / totalEligible) * 100 : 0;

        const reasonStatsMap = recruitment.reduce((acc: any, e) => {
            if (e.reason && e.reason !== 'None Logged') {
                acc[e.reason] = (acc[e.reason] || 0) + (e.num_women || 0);
            }
            return acc;
        }, {});

        const reasonStats = Object.entries(reasonStatsMap)
            .map(([reason, count]) => ({ reason, count: count as number }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 4);

        return { totalEligible, totalInterviewed, successRate, reasonStats };
    }, [recruitment]);

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

    const isLoading = isRegLoading || isRecLoading;

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Aggregating Study Intelligence...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-24 lg:pb-12">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-[9px] mb-1">
                        <ShieldCheck className="h-4 w-4" /> Study Command Center
                    </div>
                    <h1 className="text-4xl font-black tracking-tighter">Clinical Dashboard</h1>
                    <p className="text-sm font-medium text-muted-foreground">High-fidelity overview of recruitment and cohort enrollment progress.</p>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    {isAdmin && (
                         <Dialog onOpenChange={(open) => !open && setDeletePassword('')}>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl border-2 border-rose-100 text-rose-600 hover:bg-rose-50" disabled={deleteAllMutation.isPending}>
                                    {deleteAllMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="rounded-2xl">
                                <DialogHeader>
                                    <DialogTitle className="text-2xl font-black tracking-tight">Purge All Cohort Data?</DialogTitle>
                                    <DialogDescription className="font-medium text-muted-foreground">
                                        This action will permanently delete ALL participant registrations. This cannot be undone.
                                        <br/><br/>
                                        Type the security password to confirm.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="py-2">
                                    <Input
                                        type="password"
                                        value={deletePassword}
                                        onChange={(e) => setDeletePassword(e.target.value)}
                                        placeholder="Security Password"
                                        autoComplete="off"
                                        className="h-11 rounded-xl"
                                    />
                                </div>
                                <DialogFooter className="gap-2">
                                    <Button variant="outline" className="rounded-xl font-bold" onClick={() => setDeletePassword('')}>Cancel</Button>
                                    <Button
                                        onClick={() => deleteAllMutation.mutate()}
                                        disabled={deletePassword !== 'WOOOyaye21' || deleteAllMutation.isPending}
                                        className="bg-destructive text-white rounded-xl font-bold hover:bg-destructive/90"
                                    >
                                        Yes, purge all data
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    )}
                    <Button asChild className="flex-1 md:flex-none h-12 px-6 rounded-xl font-black uppercase tracking-widest shadow-none">
                        <Link href="/anc/register">
                            <UserPlus className="mr-2 h-5 w-5" /> Register Participant
                        </Link>
                    </Button>
                </div>
            </div>
            
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                {[
                    { label: "Cohort Enrolled", value: sortedRegistrations?.length || 0, icon: Users, color: "text-primary", bg: "bg-primary/5", desc: "Total Enrollment" },
                    { label: "Eligible Identified", value: recruitmentStats?.totalEligible || 0, icon: Target, color: "text-purple-600", bg: "bg-purple-50", desc: "Global Identification" },
                    { label: "Success Velocity", value: `${recruitmentStats?.successRate.toFixed(1) || 0}%`, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50", desc: "Conversion Performance" },
                    { label: "Active Sites", value: new Set(sortedRegistrations.map(r => r.healthFacility)).size, icon: Hospital, color: "text-blue-600", bg: "bg-blue-50", desc: "Facility Coverage" },
                ].map((stat, i) => (
                    <Card key={i} className="border-none ring-1 ring-border shadow-none overflow-hidden transition-all hover:ring-primary/40">
                        <CardHeader className="p-4 pb-0 flex flex-row items-center justify-between space-y-0">
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{stat.label}</span>
                            <div className={`p-2 rounded-xl ${stat.bg} ${stat.color}`}>
                                <stat.icon className="h-4 w-4" />
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-1">
                            <div className="text-2xl font-black tracking-tighter">{stat.value}</div>
                            <p className="text-[9px] text-muted-foreground font-bold uppercase mt-0.5">{stat.desc}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-12">
                {/* Main Registry Table - Limitless Scroll */}
                <Card className="lg:col-span-8 border-none ring-1 ring-border shadow-none overflow-hidden">
                    <CardHeader className="bg-primary/5 border-b py-5 px-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <CardTitle className="text-xl font-black tracking-tight">Registry Feed</CardTitle>
                                <CardDescription className="text-xs font-bold uppercase tracking-widest opacity-60">Complete cohort participant record scroll</CardDescription>
                            </div>
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by name or ID..."
                                    className="pl-10 h-10 rounded-xl border-2 font-medium"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="h-[600px]">
                            <Table>
                                <TableHeader className="bg-muted/30 sticky top-0 z-10 backdrop-blur-sm">
                                    <TableRow>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest pl-6 w-24">Controls</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest">Participant ID</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest">Name</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest">Facility</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest pr-6 text-right">Date</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredRegistrations.length > 0 ? (
                                        filteredRegistrations.map((reg) => (
                                            <TableRow key={reg.id} className="group transition-colors hover:bg-muted/20">
                                                <TableCell className="pl-6 flex items-center gap-1">
                                                    <Dialog open={selectedParticipant?.id === reg.id} onOpenChange={(open) => !open && setSelectedParticipant(null)}>
                                                        <DialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary" onClick={() => setSelectedParticipant(reg)}>
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent className="sm:max-w-2xl rounded-2xl">
                                                            <DialogHeader>
                                                                <DialogTitle className="text-2xl font-black tracking-tight">Participant Profile</DialogTitle>
                                                                <DialogDescription className="font-bold uppercase tracking-widest text-[10px] text-muted-foreground">
                                                                    Global Registry ID: <span className="text-foreground font-mono">{reg.participantId}</span>
                                                                </DialogDescription>
                                                            </DialogHeader>
                                                            <ScrollArea className="max-h-[60vh] pr-6">
                                                                <div className="py-6 space-y-6">
                                                                    <div className="grid grid-cols-2 gap-8 text-sm">
                                                                        <div className="space-y-4">
                                                                            <div>
                                                                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1">Full Name</label>
                                                                                <div className="font-extrabold text-lg">{reg.name}</div>
                                                                            </div>
                                                                            <div>
                                                                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1">Clinical Demographics</label>
                                                                                <div className="font-bold">{reg.age} years • {reg.maritalStatus}</div>
                                                                            </div>
                                                                            <div>
                                                                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1">Contact</label>
                                                                                <div className="font-mono text-xs">{Array.isArray(reg.phoneNumber) ? reg.phoneNumber.join(', ') : reg.phoneNumber}</div>
                                                                            </div>
                                                                        </div>
                                                                        <div className="space-y-4">
                                                                            <div>
                                                                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1">Gestational Age</label>
                                                                                <Badge className="bg-primary/10 text-primary hover:bg-primary/20 rounded-lg px-2 py-0.5 border-none font-black">{reg.gestationalAge} Weeks</Badge>
                                                                            </div>
                                                                            <div>
                                                                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1">Health Facility</label>
                                                                                <div className="font-bold text-slate-600">{reg.healthFacility}</div>
                                                                            </div>
                                                                            <div>
                                                                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1">Registration Date</label>
                                                                                <div className="font-bold">{reg.createdAt ? format(new Date(reg.createdAt), 'PPP') : 'N/A'}</div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </ScrollArea>
                                                            {isAdmin && (
                                                                <DialogFooter className="pt-4 border-t gap-2 sm:justify-start">
                                                                    <Button variant="outline" className="rounded-xl font-bold" onClick={() => {
                                                                        setSelectedParticipant(null);
                                                                        setEditingParticipant(reg);
                                                                    }}>
                                                                        <Pencil className="mr-2 h-4 w-4" /> Edit Record
                                                                    </Button>
                                                                </DialogFooter>
                                                            )}
                                                        </DialogContent>
                                                    </Dialog>

                                                    {isAdmin && (
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary" 
                                                            onClick={() => setEditingParticipant(reg)}
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </TableCell>
                                                <TableCell className="font-mono text-[10px] font-bold text-slate-500">{reg.participantId}</TableCell>
                                                <TableCell className="font-extrabold text-sm">{reg.name}</TableCell>
                                                <TableCell className="text-[10px] font-black text-muted-foreground uppercase truncate max-w-[140px]">{reg.healthFacility}</TableCell>
                                                <TableCell className="text-right pr-6 text-[10px] font-bold text-slate-500">{reg.createdAt ? format(new Date(reg.createdAt), 'dd/MM/yy') : 'N/A'}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center italic font-bold text-muted-foreground">
                                                No participants match your query.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                        <div className="flex items-center justify-between p-4 border-t bg-muted/10">
                            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                Total Registry Count: {filteredRegistrations.length}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Recruitment Insights for RAs */}
                <div className="lg:col-span-4 space-y-6">
                    <Card className="border-none ring-1 ring-border shadow-none overflow-hidden">
                        <CardHeader className="bg-purple-500/5 border-b py-5 px-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                                    <BarChart3 className="h-5 w-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg font-black tracking-tight">Study Intelligence</CardTitle>
                                    <CardDescription className="text-[9px] font-bold uppercase tracking-widest text-purple-600/60">Barrier analysis for RAs</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div>
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Primary Attrition Drivers</h4>
                                <div className="space-y-4">
                                    {recruitmentStats?.reasonStats.length ? recruitmentStats.reasonStats.map((r, i) => (
                                        <div key={i} className="space-y-1.5">
                                            <div className="flex justify-between items-end text-[10px] font-bold">
                                                <span className="truncate max-w-[180px] text-slate-700">{r.reason}</span>
                                                <span className="font-black text-purple-600">{r.count} <span className="text-[8px] text-muted-foreground opacity-60">Cases</span></span>
                                            </div>
                                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                                <div 
                                                    className="bg-purple-500 h-full rounded-full" 
                                                    style={{ width: `${(r.count / (recruitmentStats.totalEligible || 1)) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="py-8 text-center text-[10px] font-bold italic text-muted-foreground">No barriers logged yet.</div>
                                    )}
                                </div>
                            </div>

                            <Separator />

                            <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-dashed border-slate-200">
                                <div className="flex items-center gap-2">
                                    <Activity className="h-4 w-4 text-emerald-600" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Identification Snapshot</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Eligible Screened</div>
                                        <div className="text-lg font-black text-slate-900">{recruitmentStats?.totalEligible}</div>
                                    </div>
                                    <div>
                                        <div className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Study Enrolled</div>
                                        <div className="text-lg font-black text-slate-900">{recruitmentStats?.totalInterviewed}</div>
                                    </div>
                                </div>
                            </div>

                            <Button variant="ghost" className="w-full h-11 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-100 hover:bg-slate-200 text-slate-900" asChild>
                                <Link href="/anc/recruitment">Fill Daily Track Log <ChevronRight className="ml-2 h-4 w-4" /></Link>
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="border-none ring-1 ring-border shadow-none bg-primary/5">
                        <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                            <div className="p-3 bg-white rounded-full shadow-sm ring-1 ring-primary/10">
                                <Activity className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <h4 className="text-sm font-black tracking-tight">Syncing Study Data</h4>
                                <p className="text-[10px] font-medium text-muted-foreground leading-relaxed">Your logs are automatically synced with the global clinical repository.</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {editingParticipant && (
                <Dialog open={!!editingParticipant} onOpenChange={(open) => !open && setEditingParticipant(null)}>
                    <DialogContent className="sm:max-w-2xl rounded-2xl">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-black">Edit Participant Data</DialogTitle>
                            <DialogDescription className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Update clinical record or correct Participant ID</DialogDescription>
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
        </div>
    );
}
