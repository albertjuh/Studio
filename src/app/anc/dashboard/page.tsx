
"use client";

import { Separator } from '@/components/ui/separator';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/table";
import { useMutation } from '@tanstack/react-query';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc, writeBatch, getDocs, query, orderBy } from 'firebase/firestore';
import { 
  Loader2, UserPlus, Search, Hospital, Eye, Pencil, Trash2, 
  ShieldCheck, Activity, ChevronRight, 
  Users2, UserCheck, Baby, Heart, Calendar, History
} from 'lucide-react';
import Link from "next/link";
import { format, isValid } from 'date-fns';
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

const safeParseDate = (dateVal: any): Date | null => {
  if (!dateVal) return null;
  if (dateVal instanceof Date) return dateVal;
  if (typeof dateVal.toDate === 'function') return dateVal.toDate();
  const parsed = new Date(dateVal);
  return isValid(parsed) ? parsed : null;
};

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
            const parsedDate = safeParseDate(r.createdAt);
            const dateStr = parsedDate ? format(parsedDate, 'MMM dd') : 'N/A';
            if (dateStr !== 'N/A') acc[dateStr] = (acc[dateStr] || 0) + 1;
            return acc;
        }, {});

        const trendData = Object.entries(trendMap).map(([date, count]) => ({ date, count: count as number })).reverse().slice(0, 10);
        return { totalEnrolled, siteCount: siteSet.size, avgAge, staffImpact, trendData };
    }, [registrations]);

    const filteredRegistrations = useMemo(() => {
        if (!registrations) return [];
        if (!searchTerm) return registrations;
        const lower = searchTerm.toLowerCase();
        return registrations.filter(reg =>
            (reg.name && reg.name.toLowerCase().includes(lower)) ||
            (reg.participantId && reg.participantId.toLowerCase().includes(lower))
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
                </div>
                <div className="flex items-center gap-2">
                    {!isViewer && (
                        <Button asChild className="h-12 px-6 rounded-xl font-black uppercase tracking-widest shadow-none">
                            <Link href="/anc/register"><UserPlus className="mr-2 h-5 w-5" /> Register Participant</Link>
                        </Button>
                    )}
                </div>
            </div>
            
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                {[
                    { label: "Total Enrolled", value: stats?.totalEnrolled || 0, icon: UserCheck, color: "text-emerald-600", bg: "bg-emerald-50", desc: "Biological Population" },
                    { label: "Active Sites", value: stats?.siteCount || 0, icon: Hospital, color: "text-blue-600", bg: "bg-blue-50", desc: "Clinical Reach" },
                    { label: "Avg. Age", value: stats?.avgAge || 0, icon: Heart, color: "text-rose-600", bg: "bg-rose-50", desc: "Cohort Demographics" },
                    { label: "Registry Status", value: "Live", icon: Activity, color: "text-amber-600", bg: "bg-amber-50", desc: "Audit Active" },
                ].map((stat, i) => (
                    <Card key={i} className="border-none ring-1 ring-border shadow-none overflow-hidden hover:ring-primary/40">
                        <CardHeader className="p-4 pb-0 flex flex-row items-center justify-between space-y-0">
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest truncate">{stat.label}</span>
                            <div className={`p-2 rounded-xl ${stat.bg} ${stat.color} hidden sm:flex`}><stat.icon className="h-4 w-4" /></div>
                        </CardHeader>
                        <CardContent className="p-4 pt-1">
                            <div className="text-2xl font-black tracking-tighter">{stat.value}</div>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase mt-0.5 opacity-60">{stat.desc}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card className="border-none ring-1 ring-border shadow-none overflow-hidden">
                <CardHeader className="bg-primary/5 border-b py-5 px-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <CardTitle className="text-xl font-black tracking-tight">Registry Feed</CardTitle>
                            <CardDescription className="text-xs font-bold uppercase tracking-widest opacity-60">Audit-ready clinical dataset</CardDescription>
                        </div>
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Search registry..." className="pl-10 h-10 rounded-xl border-2" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
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
                                {filteredRegistrations.map((reg) => (
                                    <TableRow key={reg.id} className="group transition-colors hover:bg-muted/20">
                                        <TableCell className="pl-6 flex items-center gap-1">
                                            <Dialog open={selectedParticipant?.id === reg.id} onOpenChange={(open) => !open && setSelectedParticipant(null)}>
                                                <DialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary" onClick={() => setSelectedParticipant(reg)}>
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="sm:max-w-2xl rounded-[2.5rem] border-none shadow-2xl overflow-hidden">
                                                    <DialogHeader className="p-8 bg-primary/5 border-b">
                                                        <DialogTitle className="text-2xl font-black tracking-tight">Participant Profile</DialogTitle>
                                                        <DialogDescription className="font-bold uppercase tracking-widest text-[10px] flex items-center gap-2">
                                                            ID: {reg.participantId}
                                                            {reg.is_edited && <Badge className="bg-amber-100 text-amber-700 py-0 h-4 ml-2">History Active</Badge>}
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <ScrollArea className="max-h-[60vh] p-8">
                                                        <div className="space-y-8">
                                                            <div className="grid grid-cols-2 gap-8 text-sm">
                                                                <div className="space-y-4">
                                                                    <div>
                                                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1">Full Name</label>
                                                                        <div className="font-extrabold text-lg">{reg.name}</div>
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1">Clinical Bio</label>
                                                                        <div className="font-bold">{reg.age} yrs • {reg.maritalStatus}</div>
                                                                    </div>
                                                                </div>
                                                                <div className="space-y-4">
                                                                    <div>
                                                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1">Gestational Age</label>
                                                                        <Badge className="bg-primary/10 text-primary border-none font-black">{reg.gestationalAge} Weeks</Badge>
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1">Facility</label>
                                                                        <div className="font-bold text-slate-600">{reg.healthFacility}</div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {reg.edit_history && reg.edit_history.length > 0 && (
                                                                <div className="space-y-4 pt-6 border-t border-dashed">
                                                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-600">
                                                                        <History className="h-3.5 w-3.5" /> Data Correction History
                                                                    </div>
                                                                    <div className="space-y-3">
                                                                        {reg.edit_history.map((h, hi) => (
                                                                            <div key={hi} className="p-4 rounded-xl bg-amber-50/50 border border-amber-100 text-[11px]">
                                                                                <div className="flex justify-between mb-2 font-bold text-amber-800">
                                                                                    <span>Modified by {h.edited_by}</span>
                                                                                    <span>{h.edited_at?.toDate ? format(h.edited_at.toDate(), 'dd/MM HH:mm') : 'N/A'}</span>
                                                                                </div>
                                                                                <div className="space-y-1 opacity-80">
                                                                                    {Object.entries(h.changes).map(([field, delta]: any) => (
                                                                                        <div key={field} className="flex gap-2">
                                                                                            <span className="font-black uppercase text-[8px] w-20">{field}:</span>
                                                                                            <span className="line-through text-slate-400">{delta.before}</span>
                                                                                            <ChevronRight className="h-3 w-3 text-amber-600" />
                                                                                            <span className="font-black text-amber-700">{delta.after}</span>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </ScrollArea>
                                                    {isAdmin && (
                                                        <DialogFooter className="p-8 bg-muted/30 border-t sm:justify-start">
                                                            <Button variant="outline" className="rounded-xl font-bold h-12" onClick={() => { setSelectedParticipant(null); setEditingParticipant(reg); }}>
                                                                <Pencil className="mr-2 h-4 w-4" /> Correct Record
                                                            </Button>
                                                        </DialogFooter>
                                                    )}
                                                </DialogContent>
                                            </Dialog>

                                            {isAdmin && (
                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary" onClick={() => setEditingParticipant(reg)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </TableCell>
                                        <TableCell className="font-mono text-[10px] font-bold text-slate-500">
                                            {reg.participantId}
                                            {reg.is_edited && <Badge className="bg-amber-100 text-amber-700 py-0 h-3 ml-2 text-[7px]">EDITED</Badge>}
                                        </TableCell>
                                        <TableCell className="font-extrabold text-sm">{reg.name}</TableCell>
                                        <TableCell className="text-[10px] font-black text-muted-foreground uppercase truncate max-w-[140px]">{reg.healthFacility}</TableCell>
                                        <TableCell className="text-right pr-6 text-[10px] font-bold text-slate-500">
                                            {(() => { const d = safeParseDate(reg.createdAt); return d ? format(d, 'dd/MM/yy') : 'N/A'; })()}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
            </Card>

            {editingParticipant && (
                <Dialog open={!!editingParticipant} onOpenChange={(open) => !open && setEditingParticipant(null)}>
                    <DialogContent className="sm:max-w-2xl rounded-[2.5rem] border-none shadow-2xl overflow-hidden">
                        <DialogHeader className="p-8 bg-amber-50 border-b">
                            <DialogTitle className="text-xl font-black text-amber-900">Correct Participant Data</DialogTitle>
                            <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-amber-700/60">Audit Trail Enabled</DialogDescription>
                        </DialogHeader>
                        <ScrollArea className="max-h-[80vh] p-8">
                            <AncRegistrationForm editMode={true} initialData={editingParticipant} onOpenChange={(open) => !open && setEditingParticipant(null)} />
                        </ScrollArea>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
