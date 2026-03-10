
"use client";

import { Separator } from '@/components/ui/separator';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMutation } from '@tanstack/react-query';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc, writeBatch, getDocs, query, orderBy } from 'firebase/firestore';
import { 
  Loader2, UserPlus, Search, Hospital, Eye, Pencil, Trash2, 
  ShieldCheck, Activity, ChevronRight, 
  Users2, UserCheck, Baby, Heart, Calendar
} from 'lucide-react';
import Link from "next/link";
import { format } from 'date-fns';
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
import { useToast } from "@/hooks/use-toast";
import { AncRegistrationForm } from "@/app/anc/components/registration-form";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

export default function AncDashboardPage() {
    const { toast } = useToast();
    const firestore = useFirestore();

    const [userRole, setUserRole] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [deletePassword, setDeletePassword] = useState('');
    const [editingParticipant, setEditingParticipant] = useState<AncRegistration | null>(null);
    const [selectedParticipant, setSelectedParticipant] = useState<AncRegistration | null>(null);

    const isAdmin = userRole === 'admin';
    const isViewer = userRole === 'viewer';

    const registrationsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'anc_registrations'), orderBy('createdAt', 'desc'));
    }, [firestore]);

    const { data: registrations, isLoading } = useCollection<AncRegistration>(registrationsQuery);
    
    useEffect(() => {
        const userStr = localStorage.getItem('ancUser');
        if (userStr) {
            const user = JSON.parse(userStr);
            setUserRole(user.role);
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

    const stats = useMemo(() => {
        if (!registrations) return null;

        const totalEnrolled = registrations.length;
        const siteSet = new Set(registrations.map(r => r.healthFacility));
        const avgAge = totalEnrolled > 0 ? (registrations.reduce((sum, r) => sum + (r.age || 0), 0) / totalEnrolled).toFixed(1) : 0;
        
        const staffMap = registrations.reduce((acc: any, r) => {
            const ra = r.registeredBy || 'Unknown RA';
            acc[ra] = (acc[ra] || 0) + 1;
            return acc;
        }, {});

        const staffImpact = Object.entries(staffMap)
            .map(([name, count]) => ({ name, count: count as number }))
            .sort((a, b) => b.count - a.count);

        const trendMap = registrations.reduce((acc: any, r) => {
            const date = (r.createdAt as any)?.toDate ? format((r.createdAt as any).toDate(), 'MMM dd') : format(new Date(r.createdAt || 0), 'MMM dd');
            acc[date] = (acc[date] || 0) + 1;
            return acc;
        }, {});

        const trendData = Object.entries(trendMap).map(([date, count]) => ({ date, count: count as number })).reverse().slice(0, 10);

        return { totalEnrolled, siteCount: siteSet.size, avgAge, staffImpact, trendData };
    }, [registrations]);

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

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Compiling Cohort Intelligence...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-24 lg:pb-12">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-[9px] mb-1">
                        <ShieldCheck className="h-4 w-4" /> Cohort Registry Center
                    </div>
                    <div className="flex items-center gap-4">
                        <h1 className="text-4xl font-black tracking-tighter">Clinical Dashboard</h1>
                        {registrations && (
                            <Badge variant="outline" className="h-8 px-3 rounded-xl border-2 font-black text-sm bg-primary/5 text-primary border-primary/20">
                                {registrations.length} Women Enrolled
                            </Badge>
                        )}
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">Strategic oversight of the actual participant population across all study sites.</p>
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
                    {!isViewer && (
                        <Button asChild className="flex-1 md:flex-none h-12 px-6 rounded-xl font-black uppercase tracking-widest shadow-none">
                            <Link href="/anc/register">
                                <UserPlus className="mr-2 h-5 w-5" /> Register Participant
                            </Link>
                        </Button>
                    )}
                </div>
            </div>
            
            <div className="grid gap-2 lg:gap-4 grid-cols-2 md:grid-cols-4">
                {[
                    { label: "Total Enrolled", value: stats?.totalEnrolled || 0, icon: UserCheck, color: "text-emerald-600", bg: "bg-emerald-50", desc: "Biological Population" },
                    { label: "Active Sites", value: stats?.siteCount || 0, icon: Hospital, color: "text-blue-600", bg: "bg-blue-50", desc: "Clinical Reach" },
                    { label: "Avg. Age", value: stats?.avgAge || 0, icon: Heart, color: "text-rose-600", bg: "bg-rose-50", desc: "Cohort Demographics" },
                    { label: "Registry Status", value: "Live", icon: Activity, color: "text-amber-600", bg: "bg-amber-50", desc: "Database Sync Active" },
                ].map((stat, i) => (
                    <Card key={i} className="border-none ring-1 ring-border shadow-none overflow-hidden transition-all hover:ring-primary/40">
                        <CardHeader className="p-4 pb-0 flex flex-row items-center justify-between space-y-0">
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest truncate">{stat.label}</span>
                            <div className={`p-2 rounded-xl ${stat.bg} ${stat.color} hidden sm:flex`}>
                                <stat.icon className="h-4 w-4" />
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-1">
                            <div className="text-2xl font-black tracking-tighter">{stat.value}</div>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5 opacity-60">{stat.desc}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-12">
                <Card className="lg:col-span-8 border-none ring-1 ring-border shadow-none overflow-hidden">
                    <CardHeader className="bg-primary/5 border-b py-5 px-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-xl font-black tracking-tight">Registration Velocity</CardTitle>
                                <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60">Daily biological enrollment counts</CardDescription>
                            </div>
                            <Badge variant="outline" className="bg-white font-black text-[9px] uppercase tracking-widest border-2 border-primary/20 text-primary">Cohort Growth</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="h-[300px] w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats?.trendData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 800, fill: '#94a3b8' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 800, fill: '#94a3b8' }} />
                                    <Tooltip 
                                        cursor={{ fill: 'hsl(var(--primary)/0.05)' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', padding: '12px' }}
                                    />
                                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <div className="lg:col-span-4 space-y-6">
                    <Card className="border-none ring-1 ring-border shadow-none overflow-hidden">
                        <CardHeader className="bg-emerald-500/5 border-b py-5 px-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                                    <Users2 className="h-5 w-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg font-black tracking-tight">Staff Impact</CardTitle>
                                    <CardDescription className="text-[9px] font-bold uppercase tracking-widest text-emerald-600/60">Actual registrations per RA</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-muted/10">
                                    <TableRow>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest pl-6">RA Name</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-right pr-6">Registrations</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {stats?.staffImpact.length ? stats.staffImpact.slice(0, 8).map((ra, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="pl-6 font-bold text-xs">{ra.name}</TableCell>
                                            <TableCell className="text-right pr-6 font-black text-emerald-600">{ra.count}</TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={2} className="py-8 text-center text-[10px] font-bold italic text-muted-foreground">No registrations found.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    <Card className="border-none ring-1 ring-border shadow-none bg-blue-50/50">
                        <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                            <div className="p-3 bg-white rounded-full shadow-sm ring-1 ring-blue-100">
                                <Calendar className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                                <h4 className="text-sm font-black tracking-tight">Timeline Active</h4>
                                <p className="text-[10px] font-medium text-muted-foreground leading-relaxed">Follow-up windows for these {stats?.totalEnrolled} women are being calculated in real-time.</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Card className="border-none ring-1 ring-border shadow-none overflow-hidden">
                <CardHeader className="bg-primary/5 border-b py-5 px-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <CardTitle className="text-xl font-black tracking-tight">Registry Feed</CardTitle>
                            <CardDescription className="text-xs font-bold uppercase tracking-widest opacity-60">Full granular list of enrolled participants</CardDescription>
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
                </CardContent>
            </Card>

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
