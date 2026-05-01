"use client";
import { FACILITY_TARGETS, normalizeSiteName, TOTAL_TARGET } from '@/lib/facility-targets';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, deleteDoc, doc } from 'firebase/firestore';
import { 
  Loader2, UserPlus, Search, Hospital, Eye, Pencil, 
  ShieldCheck, Activity,
  UserCheck, Heart, Trash2,
  Target,
  ChevronRight,
  Clock,
  Calendar,
  Baby,
  ClipboardList,
  ChevronDown,
  CheckCircle2
} from 'lucide-react';
import Link from "next/link";
import { format, formatDistanceToNow, isValid } from 'date-fns';
import type { AncRegistration } from "@/types";
import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
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
import { resolveParticipantStatuses, safeParseDate } from '@/lib/timeline/formulas';
import { IdBadge } from '@/app/anc/components/id-badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function AncDashboardPage() {
    const { toast } = useToast();
    const firestore = useFirestore();
    const [userRole, setUserRole] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingParticipant, setEditingParticipant] = useState<AncRegistration | null>(null);
    const [selectedParticipant, setSelectedParticipant] = useState<AncRegistration | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const userStr = localStorage.getItem('ancUser');
        if (userStr) {
            setUserRole(JSON.parse(userStr).role);
        }
    }, []);

    const regsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'anc_registrations') : null, [firestore]);

    const { data: rawRegistrations, isLoading: isRegLoading, isFromCache: isRegCached } = useCollection<AncRegistration>(regsQuery);

    const registrations = useMemo(() => {
        if (!rawRegistrations) return null;
        return [...rawRegistrations]
            .filter(r => r && r.participantId)
            .sort((a, b) => {
                const dA = safeParseDate(a.createdAt || a.enrollment_date || a.firstAncDate)?.getTime() || 0;
                const dB = safeParseDate(b.createdAt || b.enrollment_date || b.firstAncDate)?.getTime() || 0;
                return dB - dA;
            });
    }, [rawRegistrations]);

    const filteredItems = useMemo(() => {
        if (!registrations) return { visible: [], total: 0 };
        const lower = searchTerm.toLowerCase();
        const filtered = registrations.filter(reg => 
            reg && (reg.name?.toLowerCase().includes(lower) || 
            reg.participantId?.toLowerCase().includes(lower))
        );
        return { visible: filtered, total: filtered.length };
    }, [registrations, searchTerm]);

    const stats = useMemo(() => {
        if (!registrations) return null;
        const totalEnrolled = registrations.length;
        const siteSet = new Set(registrations.map(r => r.healthFacility || 'Unknown'));
        const avgAge = totalEnrolled > 0 
            ? (registrations.reduce((sum, r) => sum + (r.age || 0), 0) / totalEnrolled).toFixed(1)
            : "0";
        return { totalEnrolled, siteCount: siteSet.size, avgAge };
    }, [registrations]);

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
        }).sort((a, b) => b.percentage - a.percentage);
    }, [registrations]);

    const handleDeleteParticipant = async (id: string) => {
        if (!firestore || userRole !== 'admin') return;
        setIsDeleting(true);
        try {
            await deleteDoc(doc(firestore, 'anc_registrations', id));
            toast({ title: "Record Removed", variant: "success" });
            setSelectedParticipant(null);
        } catch (error: any) {
            toast({ title: "Deletion Failed", description: error.message, variant: "destructive" });
        } finally {
            setIsDeleting(false);
        }
    };

    const safeFormatDate = (dateVal: any) => {
        const d = safeParseDate(dateVal);
        if (!d || !isValid(d)) return 'Pending';
        return format(d, 'PPP');
    };

    if (isRegLoading || registrations === null) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
                <Activity className="h-8 w-8 animate-spin text-primary" />
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Syncing Intelligence...</p>
            </div>
        );
    }

    const isAdmin = userRole === 'admin';

    return (
        <div className="space-y-8 pb-24">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shrink-0">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-[8px]">
                        <ShieldCheck className="h-3 w-3" /> Registry Unit
                    </div>
                    <div className="flex items-center gap-4">
                        <h1 className="text-4xl font-black tracking-tighter">Cohort Population</h1>
                        <Badge className="h-8 px-3 rounded-xl border-none font-black text-sm bg-primary text-white shadow-lg shadow-primary/20">
                            {registrations.length} Records
                        </Badge>
                    </div>
                </div>
                <Button asChild className="h-14 px-10 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-2xl shadow-primary/30 bg-primary hover:bg-primary/90">
                    <Link href="/anc/register"><UserPlus className="mr-2 h-5 w-5" /> Enroll Participant</Link>
                </Button>
            </div>

            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                {[
                    { label: "Total Enrolled", value: stats?.totalEnrolled ?? "...", icon: UserCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
                    { label: "Active Sites", value: stats?.siteCount ?? "...", icon: Hospital, color: "text-blue-600", bg: "bg-blue-50" },
                    { label: "Avg. Age", value: stats?.avgAge ?? "...", icon: Heart, color: "text-rose-600", bg: "bg-rose-50" },
                    { label: "Registry Mode", value: isRegCached ? "Local" : "Live", icon: isRegCached ? Activity : ShieldCheck, color: isRegCached ? "text-amber-600" : "text-emerald-600", bg: isRegCached ? "bg-amber-50" : "bg-emerald-50" },
                ].map((stat, i) => (
                    <Card key={i} className="border-none ring-1 ring-border shadow-xl overflow-hidden bg-card/60 backdrop-blur-sm group hover:ring-primary/40 transition-all border-t-4 border-t-primary/20">
                        <CardHeader className="p-5 pb-0 flex flex-row items-center justify-between space-y-0">
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest truncate">{stat.label}</span>
                            <div className={`p-2 rounded-xl ${stat.bg} ${stat.color} hidden sm:flex`}><stat.icon className="h-4 w-4" /></div>
                        </CardHeader>
                        <CardContent className="p-5 pt-1">
                            <div className="text-3xl font-black tracking-tighter">{stat.value}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <Card className="lg:col-span-8 border-none ring-1 ring-border shadow-2xl overflow-hidden bg-card/60 backdrop-blur-sm rounded-[2.5rem] border-t-4 border-t-primary">
                    <CardHeader className="bg-primary/5 border-b p-8 flex flex-col sm:flex-row justify-between items-center gap-6">
                        <div className="space-y-1">
                            <CardTitle className="text-2xl font-black tracking-tight leading-none">Verified Registry Feed</CardTitle>
                            <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60">Audit-ready global clinical dataset</CardDescription>
                        </div>
                        <div className="relative w-full sm:w-80">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                            <Input 
                                placeholder="Search registry..." 
                                className="pl-11 h-12 rounded-2xl border-none bg-background focus:bg-background ring-1 ring-primary/20 font-bold text-sm shadow-sm" 
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)} 
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="h-[600px] w-full">
                            <Table>
                                <TableHeader className="bg-muted/30 sticky top-0 z-20 backdrop-blur-md shadow-sm border-b">
                                    <TableRow>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest pl-8 w-24">Controls</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest">ID Reference</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest">Participant Name</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest">Protocol Progress</TableHead>
                                        <TableHead className="text-right text-[10px] font-black uppercase tracking-widest pr-8">Date Recorded</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredItems.visible.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-32 text-muted-foreground italic font-bold">No records found matching your filters.</TableCell>
                                        </TableRow>
                                    ) : (
                                        <>
                                            {filteredItems.visible.map((reg) => (
                                                <TableRow key={reg.id} className="group transition-all hover:bg-primary/[0.03] border-b border-border/40">
                                                    <TableCell className="pl-8 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <Dialog open={selectedParticipant?.id === reg.id} onOpenChange={(open) => !open && setSelectedParticipant(null)}>
                                                                <DialogTrigger asChild>
                                                                    <Button variant="secondary" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/20 bg-background shadow-sm border-none" onClick={() => setSelectedParticipant(reg)}>
                                                                        <Eye className="h-4 w-4 text-primary" />
                                                                    </Button>
                                                                </DialogTrigger>
                                                                <DialogContent className="sm:max-w-2xl rounded-[3rem] p-0 overflow-hidden border-none shadow-3xl">
                                                                    <DialogHeader className="p-8 bg-primary text-white border-b">
                                                                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                                                            <div className="space-y-1">
                                                                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/70">Profile Dossier</p>
                                                                                <DialogTitle className="text-3xl font-black tracking-tighter">{reg.name}</DialogTitle>
                                                                                <div className="flex items-center gap-3 mt-2">
                                                                                    <IdBadge id={reg.participantId} className="scale-90 origin-left" />
                                                                                    <div className="w-1 h-1 rounded-full bg-white/40" />
                                                                                    <Badge variant="outline" className="bg-white/10 text-white font-black text-[9px] uppercase border-white/20 h-6">{reg.healthFacility.split(' (')[0]}</Badge>
                                                                                </div>
                                                                            </div>
                                                                            {isAdmin && (
                                                                                <div className="flex gap-2 shrink-0">
                                                                                    <Button variant="secondary" className="rounded-xl font-black uppercase text-[10px] gap-2 h-10 px-4" onClick={() => { setEditingParticipant(reg); setSelectedParticipant(null); }}>
                                                                                        <Pencil className="h-3.5 w-3.5" /> Edit
                                                                                    </Button>
                                                                                    <AlertDialog>
                                                                                        <AlertDialogTrigger asChild>
                                                                                            <Button variant="destructive" className="rounded-xl font-black uppercase text-[10px] gap-2 h-10 px-4 bg-rose-600 hover:bg-rose-700 border-none"><Trash2 className="h-3.5 w-3.5" /> Purge</Button>
                                                                                        </AlertDialogTrigger>
                                                                                        <AlertDialogContent className="rounded-3xl border-none shadow-2xl">
                                                                                            <AlertDialogHeader>
                                                                                                <AlertDialogTitle className="font-black text-2xl tracking-tight">Purge Record?</AlertDialogTitle>
                                                                                                <AlertDialogDescription className="font-medium text-slate-600">Permanently remove <span className="text-slate-900 font-black">{reg.name}</span> from the ANC cohort dataset.</AlertDialogDescription>
                                                                                            </AlertDialogHeader>
                                                                                            <AlertDialogFooter className="mt-4">
                                                                                                <AlertDialogCancel className="rounded-xl font-bold">Cancel</AlertDialogCancel>
                                                                                                <AlertDialogAction onClick={() => handleDeleteParticipant(reg.id)} className="bg-rose-600 text-white rounded-xl font-black uppercase tracking-widest hover:bg-rose-700">Confirm Purge</AlertDialogAction>
                                                                                            </AlertDialogFooter>
                                                                                        </AlertDialogContent>
                                                                                    </AlertDialog>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </DialogHeader>
                                                                    <div className="p-8 space-y-8">
                                                                        <div className="grid grid-cols-4 gap-4">
                                                                            <div className="p-4 bg-muted/20 rounded-2xl space-y-1 shadow-sm border border-black/5">
                                                                                <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Age</p>
                                                                                <p className="font-black text-lg">{reg.age}y</p>
                                                                            </div>
                                                                            <div className="p-4 bg-muted/20 rounded-2xl space-y-1 shadow-sm border border-black/5">
                                                                                <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Status</p>
                                                                                <p className="font-black text-lg truncate">{reg.maritalStatus}</p>
                                                                            </div>
                                                                            <div className="p-4 bg-primary/5 rounded-2xl space-y-1 border border-primary/20 shadow-sm">
                                                                                <p className="text-[9px] font-black uppercase text-primary tracking-widest">Enroll GA</p>
                                                                                <p className="font-black text-lg text-primary">{reg.gestationalAge}w</p>
                                                                            </div>
                                                                            <div className="p-4 bg-muted/20 rounded-2xl space-y-1 shadow-sm border border-black/5">
                                                                                <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">ANC 1</p>
                                                                                <p className="font-black text-lg truncate">{safeFormatDate(reg.firstAncDate).split(',')[0]}</p>
                                                                            </div>
                                                                        </div>
                                                                        <Button asChild className="w-full h-16 rounded-[1.5rem] font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 text-[10px] bg-primary hover:bg-primary/90">
                                                                            <Link href={`/anc/participants/${reg.id}`} className="flex items-center justify-center gap-4">
                                                                                Open Full Research Timeline <ChevronRight className="h-6 w-6" />
                                                                            </Link>
                                                                        </Button>
                                                                    </div>
                                                                </DialogContent>
                                                            </Dialog>
                                                            {isAdmin && (
                                                                <Button variant="secondary" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/20 bg-background shadow-sm border-none" onClick={() => setEditingParticipant(reg)}><Pencil className="h-4 w-4 text-primary" /></Button>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-4">
                                                        <IdBadge id={reg.participantId} hideLabel className="scale-90 origin-left" />
                                                    </TableCell>
                                                    <TableCell className="font-black text-sm text-slate-800 dark:text-slate-200">{reg.name}</TableCell>
                                                    <TableCell>
                                                        <div className="flex gap-1.5">
                                                            {[1, 2, 3, 4].map(num => {
                                                                const isDone = num === 1 || (reg as any)[`survey${num}_completed`];
                                                                return (
                                                                    <div key={num} className={cn(
                                                                        "h-7 w-7 flex items-center justify-center rounded-lg border-2 text-[10px] font-black transition-all",
                                                                        isDone ? "bg-primary border-primary text-white shadow-lg shadow-primary/30" : "bg-muted/30 border-muted text-muted-foreground/30"
                                                                    )}>
                                                                        S{num}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right pr-8 text-[10px] font-black uppercase text-slate-500" suppressHydrationWarning>
                                                        {safeParseDate(reg.createdAt) ? format(safeParseDate(reg.createdAt)!, 'dd MMM yyyy') : 'Historical'}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            <TableRow>
                                                <TableCell colSpan={5} className="py-12 bg-primary/[0.05]">
                                                    <div className="flex flex-col items-center justify-center gap-4 text-center">
                                                        <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/20 border-4 border-white dark:border-slate-800">
                                                            <CheckCircle2 className="h-6 w-6 text-white" />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <p className="text-sm font-black tracking-tight text-primary uppercase">End of Verified Feed</p>
                                                            <p className="text-[10px] font-bold text-primary/60 uppercase tracking-[0.3em]">Global Dataset Fully Synchronized</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        </>
                                    )}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-4 border-none ring-1 ring-border shadow-2xl overflow-hidden bg-card/60 backdrop-blur-sm rounded-[2.5rem] border-t-4 border-t-primary">
                    <CardHeader className="bg-primary/10 border-b p-8">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3 text-primary font-black uppercase tracking-[0.2em] text-[10px]"><Target className="h-5 w-5" /> Municipal Reach</div>
                            <Badge className="bg-primary text-white border-none font-black text-sm h-8 px-4 rounded-xl shadow-lg shadow-primary/30">{Math.round((registrations?.length || 0) / TOTAL_TARGET * 100)}% Complete</Badge>
                        </div>
                        <CardTitle className="text-2xl font-black tracking-tight">Clinical Site Reach</CardTitle>
                        <CardDescription className="text-xs font-bold text-primary/60 uppercase tracking-widest mt-1">Real-time recruitment pulse across 30 facilities</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="h-[600px] w-full">
                            <div className="p-8 space-y-6">
                                {facilityStats.map((fac, i) => (
                                    <div key={i} className="space-y-2 group">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] font-black tracking-tight text-slate-700 dark:text-slate-300 group-hover:text-primary transition-colors">{fac.name.split(' (')[0]}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-black text-primary bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20">
                                                    {fac.enrolled} / {fac.target}
                                                </span>
                                            </div>
                                        </div>
                                        <Progress value={fac.percentage} className="h-2 rounded-full bg-muted/40 shadow-none border border-black/5" />
                                    </div>
                                ))}
                                
                                <div className="pt-8 border-t border-dashed border-primary/30">
                                    <div className="flex flex-col items-center justify-center gap-4 text-center">
                                        <div className="p-4 bg-primary/10 rounded-2xl shadow-sm border border-primary/20">
                                            <Hospital className="h-7 w-7 text-primary" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-black tracking-tight text-primary uppercase">End of Site Analysis</p>
                                            <p className="text-[10px] font-bold text-primary/60 uppercase tracking-[0.3em]">30 Facilities Monitored in Live Cycle</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>

            {editingParticipant && (
                <Dialog open={!!editingParticipant} onOpenChange={(open) => !open && setEditingParticipant(null)}>
                    <DialogContent className="sm:max-w-2xl rounded-[3rem] border-none shadow-3xl overflow-hidden p-0 bg-background">
                        <DialogHeader className="p-8 bg-primary text-white border-b">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/20 rounded-2xl text-white">
                                    <Pencil className="h-7 w-7" />
                                </div>
                                <div>
                                    <DialogTitle className="text-2xl font-black tracking-tighter">Correct Clinical Record</DialogTitle>
                                    <DialogDescription className="text-white/60 font-bold uppercase tracking-widest text-[9px] mt-1">Management override for ID: {editingParticipant.participantId}</DialogDescription>
                                </div>
                            </div>
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