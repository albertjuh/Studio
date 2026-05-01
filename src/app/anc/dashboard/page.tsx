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
  ChevronDown
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
    const [displayLimit, setDisplayLimit] = useState(25);
    const [facilityLimit, setFacilityLimit] = useState(15);
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
        return { visible: filtered.slice(0, displayLimit), total: filtered.length };
    }, [registrations, searchTerm, displayLimit]);

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

    const visibleFacilities = useMemo(() => {
        return facilityStats.slice(0, facilityLimit);
    }, [facilityStats, facilityLimit]);

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
            <div className="flex flex-col items-center justify-center h-full gap-3">
                <Activity className="h-8 w-8 animate-spin text-primary" />
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Syncing Intelligence...</p>
            </div>
        );
    }

    const isAdmin = userRole === 'admin';

    return (
        <div className="flex flex-col h-full gap-4 pb-4 overflow-hidden">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shrink-0">
                <div className="space-y-0.5">
                    <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-[8px]">
                        <ShieldCheck className="h-3 w-3" /> Registry Unit
                    </div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-black tracking-tighter">Cohort Population</h1>
                        <Badge className="h-6 px-2 rounded-lg border-none font-black text-[10px] bg-primary/5 text-primary">
                            {registrations.length} Records
                        </Badge>
                    </div>
                </div>
                <Button asChild className="h-10 px-4 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20">
                    <Link href="/anc/register"><UserPlus className="mr-2 h-4 w-4" /> Register</Link>
                </Button>
            </div>

            <div className="grid gap-3 grid-cols-2 md:grid-cols-4 shrink-0">
                {[
                    { label: "Total Enrolled", value: stats?.totalEnrolled ?? "...", icon: UserCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
                    { label: "Active Sites", value: stats?.siteCount ?? "...", icon: Hospital, color: "text-blue-600", bg: "bg-blue-50" },
                    { label: "Avg. Age", value: stats?.avgAge ?? "...", icon: Heart, color: "text-rose-600", bg: "bg-rose-50" },
                    { label: "Registry Mode", value: isRegCached ? "Local" : "Live", icon: isRegCached ? Activity : ShieldCheck, color: isRegCached ? "text-amber-600" : "text-emerald-600", bg: isRegCached ? "bg-amber-50" : "bg-emerald-50" },
                ].map((stat, i) => (
                    <Card key={i} className="border-none ring-1 ring-border shadow-none overflow-hidden bg-card/60 backdrop-blur-sm">
                        <CardHeader className="p-3 pb-0 flex flex-row items-center justify-between space-y-0">
                            <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest truncate">{stat.label}</span>
                            <div className={`p-1.5 rounded-lg ${stat.bg} ${stat.color} hidden sm:flex`}><stat.icon className="h-3 w-3" /></div>
                        </CardHeader>
                        <CardContent className="p-3 pt-0.5">
                            <div className="text-xl font-black tracking-tighter">{stat.value}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0 overflow-hidden">
                <Card className="lg:col-span-8 border-none ring-1 ring-border shadow-none overflow-hidden bg-card/60 backdrop-blur-sm rounded-3xl flex flex-col h-full min-h-0">
                    <CardHeader className="bg-primary/5 border-b py-3 px-6 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
                        <div className="space-y-0.5">
                            <CardTitle className="text-lg font-black tracking-tight leading-none">Verified Registry Feed</CardTitle>
                            <CardDescription className="text-[8px] font-bold uppercase tracking-widest opacity-60">Audit-ready clinical dataset</CardDescription>
                        </div>
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input 
                                placeholder="Search registry..." 
                                className="pl-9 h-9 rounded-xl border-none bg-background focus:bg-background ring-1 ring-border text-xs" 
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)} 
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 min-h-0">
                        <ScrollArea className="h-full">
                            <Table>
                                <TableHeader className="bg-muted/30 sticky top-0 z-10 backdrop-blur-md shadow-sm">
                                    <TableRow className="h-10">
                                        <TableHead className="text-[9px] font-black uppercase tracking-widest pl-6 w-20">Ctrl</TableHead>
                                        <TableHead className="text-[9px] font-black uppercase tracking-widest">ID</TableHead>
                                        <TableHead className="text-[9px] font-black uppercase tracking-widest">Name</TableHead>
                                        <TableHead className="text-[9px] font-black uppercase tracking-widest">Progress</TableHead>
                                        <TableHead className="text-right text-[9px] font-black uppercase tracking-widest pr-6">Recorded</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredItems.visible.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-12 text-muted-foreground italic text-xs">No records found.</TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredItems.visible.map((reg) => (
                                            <TableRow key={reg.id} className="group transition-colors hover:bg-muted/20 border-b border-border/40 h-10">
                                                <TableCell className="pl-6 py-2">
                                                    <div className="flex items-center gap-1.5">
                                                        <Dialog open={selectedParticipant?.id === reg.id} onOpenChange={(open) => !open && setSelectedParticipant(null)}>
                                                            <DialogTrigger asChild>
                                                                <Button variant="secondary" size="icon" className="h-7 w-7 rounded-lg hover:bg-primary/10 bg-background shadow-none border-none" onClick={() => setSelectedParticipant(reg)}>
                                                                    <Eye className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </DialogTrigger>
                                                            <DialogContent className="sm:max-w-2xl rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
                                                                <DialogHeader className="p-6 bg-primary/5 border-b">
                                                                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                                                        <div className="space-y-0.5">
                                                                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">Profile Dossier</p>
                                                                            <DialogTitle className="text-2xl font-black tracking-tighter">{reg.name}</DialogTitle>
                                                                            <div className="flex items-center gap-2 mt-1.5">
                                                                                <IdBadge id={reg.participantId} className="scale-90 origin-left" />
                                                                                <Badge variant="outline" className="bg-background font-bold text-[8px] uppercase border-2 h-5">{reg.healthFacility.split(' (')[0]}</Badge>
                                                                            </div>
                                                                        </div>
                                                                        {isAdmin && (
                                                                            <div className="flex gap-1.5 shrink-0">
                                                                                <Button variant="secondary" className="rounded-lg font-bold gap-1.5 h-8 text-[10px]" onClick={() => { setEditingParticipant(reg); setSelectedParticipant(null); }}>
                                                                                    <Pencil className="h-3.5 w-3.5" /> Edit
                                                                                </Button>
                                                                                <AlertDialog>
                                                                                    <AlertDialogTrigger asChild>
                                                                                        <Button variant="destructive" className="rounded-lg font-bold gap-1.5 h-8 text-[10px]"><Trash2 className="h-3.5 w-3.5" /> Purge</Button>
                                                                                    </AlertDialogTrigger>
                                                                                    <AlertDialogContent className="rounded-2xl">
                                                                                        <AlertDialogHeader>
                                                                                            <AlertDialogTitle className="font-black text-xl tracking-tight">Purge Record?</AlertDialogTitle>
                                                                                            <AlertDialogDescription className="text-sm font-medium">Permanently remove <span className="text-foreground font-extrabold">{reg.name}</span> from the dataset.</AlertDialogDescription>
                                                                                        </AlertDialogHeader>
                                                                                        <AlertDialogFooter>
                                                                                            <AlertDialogCancel className="rounded-lg font-bold">Cancel</AlertDialogCancel>
                                                                                            <AlertDialogAction onClick={() => handleDeleteParticipant(reg.id)} className="bg-rose-600 text-white rounded-lg font-bold hover:bg-rose-700">Confirm Purge</AlertDialogAction>
                                                                                        </AlertDialogFooter>
                                                                                    </AlertDialogContent>
                                                                                </AlertDialog>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </DialogHeader>
                                                                <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
                                                                    <div className="grid grid-cols-4 gap-3">
                                                                        <div className="p-3 bg-muted/20 rounded-xl space-y-0.5">
                                                                            <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Age</p>
                                                                            <p className="font-extrabold text-sm">{reg.age}y</p>
                                                                        </div>
                                                                        <div className="p-3 bg-muted/20 rounded-xl space-y-0.5">
                                                                            <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Status</p>
                                                                            <p className="font-extrabold text-sm truncate">{reg.maritalStatus}</p>
                                                                        </div>
                                                                        <div className="p-3 bg-primary/5 rounded-xl space-y-0.5 border border-primary/10">
                                                                            <p className="text-[8px] font-black uppercase text-primary tracking-widest">GA</p>
                                                                            <p className="font-extrabold text-sm text-primary">{reg.gestationalAge}w</p>
                                                                        </div>
                                                                        <div className="p-3 bg-muted/20 rounded-xl space-y-0.5">
                                                                            <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">ANC 1</p>
                                                                            <p className="font-extrabold text-sm truncate">{safeFormatDate(reg.firstAncDate).split(',')[0]}</p>
                                                                        </div>
                                                                    </div>
                                                                    <Button asChild className="w-full h-12 rounded-xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 text-xs">
                                                                        <Link href={`/anc/participants/${reg.id}`}>Open Full Timeline <ChevronRight className="ml-2 h-4 w-4" /></Link>
                                                                    </Button>
                                                                </div>
                                                            </DialogContent>
                                                        </Dialog>
                                                        {isAdmin && (
                                                            <Button variant="secondary" size="icon" className="h-7 w-7 rounded-lg hover:bg-primary/10 bg-background shadow-none border-none" onClick={() => setEditingParticipant(reg)}><Pencil className="h-3.5 w-3.5" /></Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-mono text-[9px] font-bold text-slate-500"><IdBadge id={reg.participantId} hideLabel className="scale-90 origin-left" /></TableCell>
                                                <TableCell className="font-extrabold text-xs">{reg.name}</TableCell>
                                                <TableCell>
                                                    <div className="flex gap-0.5">
                                                        {[1, 2, 3, 4].map(num => {
                                                            const isDone = num === 1 || (reg as any)[`survey${num}_completed`];
                                                            return (
                                                                <Badge key={num} className={cn(
                                                                    "h-3.5 w-3.5 p-0 flex items-center justify-center rounded-sm border-none text-[7px] font-black",
                                                                    isDone ? "bg-primary text-white" : "bg-muted text-muted-foreground/30"
                                                                )}>
                                                                    {num}
                                                                </Badge>
                                                            );
                                                        })}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right pr-6 text-[9px] font-black uppercase text-slate-500" suppressHydrationWarning>
                                                    {safeParseDate(reg.createdAt) ? format(safeParseDate(reg.createdAt)!, 'dd/MM/yy') : 'Hist.'}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                            {filteredItems.total > displayLimit && (
                                <div className="p-4 flex justify-center border-t bg-muted/5 shrink-0">
                                    <Button 
                                        variant="outline" 
                                        onClick={() => setDisplayLimit(prev => prev + 25)}
                                        className="rounded-lg font-black uppercase tracking-widest text-[8px] border border-dashed border-primary/20 h-8 px-4 gap-1.5"
                                    >
                                        See More ({filteredItems.total - displayLimit}) <ChevronDown className="h-3 w-3" />
                                    </Button>
                                </div>
                            )}
                        </ScrollArea>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-4 border-none ring-1 ring-border shadow-none overflow-hidden bg-card/60 backdrop-blur-sm rounded-3xl flex flex-col h-full min-h-0">
                    <CardHeader className="bg-emerald-50/40 border-b py-3 px-6 shrink-0">
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2 text-emerald-700 font-black uppercase tracking-widest text-[8px]"><Target className="h-3.5 w-3.5" /> Reach Analysis</div>
                            <Badge className="bg-emerald-600 text-white border-none font-black text-[9px] h-5 px-2">{Math.round((registrations?.length || 0) / TOTAL_TARGET * 100)}%</Badge>
                        </div>
                        <CardTitle className="text-lg font-black tracking-tight">Clinical Site Reach</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 min-h-0 overflow-hidden">
                        <ScrollArea className="h-full">
                            <div className="p-6 space-y-4">
                                {visibleFacilities.map((fac, i) => (
                                    <div key={i} className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black tracking-tight truncate max-w-[140px]">{fac.name.split(' (')[0]}</span>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[9px] font-bold text-emerald-600">
                                                    {fac.enrolled}/{fac.target}
                                                </span>
                                            </div>
                                        </div>
                                        <Progress value={fac.percentage} className="h-1 rounded-full bg-muted shadow-none" />
                                    </div>
                                ))}
                            </div>
                            {facilityStats.length > facilityLimit && (
                                <div className="p-6 pt-0 flex justify-center shrink-0">
                                    <Button 
                                        variant="outline" 
                                        onClick={() => setFacilityLimit(prev => prev + 10)}
                                        className="w-full rounded-lg font-black uppercase tracking-widest text-[8px] border border-dashed border-primary/20 h-8 gap-1.5"
                                    >
                                        View All Sites <ChevronDown className="h-3 w-3" />
                                    </Button>
                                </div>
                            )}
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>

            {editingParticipant && (
                <Dialog open={!!editingParticipant} onOpenChange={(open) => !open && setEditingParticipant(null)}>
                    <DialogContent className="sm:max-w-xl rounded-3xl border-none shadow-2xl overflow-hidden p-0 bg-background">
                        <DialogHeader className="p-6 bg-amber-50 dark:bg-amber-900/10 border-b border-amber-100">
                            <DialogTitle className="text-lg font-black text-amber-900">Correct Record</DialogTitle>
                        </DialogHeader>
                        <div className="p-6 overflow-y-auto max-h-[70vh]">
                            <AncRegistrationForm editMode={true} initialData={editingParticipant} onOpenChange={(open) => !open && setEditingParticipant(null)} />
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
