
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
  ClipboardList
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
import { safeParseDate } from '@/lib/timeline/formulas';
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
    const [displayLimit, setDisplayLimit] = useState(100);
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

    const handleDeleteParticipant = async (id: string) => {
        if (!firestore || userRole !== 'admin') return;
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

    const safeFormatDate = (dateVal: any) => {
        const d = safeParseDate(dateVal);
        if (!d || !isValid(d)) return 'Pending';
        return format(d, 'PPP');
    };

    if (isRegLoading || registrations === null) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Activity className="h-10 w-10 animate-spin text-primary" />
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Synchronizing Registry Intelligence...</p>
            </div>
        );
    }

    const isAdmin = userRole === 'admin';

    return (
        <div className="space-y-8 max-w-[1600px] mx-auto pb-24 lg:pb-12 px-4 md:px-0">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-[9px]">
                        <ShieldCheck className="h-4 w-4" /> Global Registry Unit
                    </div>
                    <div className="flex items-center gap-4">
                        <h1 className="text-4xl font-black tracking-tighter">Cohort Population</h1>
                        <Badge className="h-8 px-3 rounded-xl border-none font-black text-sm bg-primary/5 text-primary">
                            {registrations.length} Verified Records
                        </Badge>
                    </div>
                </div>
                <Button asChild className="h-12 px-6 rounded-xl font-black uppercase tracking-widest shadow-xl shadow-primary/20">
                    <Link href="/anc/register"><UserPlus className="mr-2 h-5 w-5" /> Register Participant</Link>
                </Button>
            </div>

            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                {[
                    { label: "Total Enrolled", value: stats?.totalEnrolled ?? "...", icon: UserCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
                    { label: "Active Sites", value: stats?.siteCount ?? "...", icon: Hospital, color: "text-blue-600", bg: "bg-blue-50" },
                    { label: "Avg. Age", value: stats?.avgAge ?? "...", icon: Heart, color: "text-rose-600", bg: "bg-rose-50" },
                    { label: "Registry Mode", value: isRegCached ? "Local" : "Live", icon: isRegCached ? Activity : ShieldCheck, color: isRegCached ? "text-amber-600" : "text-emerald-600", bg: isRegCached ? "bg-amber-50" : "bg-emerald-50" },
                ].map((stat, i) => (
                    <Card key={i} className="border-none ring-1 ring-border shadow-none overflow-hidden bg-card">
                        <CardHeader className="p-4 pb-0 flex flex-row items-center justify-between space-y-0">
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest truncate">{stat.label}</span>
                            <div className={`p-2 rounded-xl ${stat.bg} ${stat.color} hidden sm:flex`}><stat.icon className="h-4 w-4" /></div>
                        </CardHeader>
                        <CardContent className="p-4 pt-1">
                            <div className="text-2xl font-black tracking-tighter">{stat.value}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <Card className="lg:col-span-8 border-none ring-1 ring-border shadow-none overflow-hidden bg-card rounded-[2.5rem] flex flex-col h-full">
                    <CardHeader className="bg-primary/5 border-b py-6 px-8 flex flex-col sm:flex-row justify-between items-center gap-6 shrink-0">
                        <div>
                            <CardTitle className="text-2xl font-black tracking-tight">Verified Registry Feed</CardTitle>
                            <CardDescription className="text-xs font-bold uppercase tracking-widest opacity-60">Audit-ready clinical dataset</CardDescription>
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
                    <CardContent className="p-0 flex-1 flex flex-col min-h-0">
                        <ScrollArea className="h-[600px]">
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
                                            <TableCell colSpan={5} className="text-center py-20 text-muted-foreground italic">No verified records found.</TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredItems.visible.map((reg) => (
                                            <TableRow key={reg.id} className="group transition-colors hover:bg-muted/20 border-b border-border/50">
                                                <TableCell className="pl-8 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <Dialog open={selectedParticipant?.id === reg.id} onOpenChange={(open) => !open && setSelectedParticipant(null)}>
                                                            <DialogTrigger asChild>
                                                                <Button variant="secondary" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/10 bg-background shadow-sm border-none" onClick={() => setSelectedParticipant(reg)}>
                                                                    <Eye className="h-4 w-4" />
                                                                </Button>
                                                            </DialogTrigger>
                                                            <DialogContent className="sm:max-w-3xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
                                                                <DialogHeader className="p-8 bg-primary/5 border-b">
                                                                    <div className="flex flex-col sm:flex-row justify-between items-start gap-6">
                                                                        <div className="space-y-1">
                                                                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Participant Profile</p>
                                                                            <DialogTitle className="text-4xl font-black tracking-tighter">{reg.name}</DialogTitle>
                                                                            <div className="flex items-center gap-3 mt-2">
                                                                                <IdBadge id={reg.participantId} />
                                                                                <Badge variant="outline" className="bg-background font-bold text-[10px] uppercase border-2">{reg.healthFacility.split(' (')[0]}</Badge>
                                                                            </div>
                                                                        </div>
                                                                        {isAdmin && (
                                                                            <div className="flex gap-2 shrink-0">
                                                                                <Button variant="secondary" className="rounded-xl font-bold gap-2" onClick={() => { setEditingParticipant(reg); setSelectedParticipant(null); }}>
                                                                                    <Pencil className="h-4 w-4" /> Edit
                                                                                </Button>
                                                                                <AlertDialog>
                                                                                    <AlertDialogTrigger asChild>
                                                                                        <Button variant="destructive" className="rounded-xl font-bold gap-2"><Trash2 className="h-4 w-4" /> Purge</Button>
                                                                                    </AlertDialogTrigger>
                                                                                    <AlertDialogContent className="rounded-2xl">
                                                                                        <AlertDialogHeader>
                                                                                            <AlertDialogTitle className="font-black text-2xl tracking-tight">Purge Clinical Record?</AlertDialogTitle>
                                                                                            <AlertDialogDescription className="font-medium">Permanently remove <span className="text-foreground font-extrabold">{reg.name}</span> from the ANC cohort dataset.</AlertDialogDescription>
                                                                                        </AlertDialogHeader>
                                                                                        <AlertDialogFooter>
                                                                                            <AlertDialogCancel className="rounded-xl font-bold">Cancel</AlertDialogCancel>
                                                                                            <AlertDialogAction onClick={() => handleDeleteParticipant(reg.id)} className="bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700">Confirm Purge</AlertDialogAction>
                                                                                        </AlertDialogFooter>
                                                                                    </AlertDialogContent>
                                                                                </AlertDialog>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </DialogHeader>
                                                                <div className="p-8 space-y-8 overflow-y-auto max-h-[75vh]">
                                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                                        <div className="p-5 bg-muted/20 rounded-2xl space-y-1">
                                                                            <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Age</p>
                                                                            <p className="font-extrabold text-lg">{reg.age} Years</p>
                                                                        </div>
                                                                        <div className="p-5 bg-muted/20 rounded-2xl space-y-1">
                                                                            <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Marital Status</p>
                                                                            <p className="font-extrabold text-lg">{reg.maritalStatus}</p>
                                                                        </div>
                                                                        <div className="p-5 bg-primary/5 rounded-2xl space-y-1 border border-primary/10">
                                                                            <p className="text-[9px] font-black uppercase text-primary tracking-widest">Gest. Age</p>
                                                                            <p className="font-extrabold text-lg text-primary">{reg.gestationalAge} Weeks</p>
                                                                        </div>
                                                                        <div className="p-5 bg-muted/20 rounded-2xl space-y-1">
                                                                            <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">First ANC</p>
                                                                            <p className="font-extrabold text-lg">{safeFormatDate(reg.firstAncDate)}</p>
                                                                        </div>
                                                                    </div>

                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                                        <div className="space-y-4">
                                                                            <h4 className="text-xs font-black uppercase tracking-widest flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> Contact Intelligence</h4>
                                                                            <div className="p-6 bg-emerald-50/50 rounded-3xl ring-1 ring-emerald-100/50">
                                                                                <label className="text-[10px] font-black uppercase text-emerald-700 block mb-3">Primary Phone Number(s)</label>
                                                                                <div className="space-y-2">
                                                                                    {Array.isArray(reg.phoneNumber) ? reg.phoneNumber.map((num, i) => (
                                                                                        <div key={i} className="flex items-center gap-3"><div className="h-2 w-2 rounded-full bg-emerald-400" /><span className="font-mono font-black text-xl">{num}</span></div>
                                                                                    )) : <div className="font-mono font-black text-xl">{reg.phoneNumber}</div>}
                                                                                </div>
                                                                            </div>
                                                                            <div className="p-6 bg-slate-50/50 rounded-3xl ring-1 ring-slate-100">
                                                                                <label className="text-[10px] font-black uppercase text-slate-500 block mb-3">Next of Kin: {reg.nextOfKinName || 'N/A'}</label>
                                                                                <p className="font-mono font-bold text-slate-600 text-lg">{reg.alternativeContact || 'No alternative contact'}</p>
                                                                            </div>
                                                                        </div>

                                                                        <div className="space-y-4">
                                                                            <h4 className="text-xs font-black uppercase tracking-widest flex items-center gap-2"><ClipboardList className="h-4 w-4 text-primary" /> Enrollment Context</h4>
                                                                            <div className="p-5 bg-muted/20 rounded-2xl space-y-1">
                                                                                <p className="text-[10px] font-black uppercase text-muted-foreground">RA Enrollment Attribution</p>
                                                                                <p className="font-extrabold text-primary flex items-center gap-2"><UserCheck className="h-4 w-4" />{reg.registeredBy || 'Project Staff'}</p>
                                                                            </div>
                                                                            <div className="p-5 bg-muted/20 rounded-2xl space-y-1">
                                                                                <p className="text-[10px] font-black uppercase text-muted-foreground">System Audit Timestamp</p>
                                                                                <p className="font-extrabold text-slate-600" suppressHydrationWarning>
                                                                                    {reg.createdAt ? format(safeParseDate(reg.createdAt) || new Date(), 'PPP p') : 'Historical'}
                                                                                </p>
                                                                            </div>
                                                                            <Button asChild className="w-full h-14 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 mt-4">
                                                                                <Link href={`/anc/participants/${reg.id}`}>Open Full Timeline <ChevronRight className="ml-2 h-5 w-5" /></Link>
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </DialogContent>
                                                        </Dialog>
                                                        {isAdmin && (
                                                            <Button variant="secondary" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/10 bg-background shadow-sm border-none" onClick={() => setEditingParticipant(reg)}><Pencil className="h-4 w-4" /></Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-mono text-[10px] font-bold text-slate-500"><IdBadge id={reg.participantId} hideLabel /></TableCell>
                                                <TableCell className="font-extrabold text-sm">{reg.name}</TableCell>
                                                <TableCell className="text-[10px] font-black text-muted-foreground uppercase truncate max-w-[140px]">{reg.healthFacility?.split(' (')[0]}</TableCell>
                                                <TableCell className="text-right pr-8 text-[10px] font-black uppercase text-slate-500" suppressHydrationWarning>
                                                    {safeParseDate(reg.createdAt) ? formatDistanceToNow(safeParseDate(reg.createdAt)!, { addSuffix: true }) : 'Historical'}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-4 border-none ring-1 ring-border shadow-none overflow-hidden bg-card rounded-[2.5rem] flex flex-col h-full">
                    <CardHeader className="bg-emerald-50/50 border-b py-6 px-8 shrink-0">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 text-emerald-700 font-black uppercase tracking-widest text-[9px]"><Target className="h-4 w-4" /> Reach Analysis</div>
                            <Badge className="bg-emerald-600 text-white border-none font-black text-[10px]">{Math.round((registrations?.length || 0) / TOTAL_TARGET * 100)}% Target</Badge>
                        </div>
                        <CardTitle className="text-2xl font-black tracking-tight">Clinical Site Reach</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 flex flex-col min-h-0">
                        <ScrollArea className="h-[600px]">
                            <div className="p-8 space-y-6">
                                {facilityStats.map((fac, i) => (
                                    <div key={i} className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-black tracking-tight">{fac.name.split(' (')[0]}</span>
                                            <span className="text-[10px] font-bold text-emerald-600">{fac.enrolled} / {fac.target}</span>
                                        </div>
                                        <Progress value={fac.percentage} className="h-1.5 rounded-full bg-muted shadow-inner" />
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
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
