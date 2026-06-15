
"use client";
import { FACILITY_TARGETS, TOTAL_TARGET } from '@/lib/facility-targets';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, deleteDoc, doc } from 'firebase/firestore';
import { 
  Loader2, UserPlus, Search, Hospital, Eye, 
  ShieldCheck, Activity,
  UserCheck, Heart, Pencil,
  Target,
  Filter
} from 'lucide-react';
import Link from "next/link";
import { format } from 'date-fns';
import type { AncRegistration } from "@/types";
import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { safeParseDate, resolveParticipantStatuses } from '@/lib/timeline/formulas';
import { IdBadge } from '@/app/anc/components/id-badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion } from 'framer-motion';
import { AncRegistrationForm } from '../components/registration-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export default function AncDashboardPage() {
    const { toast } = useToast();
    const firestore = useFirestore();
    const [userRole, setUserRole] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [editingParticipant, setEditingParticipant] = useState<any>(null);

    useEffect(() => {
        const userStr = localStorage.getItem('ancUser');
        if (userStr) {
            setUserRole(JSON.parse(userStr).role);
        }
    }, []);

    const isAdmin = userRole === 'admin';

    const regsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'anc_registrations') : null, [firestore]);
    const { data: rawRegistrations, isLoading: isRegLoading, isFromCache: isRegCached } = useCollection<AncRegistration>(regsQuery);

    const registrations = useMemo(() => {
        if (!rawRegistrations) return null;
        return [...rawRegistrations]
            .filter(r => r && r.participantId)
            .map(r => resolveParticipantStatuses(r))
            .filter(Boolean)
            .sort((a, b) => {
                const dA = safeParseDate(a!.createdAt)?.getTime() || 0;
                const dB = safeParseDate(b!.createdAt)?.getTime() || 0;
                return dB - dA;
            });
    }, [rawRegistrations]);

    const filteredItems = useMemo(() => {
        if (!registrations) return { visible: [], total: 0 };
        const lower = searchTerm.toLowerCase();
        let filtered = registrations.filter(reg => 
            reg && (reg.name?.toLowerCase().includes(lower) || 
            reg.participantId?.toLowerCase().includes(lower))
        );
        
        if (statusFilter !== 'all') {
            filtered = filtered.filter(reg => reg?.study_status === statusFilter);
        }
        
        return { visible: filtered, total: filtered.length };
    }, [registrations, searchTerm, statusFilter]);

    const stats = useMemo(() => {
        if (!registrations) return null;
        const totalEnrolled = registrations.length;
        const active = registrations.filter(r => !['withdrawn', 'lost_to_followup', 'pregnancy_loss'].includes(r?.study_status || 'active')).length;
        const siteSet = new Set(registrations.map(r => r?.healthFacility || 'Unknown'));
        
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const withdrawalsMonth = registrations.filter(r => r?.study_status === 'withdrawn' && safeParseDate(r?.withdrawal_date) && safeParseDate(r?.withdrawal_date)! >= firstDay).length;

        return { totalEnrolled, active, siteCount: siteSet.size, withdrawalsMonth };
    }, [registrations]);

    if (isRegLoading || registrations === null) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }

    const STATUS_OPTIONS = [
        { id: 'all', label: 'All Population', color: 'bg-slate-100 text-slate-600' },
        { id: 'active', label: 'Active', color: 'bg-emerald-100 text-emerald-700' },
        { id: 'delivered', label: 'Delivered', color: 'bg-blue-100 text-blue-700' },
        { id: 'withdrawn', label: 'Withdrawn', color: 'bg-slate-200 text-slate-800' },
        { id: 'out_of_area', label: 'Out of Area', color: 'bg-amber-100 text-amber-700' },
        { id: 'lost_to_followup', label: 'Lost', color: 'bg-rose-100 text-rose-700' },
        { id: 'pregnancy_loss', label: 'Preg. Loss', color: 'bg-violet-100 text-violet-700' },
    ];

    return (
        <div className="space-y-6 pb-6 max-w-7xl mx-auto px-2 md:px-0">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-primary font-black uppercase tracking-widest text-[10px]">
                        <ShieldCheck className="h-4 w-4" /> Global Registry
                    </div>
                    <h1 className="text-3xl font-black tracking-tighter">Cohort Population</h1>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/40" />
                        <Input placeholder="Search name or ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 h-11 rounded-xl bg-white shadow-sm border-none ring-1 ring-primary/10" />
                    </div>
                    <Button asChild className="h-11 px-6 rounded-xl font-black uppercase text-[10px] shadow-lg shadow-primary/20">
                        <Link href="/anc/register"><UserPlus className="mr-2 h-4 w-4" /> Enroll</Link>
                    </Button>
                </div>
            </div>

            <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                {[
                    { label: "Total Population", value: stats?.totalEnrolled ?? 0, icon: UserCheck, color: "text-slate-600", bg: "bg-slate-50" },
                    { label: "Active in Study", value: stats?.active ?? 0, icon: Activity, color: "text-emerald-600", bg: "bg-emerald-50" },
                    { label: "Withdrawals (Mo)", value: stats?.withdrawalsMonth ?? 0, icon: Heart, color: "text-rose-600", bg: "bg-rose-50" },
                    { label: "Clinical Sites", value: stats?.siteCount ?? 0, icon: Hospital, color: "text-blue-600", bg: "bg-blue-50" },
                ].map((stat, i) => (
                    <Card key={i} className="border-none ring-1 ring-border shadow-sm rounded-2xl overflow-hidden bg-white">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className={cn("p-3 rounded-2xl shadow-inner", stat.bg, stat.color)}><stat.icon className="h-5 w-5" /></div>
                            <div>
                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                                <div className="text-2xl font-black tracking-tighter tabular-nums">{stat.value}</div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Filter Chips */}
            <div className="flex flex-wrap gap-2 py-2">
                {STATUS_OPTIONS.map(opt => (
                    <button
                        key={opt.id}
                        onClick={() => setStatusFilter(opt.id)}
                        className={cn(
                            "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                            statusFilter === opt.id ? opt.color + " ring-2 ring-offset-2 ring-primary/20" : "bg-white text-slate-400 ring-1 ring-border hover:bg-slate-50"
                        )}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>

            <Card className="border-none ring-1 ring-border shadow-xl rounded-3xl overflow-hidden bg-white">
                <CardHeader className="bg-primary/5 border-b p-6">
                    <CardTitle className="text-sm font-black tracking-tight uppercase">Registry Database ({filteredItems.total})</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50 border-b">
                            <TableRow>
                                <TableHead className="text-[10px] font-black uppercase pl-6">Participant</TableHead>
                                <TableHead className="text-[10px] font-black uppercase">Status</TableHead>
                                <TableHead className="text-[10px] font-black uppercase">Site</TableHead>
                                <TableHead className="text-[10px] font-black uppercase">Progress</TableHead>
                                <TableHead className="text-right text-[10px] font-black uppercase pr-6">Activity</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredItems.visible.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-20 text-slate-300 italic font-black uppercase text-xs">No records found matching filters</TableCell>
                                </TableRow>
                            ) : (
                                filteredItems.visible.map((reg: any) => (
                                    <TableRow key={reg.id} className="hover:bg-primary/[0.02] border-b last:border-0 group h-16">
                                        <TableCell className="pl-6">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-sm text-slate-800 leading-none mb-1">{reg.name}</span>
                                                <IdBadge id={reg.participantId} hideLabel className="scale-75 origin-left" />
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={cn(
                                                "rounded-md font-black text-[8px] uppercase px-2 h-5 border-none shadow-none",
                                                reg.study_status === 'withdrawn' ? "bg-slate-100 text-slate-700" :
                                                reg.study_status === 'delivered' ? "bg-blue-100 text-blue-700" :
                                                reg.study_status === 'out_of_area' ? "bg-amber-100 text-amber-700" :
                                                reg.study_status === 'pregnancy_loss' ? "bg-rose-100 text-rose-700" :
                                                "bg-emerald-100 text-emerald-700"
                                            )}>
                                                {reg.study_status || 'active'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-[10px] font-bold text-slate-500 uppercase">{reg.healthFacility.split(' (')[0]}</span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-1">
                                                {[1, 2, 3, 4].map(num => (
                                                    <div 
                                                        key={num} 
                                                        className={cn(
                                                            "h-4 px-1 min-w-[20px] flex items-center justify-center rounded-[3px] text-[7px] font-black uppercase",
                                                            num === 1 || reg[`survey${num}_completed`] ? "bg-primary text-white" : 
                                                            reg[`survey${num}_status`] === 'discontinued' ? "bg-slate-100 text-slate-300" : "bg-muted text-slate-400"
                                                        )}
                                                    >
                                                        S{num}
                                                    </div>
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <div className="flex justify-end items-center gap-2">
                                                <Button asChild variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10">
                                                    <Link href={`/anc/participants/${encodeURIComponent(reg.id)}`}><Eye className="h-4 w-4 text-primary" /></Link>
                                                </Button>
                                                {isAdmin && (
                                                    <Button variant="ghost" size="icon" onClick={() => setEditingParticipant(reg)} className="h-8 w-8 rounded-lg hover:bg-primary/10">
                                                        <Pencil className="h-4 w-4 text-primary" />
                                                    </Button>
                                                )}
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
                <Dialog open={!!editingParticipant} onOpenChange={(open) => !open && setEditingParticipant(null)}>
                    <DialogContent className="sm:max-w-xl rounded-[2.5rem] border-none shadow-2xl overflow-hidden p-0 bg-background">
                        <DialogHeader className="p-6 bg-primary text-white border-b">
                            <DialogTitle className="text-xl font-black tracking-tight uppercase">Registry Modification</DialogTitle>
                            <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-primary-foreground/70">
                                Protocol correction for {editingParticipant.name}
                            </DialogDescription>
                        </DialogHeader>
                        <ScrollArea className="max-h-[80vh] p-6">
                            <AncRegistrationForm 
                                editMode={true} 
                                initialData={editingParticipant} 
                                onOpenChange={(open) => !open && setEditingParticipant(null)}
                            />
                        </ScrollArea>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
