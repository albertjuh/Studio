
"use client";
import { FACILITY_TARGETS, normalizeSiteName, TOTAL_TARGET } from '@/lib/facility-targets';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, deleteDoc, doc } from 'firebase/firestore';
import { 
  Loader2, UserPlus, Search, Hospital, Eye, Pencil, 
  ShieldCheck, Activity, AlertTriangle,
  UserCheck, Heart, Trash2, Calendar, UserSquare2, Info,
  XCircle,
  TrendingUp,
  Target,
  ChevronRight,
  CheckCircle2
} from 'lucide-react';
import Link from "next/link";
import { format, formatDistanceToNow, subDays, startOfDay } from 'date-fns';
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
import { useToast } from "@/hooks/use-toast";
import { AncRegistrationForm } from "@/app/anc/components/registration-form";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { safeParseDate } from '@/lib/timeline/formulas';
import { IdBadge } from '@/app/anc/components/id-badge';
import { Progress } from '@/components/ui/progress';
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts';

export default function AncDashboardPage() {
    const { toast } = useToast();
    const firestore = useFirestore();
    const [userRole, setUserRole] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingParticipant, setEditingParticipant] = useState<AncRegistration | null>(null);
    const [selectedParticipant, setSelectedParticipant] = useState<AncRegistration | null>(null);
    const [displayLimit, setDisplayLimit] = useState(15);
    const [isDeleting, setIsDeleting] = useState(false);
    const [ignoredDiscrepancy, setIgnoredDiscrepancy] = useState<number | null>(null);

    useEffect(() => {
        const userStr = localStorage.getItem('ancUser');
        if (userStr) {
            setUserRole(JSON.parse(userStr).role);
        }
        
        const storedIgnored = localStorage.getItem('anc_ignored_discrepancy');
        if (storedIgnored) {
            setIgnoredDiscrepancy(parseInt(storedIgnored, 10));
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

    const facilityStats = useMemo(() => {
        if (!registrations) return [];
        
        const counts: Record<string, number> = {};
        registrations.forEach(r => {
            if (r && r.healthFacility) {
                counts[r.healthFacility] = (counts[r.healthFacility] || 0) + 1;
            }
        });

        return Object.entries(FACILITY_TARGETS).map(([name, target]) => {
            const enrolled = counts[name] || 0;
            const percentage = target > 0 ? Math.min(100, Math.round((enrolled / target) * 100)) : 0;
            return { name, enrolled, target, percentage };
        }).sort((a, b) => b.percentage - a.percentage || b.enrolled - a.enrolled);
    }, [registrations]);

    const enrollmentTrend = useMemo(() => {
        if (!registrations) return [];
        const days = 14;
        const result = [];
        const today = startOfDay(new Date());

        for (let i = days; i >= 0; i--) {
            const d = subDays(today, i);
            const dateStr = format(d, 'MMM dd');
            const count = registrations.filter(r => {
                const rDate = safeParseDate(r);
                return rDate && startOfDay(rDate).getTime() <= d.getTime();
            }).length;
            result.push({ date: dateStr, count });
        }
        return result;
    }, [registrations]);

    const registryAudit = useMemo(() => {
        if (!registrations || !rawRecruitment) return null;
        
        const registryCounts: Record<string, number> = {};
        registrations.forEach(r => {
            if (!r || !r.healthFacility) return;
            const core = normalizeSiteName(r.healthFacility);
            if (core) registryCounts[core] = (registryCounts[core] || 0) + 1;
        });

        const logCounts: Record<string, number> = {};
        rawRecruitment.forEach(e => {
            if (e && e.first_row_flag === 1 && e.facility) {
                const core = normalizeSiteName(e.facility);
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
        }).filter(h => h.diff !== 0);

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
            reg && (reg.name?.toLowerCase().includes(lower) || 
            reg.participantId?.toLowerCase().includes(lower))
        );
        return { visible: filtered.slice(0, displayLimit), total: filtered.length };
    }, [registrations, searchTerm, displayLimit]);

    const handleDismissDiscrepancy = () => {
        if (registryAudit) {
            localStorage.setItem('anc_ignored_discrepancy', registryAudit.discrepancy.toString());
            setIgnoredDiscrepancy(registryAudit.discrepancy);
            toast({ 
                title: "Baseline Gap Acknowledged", 
                description: `Hiding alert for current ${registryAudit.discrepancy} unmatched records.`,
                variant: "success" 
            });
        }
    };

    const handleDeleteParticipant = async (id: string) => {
        if (!firestore || !isAdmin) return;
        setIsDeleting(true);
        try {
            await deleteDoc(doc(firestore, 'anc_registrations', id));
            toast({ title: "Participant Record Removed", variant: "success" });
            setSelectedParticipant(null);
        } catch (error: any) {
            toast({ title: "Deletion Failed", description: error.message, variant: "destructive" });
        } finally {
            setIsDeleting(false);
        }
    };

    if (isRegLoading || registrations === null) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Activity className="h-10 w-10 animate-spin text-primary" />
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
                                    <Activity className="h-3 w-3" /> Offline Cache
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

            {registryAudit && registryAudit.discrepancy > 0 && registryAudit.discrepancy !== ignoredDiscrepancy && (
                <Card className="border-none ring-2 ring-rose-500/20 bg-rose-50/50 dark:bg-rose-950/10 overflow-hidden rounded-[2rem]">
                    <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-4 text-rose-700 dark:text-rose-400">
                            <div className="p-3 bg-rose-500 rounded-2xl text-white shadow-lg shadow-rose-500/20">
                                <AlertTriangle className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black tracking-tight leading-tight">Data Discrepancy Detected</h3>
                                <p className="text-xs font-medium opacity-80">RAs logged {registryAudit.totalFromLogs} enrollments, but Registry contains {registryAudit.totalFromRegistry} forms. ({registryAudit.discrepancy} unmatched).</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button 
                                variant="outline" 
                                className="rounded-xl font-bold bg-white dark:bg-card border-2"
                                onClick={handleDismissDiscrepancy}
                            >
                                <XCircle className="mr-2 h-4 w-4" /> Dismiss Alert
                            </Button>
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="secondary" className="rounded-xl font-bold bg-white dark:bg-card shadow-sm hover:bg-rose-100">
                                        Analyze Records
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-xl rounded-[2.5rem] border-none shadow-2xl overflow-hidden p-0">
                                    <DialogHeader className="p-8 bg-rose-500 text-white">
                                        <DialogTitle className="text-2xl font-black tracking-tight">Registry Audit</DialogTitle>
                                        <DialogDescription className="text-white/80 font-bold uppercase tracking-widest text-[10px]">
                                            Identifying sites with unsaved registration forms or log backlog
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="p-8 space-y-4">
                                        {registryAudit.hotspots.map((h, i) => (
                                            <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-muted/30">
                                                <div>
                                                    <p className="text-sm font-black uppercase">{h.name.split(' (')[0]}</p>
                                                    <p className="text-[10px] font-bold text-muted-foreground">Logged: {h.log} • Registry: {h.reg}</p>
                                                </div>
                                                <Badge className={cn(
                                                    "border-none font-black text-xs",
                                                    h.diff > 0 ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
                                                )}>
                                                    {h.diff > 0 ? `-${h.diff} Missing Forms` : `+${Math.abs(h.diff)} Surplus Forms`}
                                                </Badge>
                                            </div>
                                        ))}
                                        <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 mt-4">
                                            <p className="text-xs font-bold text-amber-800 leading-relaxed italic">
                                                Note: A gap of ~56 records is expected due to the historical delay in starting RA tracking logs. Any changes to this baseline will trigger a new alert.
                                            </p>
                                        </div>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </CardContent>
                </Card>
            )}
            
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                {[
                    { label: "Total Enrolled", value: stats?.totalEnrolled ?? "...", icon: UserCheck, color: "text-emerald-600", bg: "bg-emerald-50", desc: "Biological Population" },
                    { label: "Active Sites", value: stats?.siteCount ?? "...", icon: Hospital, color: "text-blue-600", bg: "bg-blue-50", desc: "Clinical Reach" },
                    { label: "Avg. Age", value: stats?.avgAge ?? "...", icon: Heart, color: "text-rose-600", bg: "bg-rose-50", desc: "Cohort Demographics" },
                    { label: "Registry Mode", value: isRegCached ? "Local" : "Live", icon: isRegCached ? Activity : ShieldCheck, color: isRegCached ? "text-amber-600" : "text-emerald-600", bg: isRegCached ? "bg-amber-50" : "bg-emerald-50", desc: "Connection Integrity" },
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
                <Card className="lg:col-span-7 xl:col-span-8 border-none ring-1 ring-border shadow-none overflow-hidden bg-card rounded-[2.5rem] flex flex-col lg:h-[800px]">
                    <CardHeader className="bg-primary/5 border-b py-6 px-8 flex flex-col sm:flex-row justify-between items-center gap-6 shrink-0">
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
                    <CardContent className="p-0 flex-1 overflow-y-auto">
                        <Table>
                            <TableHeader className="bg-muted/30 sticky top-0 z-10 backdrop-blur-sm shadow-sm">
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
                                                    <DialogContent className="sm:max-w-3xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
                                                        <DialogHeader className="p-8 bg-primary/5 border-b flex flex-row items-center justify-between">
                                                            <div className="space-y-1">
                                                                <DialogTitle className="text-3xl font-black tracking-tighter">Participant Profile</DialogTitle>
                                                                <IdBadge id={reg.participantId} />
                                                            </div>
                                                            {isAdmin && (
                                                                <div className="flex gap-2">
                                                                    <Button 
                                                                        variant="secondary" 
                                                                        className="rounded-xl font-bold gap-2"
                                                                        onClick={() => {
                                                                            setEditingParticipant(reg);
                                                                            setSelectedParticipant(null);
                                                                        }}
                                                                    >
                                                                        <Pencil className="h-4 w-4" /> Edit Record
                                                                    </Button>
                                                                    <AlertDialog>
                                                                        <AlertDialogTrigger asChild>
                                                                            <Button variant="destructive" className="rounded-xl font-bold gap-2">
                                                                                <Trash2 className="h-4 w-4" /> Purge
                                                                            </Button>
                                                                        </AlertDialogTrigger>
                                                                        <AlertDialogContent className="rounded-2xl">
                                                                            <AlertDialogHeader>
                                                                                <AlertDialogTitle className="font-black text-2xl tracking-tight">Purge Clinical Record?</AlertDialogTitle>
                                                                                <AlertDialogDescription className="font-medium">
                                                                                    This will permanently remove <span className="text-foreground font-extrabold">{reg.name}</span> from the ANC cohort dataset. This operation cannot be reversed and will be logged for audit.
                                                                                </AlertDialogDescription>
                                                                            </AlertDialogHeader>
                                                                            <AlertDialogFooter>
                                                                                <AlertDialogCancel className="rounded-xl font-bold">Cancel</AlertDialogCancel>
                                                                                <AlertDialogAction
                                                                                    onClick={() => handleDeleteParticipant(reg.id)}
                                                                                    className="bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700"
                                                                                >
                                                                                    {isDeleting ? "Purging..." : "Confirm Purge"}
                                                                                </AlertDialogAction>
                                                                            </AlertDialogFooter>
                                                                        </AlertDialogContent>
                                                                    </AlertDialog>
                                                                </div>
                                                            )}
                                                        </DialogHeader>
                                                        <div className="p-8 space-y-8 overflow-y-auto max-h-[75vh]">
                                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                                <Card className="border-none bg-muted/20 rounded-2xl p-5 space-y-1">
                                                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">RA Registered By</label>
                                                                    <div className="flex items-center gap-2 font-extrabold text-primary">
                                                                        <UserCheck className="h-4 w-4" />
                                                                        {reg.registeredBy || 'Unknown Staff'}
                                                                    </div>
                                                                </Card>
                                                                <Card className="border-none bg-muted/20 rounded-2xl p-5 space-y-1">
                                                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">Age & Status</label>
                                                                    <div className="font-extrabold">{reg.age} years • {reg.maritalStatus}</div>
                                                                </Card>
                                                                <Card className="border-none bg-muted/20 rounded-2xl p-5 space-y-1">
                                                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">Clinical Site</label>
                                                                    <div className="font-extrabold truncate">{reg.healthFacility}</div>
                                                                </Card>
                                                            </div>

                                                            <div className="space-y-4">
                                                                <h4 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                                                    <Target className="h-4 w-4 text-primary" /> Contact Intelligence
                                                                </h4>
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                                    <div className="p-6 bg-emerald-50/50 rounded-3xl ring-1 ring-emerald-100/50">
                                                                        <label className="text-[10px] font-black uppercase tracking-widest text-emerald-700 block mb-3">Primary Phone Number(s)</label>
                                                                        <div className="space-y-2">
                                                                            {Array.isArray(reg.phoneNumber) ? reg.phoneNumber.map((num, i) => (
                                                                                <div key={i} className="flex items-center gap-3">
                                                                                    <div className="h-2 w-2 rounded-full bg-emerald-400" />
                                                                                    <span className="font-mono font-black text-lg">{num}</span>
                                                                                </div>
                                                                            )) : <div className="font-mono font-black text-lg">{reg.phoneNumber}</div>}
                                                                        </div>
                                                                    </div>
                                                                    <div className="p-6 bg-slate-50/50 rounded-3xl ring-1 ring-slate-100">
                                                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-3">Next of Kin: {reg.nextOfKinName || 'N/A'}</label>
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="h-2 w-2 rounded-full bg-slate-300" />
                                                                            <span className="font-mono font-bold text-slate-600">{reg.alternativeContact || 'No alternative contact'}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="space-y-4">
                                                                <h4 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                                                    <Calendar className="h-4 w-4 text-primary" /> Enrollment Baseline
                                                                </h4>
                                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                                    <div className="space-y-1">
                                                                        <p className="text-[9px] font-black text-muted-foreground uppercase">Enrollment GA</p>
                                                                        <p className="font-extrabold text-sm">{reg.gestationalAge} Weeks</p>
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <p className="text-[9px] font-black text-muted-foreground uppercase">First ANC Date</p>
                                                                        <p className="font-extrabold text-sm">
                                                                            {reg.firstAncDate ? format(new Date(reg.firstAncDate), 'PPP') : 'N/A'}
                                                                        </p>
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <p className="text-[9px] font-black text-muted-foreground uppercase">Form Created</p>
                                                                        <p className="font-extrabold text-sm">
                                                                            {(reg.createdAt as any)?.toDate ? format((reg.createdAt as any).toDate(), 'PPP') : 'Historical'}
                                                                        </p>
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <p className="text-[9px] font-black text-muted-foreground uppercase">Integrity Check</p>
                                                                        <Badge variant="outline" className="font-black text-[9px] uppercase tracking-widest border-emerald-200 text-emerald-700 bg-emerald-50">
                                                                            Verified Form
                                                                        </Badge>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="p-6 bg-primary/5 rounded-[2rem] border-2 border-dashed border-primary/10">
                                                                <div className="flex items-center gap-3 mb-2">
                                                                    <Info className="h-4 w-4 text-primary" />
                                                                    <h5 className="text-[10px] font-black uppercase tracking-widest text-primary">Clinical Audit Context</h5>
                                                                </div>
                                                                <p className="text-xs font-medium text-slate-600 leading-relaxed italic">
                                                                    "This record represents a verified clinical encounter. Any modifications to this record will be captured in the global study audit trail, noting the editor's identity and specific parameter changes."
                                                                </p>
                                                            </div>
                                                        </div>
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

                <Card className="lg:col-span-5 xl:col-span-4 border-none ring-1 ring-border shadow-none overflow-hidden bg-card rounded-[2.5rem] flex flex-col lg:h-[800px]">
                    <CardHeader className="bg-emerald-50/50 border-b py-6 px-8 shrink-0">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 text-emerald-700 font-black uppercase tracking-widest text-[9px]">
                                <Target className="h-4 w-4" /> Reach Analysis
                            </div>
                            <Badge className="bg-emerald-600 text-white border-none font-black text-[10px]">
                                {Math.round((registrations?.length || 0) / TOTAL_TARGET * 100)}% Global Target
                            </Badge>
                        </div>
                        <CardTitle className="text-2xl font-black tracking-tight">Clinical Site Reach</CardTitle>
                        <CardDescription className="text-xs font-bold uppercase tracking-widest opacity-60">Verified enrollment vs. municipal targets</CardDescription>
                    </CardHeader>
                    
                    <div className="p-6 bg-muted/20 border-b shrink-0">
                        <div className="h-[120px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={enrollmentTrend}>
                                    <defs>
                                        <linearGradient id="colorTrend" x1="0" y2="1">
                                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorTrend)" />
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-center mt-2 text-muted-foreground flex items-center justify-center gap-2">
                            <TrendingUp className="h-3 w-3" /> 14-Day Enrollment Velocity
                        </p>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        <div className="p-8 space-y-6">
                            {facilityStats.map((fac, i) => (
                                <div key={i} className="space-y-2 group">
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black tracking-tight group-hover:text-primary transition-colors">
                                                {fac.name.split(' (')[0]}
                                            </span>
                                            <span className="text-[9px] font-bold text-muted-foreground uppercase">
                                                Target: {fac.target} women
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-sm font-black text-emerald-600">
                                                {fac.enrolled}
                                            </span>
                                            <span className="text-[10px] font-bold text-muted-foreground ml-1">
                                                ({fac.percentage}%)
                                            </span>
                                        </div>
                                    </div>
                                    <div className="relative pt-1">
                                        <Progress value={fac.percentage} className="h-1.5 rounded-full bg-muted shadow-inner" />
                                        {fac.percentage >= 100 && (
                                            <div className="absolute right-0 -top-1">
                                                <CheckCircle2 className="h-3 w-3 text-emerald-500 bg-white rounded-full" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="p-6 bg-emerald-50/30 border-t mt-auto shrink-0">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black uppercase text-emerald-800/60 tracking-widest">Global Population</p>
                                <p className="text-xl font-black text-emerald-900">{registrations?.length} / {TOTAL_TARGET}</p>
                            </div>
                            <Button variant="outline" size="sm" className="rounded-xl border-emerald-200 bg-white text-emerald-700 font-bold hover:bg-emerald-50">
                                Full Audit <ChevronRight className="ml-1 h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>

            {editingParticipant && (
                <Dialog open={!!editingParticipant} onOpenChange={(open) => !open && setEditingParticipant(null)}>
                    <DialogContent className="sm:max-w-2xl rounded-[2.5rem] border-none shadow-2xl overflow-hidden p-0 bg-background">
                        <DialogHeader className="p-8 bg-amber-50 dark:bg-amber-900/10 border-b border-amber-100">
                            <DialogTitle className="text-xl font-black text-amber-900">Correct Participant Data</DialogTitle>
                        </DialogHeader>
                        <div className="p-8 overflow-y-auto max-h-[80vh]">
                            <AncRegistrationForm editMode={true} initialData={editingParticipant} onOpenChange={(open) => !open && setEditingParticipant(null)} />
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
