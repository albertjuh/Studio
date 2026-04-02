"use client";
import { FACILITY_TARGETS, normalizeSiteName } from '@/lib/facility-targets';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { 
  Loader2, UserPlus, Search, Hospital, Eye, Pencil, 
  ShieldCheck, Activity, RefreshCcw, AlertTriangle,
  UserCheck, Heart, Building2, Database, Users, MapPin, 
  Phone, CheckCircle2, Wifi, WifiOff, LayoutList
} from 'lucide-react';
import Link from "next/link";
import { formatDistanceToNow } from 'date-fns';
import type { AncRegistration, RecruitmentEntry } from "@/types";
import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { safeParseDate } from '@/lib/timeline/formulas';
import { IdBadge } from '@/app/anc/components/id-badge';

export default function AncDashboardPage() {
    const { toast } = useToast();
    const firestore = useFirestore();
    const [userRole, setUserRole] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingParticipant, setEditingParticipant] = useState<AncRegistration | null>(null);
    const [selectedParticipant, setSelectedParticipant] = useState<AncRegistration | null>(null);
    const [displayLimit, setDisplayLimit] = useState(15);

    useEffect(() => {
        const userStr = localStorage.getItem('ancUser');
        if (userStr) {
            setUserRole(JSON.parse(userStr).role);
        }
    }, []);

    const regsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'anc_registrations') : null, [firestore]);
    const recsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'recruitment_entries') : null, [firestore]);

    const { data: rawRegistrations, isLoading: isRegLoading, isFromCache: isRegCached } = useCollection<AncRegistration>(regsQuery);
    const { data: rawRecruitment, isLoading: isRecLoading } = useCollection<RecruitmentEntry>(recsQuery);

    const registrations = useMemo(() => {
        if (!rawRegistrations) return null;
        return [...rawRegistrations].sort((a, b) => {
            const dA = safeParseDate(a)?.getTime() || 0;
            const dB = safeParseDate(b)?.getTime() || 0;
            return dB - dA;
        });
    }, [rawRegistrations]);

    // --- DEEP AUDIT LOGIC ---
    // This identifies the "Missing 3" by comparing RA logs against the Registry
    const registryAudit = useMemo(() => {
        if (!registrations || !rawRecruitment) return null;
        
        const registryCounts: Record<string, number> = {};
        registrations.forEach(r => {
            const core = normalizeSiteName(r.healthFacility || '');
            if (core) registryCounts[core] = (registryCounts[core] || 0) + 1;
        });

        const logCounts: Record<string, number> = {};
        rawRecruitment.forEach(e => {
            if (e.first_row_flag === 1) {
                const core = normalizeSiteName(e.facility || '');
                if (core) logCounts[core] = (logCounts[core] || 0) + (Number(e.interviewed) || 0);
            }
        });

        const totalFromLogs = Object.values(logCounts).reduce((a, b) => a + b, 0);
        const totalFromRegistry = registrations.length;
        const discrepancy = Math.abs(totalFromLogs - totalFromRegistry);

        const hotspots = Object.keys(FACILITY_TARGETS).map(fac => {
            const core = normalizeSiteName(fac);
            const reg = registryCounts[core] || 0;
            const log = logCounts[core] || 0;
            return { name: fac, reg, log, diff: log - reg };
        }).filter(h => h.diff > 0);

        return { totalFromLogs, totalFromRegistry, discrepancy, hotspots };
    }, [registrations, rawRecruitment]);

    const stats = useMemo(() => {
        if (!registrations) return null;
        const totalEnrolled = registrations.length;
        const siteSet = new Set(registrations.map(r => r.healthFacility || 'Unknown'));
        const avgAge = totalEnrolled > 0 
            ? (registrations.reduce((sum, r) => sum + (r.age || 0), 0) / totalEnrolled).toFixed(1)
            : "0";
        return { totalEnrolled, siteCount: siteSet.size, avgAge };
    }, [registrations]);

    const filteredItems = useMemo(() => {
        if (!registrations) return { visible: [], total: 0 };
        const lower = searchTerm.toLowerCase();
        const filtered = registrations.filter(reg => 
            reg.name?.toLowerCase().includes(lower) || 
            reg.participantId?.toLowerCase().includes(lower)
        );
        return { visible: filtered.slice(0, displayLimit), total: filtered.length };
    }, [registrations, searchTerm, displayLimit]);

    if (isRegLoading || registrations === null) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Synchronizing Cohort Registry...</p>
            </div>
        );
    }

    const isAdmin = userRole === 'admin';

    return (
        <div className="space-y-8 max-w-[1600px] mx-auto pb-24 lg:pb-12 px-4 md:px-0">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-[9px]">
                        <ShieldCheck className="h-4 w-4" /> Management Control Center
                    </div>
                    <div className="flex items-center gap-4">
                        <h1 className="text-4xl font-black tracking-tighter">Cohort Registry</h1>
                        <div className="flex items-center gap-2">
                            <Badge className="h-8 px-3 rounded-xl border-none font-black text-sm bg-primary/5 text-primary">
                                {registrations.length} Verified Records
                            </Badge>
                            {isRegCached && (
                                <Badge variant="outline" className="h-8 px-3 rounded-xl border-amber-200 text-amber-600 bg-amber-50 gap-1.5">
                                    <WifiOff className="h-3 w-3" /> Offline Cache
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button asChild className="h-12 px-6 rounded-xl font-black uppercase tracking-widest shadow-xl shadow-primary/20">
                        <Link href="/anc/register"><UserPlus className="mr-2 h-5 w-5" /> Register Participant</Link>
                    </Button>
                </div>
            </div>

            {/* INTEGRITY AUDIT ALERT */}
            {registryAudit && registryAudit.discrepancy > 0 && (
                <Card className="border-none ring-2 ring-rose-500/20 bg-rose-50/50 dark:bg-rose-950/10 overflow-hidden rounded-[2rem]">
                    <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-4 text-rose-700 dark:text-rose-400">
                            <div className="p-3 bg-rose-500 rounded-2xl text-white shadow-lg shadow-rose-500/20">
                                <AlertTriangle className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black tracking-tight leading-tight">Data Discrepancy Detected</h3>
                                <p className="text-xs font-medium opacity-80">RAs logged {registryAudit.totalFromLogs} enrollments, but Registry only contains {registryAudit.totalFromRegistry} forms. ({registryAudit.discrepancy} missing).</p>
                            </div>
                        </div>
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="secondary" className="rounded-xl font-bold bg-white dark:bg-card shadow-sm hover:bg-rose-100">
                                    Analyze Missing Records
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-xl rounded-[2.5rem] border-none shadow-2xl overflow-hidden p-0">
                                <DialogHeader className="p-8 bg-rose-500 text-white">
                                    <DialogTitle className="text-2xl font-black tracking-tight">Registry Audit</DialogTitle>
                                    <DialogDescription className="text-white/80 font-bold uppercase tracking-widest text-[10px]">
                                        Identifying sites with unsaved registration forms
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="p-8 space-y-4">
                                    {registryAudit.hotspots.map((h, i) => (
                                        <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-muted/30">
                                            <div>
                                                <p className="text-sm font-black uppercase">{h.name.split(' (')[0]}</p>
                                                <p className="text-[10px] font-bold text-muted-foreground">Logged: {h.log} • Registry: {h.reg}</p>
                                            </div>
                                            <Badge className="bg-rose-100 text-rose-700 border-none font-black text-xs">
                                                -{h.diff} Missing
                                            </Badge>
                                        </div>
                                    ))}
                                    <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 mt-4">
                                        <p className="text-xs font-bold text-amber-800 leading-relaxed italic">
                                            Note: If records were added while offline, they will sync automatically when the connection is restored. Check the "Synced" icon in the navigation bar.
                                        </p>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </CardContent>
                </Card>
            )}
            
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                {[
                    { label: "Total Enrolled", value: stats?.totalEnrolled ?? "...", icon: UserCheck, color: "text-emerald-600", bg: "bg-emerald-50", desc: "Biological Population" },
                    { label: "Active Sites", value: stats?.siteCount ?? "...", icon: Hospital, color: "text-blue-600", bg: "bg-blue-50", desc: "Clinical Reach" },
                    { label: "Avg. Age", value: stats?.avgAge ?? "...", icon: Heart, color: "text-rose-600", bg: "bg-rose-50", desc: "Cohort Demographics" },
                    { label: "Registry Mode", value: isRegCached ? "Local" : "Live", icon: isRegCached ? WifiOff : Wifi, color: isRegCached ? "text-amber-600" : "text-emerald-600", bg: isRegCached ? "bg-amber-50" : "bg-emerald-50", desc: "Connection Integrity" },
                ].map((stat, i) => (
                    <Card key={i} className="border-none ring-1 ring-border shadow-none overflow-hidden hover:ring-primary/40 transition-all bg-card">
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

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <Card className="lg:col-span-12 border-none ring-1 ring-border shadow-none overflow-hidden bg-card rounded-[2.5rem]">
                    <CardHeader className="bg-primary/5 border-b py-6 px-8 flex flex-col sm:flex-row justify-between items-center gap-6">
                        <div>
                            <CardTitle className="text-2xl font-black tracking-tight">Verified Registry Feed</CardTitle>
                            <CardDescription className="text-xs font-bold uppercase tracking-widest opacity-60">Real-time audit-ready clinical dataset</CardDescription>
                        </div>
                        <div className="relative w-full sm:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search by name or ID..." 
                                className="pl-10 h-11 rounded-2xl border-none bg-background focus:bg-background ring-1 ring-border" 
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)} 
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-muted/30">
                                <TableRow>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest pl-8 w-28">Controls</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Participant ID</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Name</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Facility</TableHead>
                                    <TableHead className="text-right text-[10px] font-black uppercase tracking-widest pr-8">Date Recorded</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredItems.visible.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-20 text-muted-foreground italic">No participants found.</TableCell>
                                    </TableRow>
                                ) : (
                                    filteredItems.visible.map((reg) => (
                                        <TableRow key={reg.id} className="group transition-colors hover:bg-muted/20 border-b border-border/50">
                                            <TableCell className="pl-8 py-4 flex items-center gap-2">
                                                <Dialog open={selectedParticipant?.id === reg.id} onOpenChange={(open) => !open && setSelectedParticipant(null)}>
                                                    <DialogTrigger asChild>
                                                        <Button variant="secondary" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/10 bg-background shadow-sm border-none" onClick={() => setSelectedParticipant(reg)}>
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="sm:max-w-2xl rounded-[2.5rem] p-0 overflow-hidden">
                                                        {/* Profile Content Re-used */}
                                                        <DialogHeader className="p-8 bg-primary/5 border-b">
                                                            <DialogTitle className="text-2xl font-black tracking-tight">Participant Profile</DialogTitle>
                                                            <IdBadge id={reg.participantId} />
                                                        </DialogHeader>
                                                        <ScrollArea className="max-h-[60vh] p-8">
                                                            <div className="space-y-6">
                                                                <div className="grid grid-cols-2 gap-8">
                                                                    <div>
                                                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1">Full Name</label>
                                                                        <div className="font-extrabold text-lg">{reg.name}</div>
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1">Site</label>
                                                                        <div className="font-bold">{reg.healthFacility}</div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </ScrollArea>
                                                    </DialogContent>
                                                </Dialog>
                                                {isAdmin && (
                                                    <Button variant="secondary" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/10 bg-background shadow-sm border-none" onClick={() => setEditingParticipant(reg)}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </TableCell>
                                            <TableCell className="font-mono text-[10px] font-bold text-slate-500">
                                                <IdBadge id={reg.participantId} hideLabel />
                                            </TableCell>
                                            <TableCell className="font-extrabold text-sm">{reg.name}</TableCell>
                                            <TableCell className="text-[10px] font-black text-muted-foreground uppercase truncate max-w-[140px]">{reg.healthFacility?.replace(/ \(Zone [A-D]\)/, '')}</TableCell>
                                            <TableCell className="text-right pr-8 text-[10px] font-black uppercase text-slate-500" suppressHydrationWarning>
                                                {safeParseDate(reg) ? formatDistanceToNow(safeParseDate(reg)!, { addSuffix: true }) : 'Historical'}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                        
                        {filteredItems.total > displayLimit && (
                            <div className="p-8 border-t bg-primary/[0.02] flex justify-center">
                                <Button 
                                    variant="secondary" 
                                    onClick={() => setDisplayLimit(prev => prev + 15)}
                                    className="font-black uppercase tracking-widest text-[10px] gap-2 h-12 px-10 rounded-2xl shadow-sm"
                                >
                                    View More Records ({filteredItems.total - displayLimit} remaining)
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {editingParticipant && (
                <Dialog open={!!editingParticipant} onOpenChange={(open) => !open && setEditingParticipant(null)}>
                    <DialogContent className="sm:max-w-2xl rounded-[2.5rem] border-none shadow-2xl overflow-hidden p-0 bg-background">
                        <DialogHeader className="p-8 bg-amber-50 dark:bg-amber-900/10 border-b border-amber-100">
                            <DialogTitle className="text-xl font-black text-amber-900">Correct Participant Data</DialogTitle>
                        </DialogHeader>
                        <ScrollArea className="max-h-[80vh]">
                            <div className="p-8">
                                <AncRegistrationForm editMode={true} initialData={editingParticipant} onOpenChange={(open) => !open && setEditingParticipant(null)} />
                            </div>
                        </ScrollArea>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
