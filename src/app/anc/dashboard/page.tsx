"use client";
import { FACILITY_TARGETS, TOTAL_TARGET } from '@/lib/facility-targets';
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
  Baby,
  CheckCircle2
} from 'lucide-react';
import Link from "next/link";
import { format, isValid } from 'date-fns';
import type { AncRegistration } from "@/types";
import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription
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
import { motion } from 'framer-motion';

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

    const isAdmin = userRole === 'admin';

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
        if (!firestore || !isAdmin) return;
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

    const safeFormatDateLocal = (dateVal: any) => {
        const d = safeParseDate(dateVal);
        if (!d || !isValid(d)) return 'Pending';
        return format(d, 'PPP');
    };

    if (isRegLoading || registrations === null) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
                <Activity className="h-12 w-12 animate-spin text-primary" />
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground">Syncing Intelligence...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 md:space-y-10 pb-12">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-primary font-black uppercase tracking-[0.3em] text-[10px]">
                        <ShieldCheck className="h-4 w-4" /> Registry Unit
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-3xl md:text-4xl font-black tracking-tighter">Cohort Population</h1>
                        <Badge className="bg-primary text-white border-none font-black text-xs h-7 px-4 rounded-xl shadow-lg shadow-primary/20">
                            {registrations.length} TOTAL
                        </Badge>
                    </div>
                </div>
                <Button asChild className="h-12 px-8 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-primary/30 w-full md:w-auto hover:scale-105 active:scale-95 transition-all">
                    <Link href="/anc/register"><UserPlus className="mr-2 h-5 w-5" /> Enroll Participant</Link>
                </Button>
            </div>

            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                {[
                    { label: "Total Enrolled", value: stats?.totalEnrolled ?? "...", icon: UserCheck, color: "text-emerald-700", bg: "bg-emerald-50", ring: "ring-emerald-200" },
                    { label: "Active Sites", value: stats?.siteCount ?? "...", icon: Hospital, color: "text-blue-700", bg: "bg-blue-50", ring: "ring-blue-200" },
                    { label: "Avg. Age", value: `${stats?.avgAge}Y`, icon: Heart, color: "text-rose-700", bg: "bg-rose-50", ring: "ring-rose-200" },
                    { label: "Registry Mode", value: isRegCached ? "Local" : "Live", icon: isRegCached ? Activity : ShieldCheck, color: isRegCached ? "text-amber-700" : "text-emerald-700", bg: isRegCached ? "bg-amber-50" : "bg-emerald-50", ring: "ring-emerald-200" },
                ].map((stat, i) => (
                    <Card key={i} className={cn("border-none ring-1 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-card group hover:ring-primary/40 transition-all", stat.ring)}>
                        <CardHeader className="p-4 md:p-6 pb-0 flex flex-row items-center justify-between space-y-0">
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] truncate">{stat.label}</span>
                            <div className={`p-2.5 rounded-xl ${stat.bg} ${stat.color} hidden sm:flex shadow-inner`}><stat.icon className="h-5 w-5" /></div>
                        </CardHeader>
                        <CardContent className="p-4 md:p-6 pt-1">
                            <div className="text-3xl md:text-4xl font-black tracking-tighter tabular-nums">{stat.value}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <Card className="lg:col-span-8 border-none ring-1 ring-border shadow-sm bg-white dark:bg-card rounded-[2rem] overflow-hidden">
                    <CardHeader className="bg-primary/[0.03] border-b p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="space-y-1 text-center md:text-left">
                            <CardTitle className="text-2xl font-black tracking-tight leading-none">Verified Registry Feed</CardTitle>
                            <CardDescription className="text-[10px] font-black uppercase tracking-[0.4em] opacity-50">High-Integrity Clinical Dataset</CardDescription>
                        </div>
                        <div className="relative w-full md:w-80">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary/60" />
                            <Input 
                                placeholder="Search registry..." 
                                className="pl-12 h-12 rounded-2xl border-none bg-background focus:bg-background ring-1 ring-primary/20 font-bold text-sm shadow-inner" 
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)} 
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="block md:hidden p-4 space-y-4">
                            {filteredItems.visible.map((reg) => (
                                <Link key={reg.id} href={`/anc/participants/${encodeURIComponent(reg.id)}`}>
                                    <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 ring-1 ring-border mb-4 space-y-4 active:scale-95 transition-all">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-black text-base tracking-tight">{reg.name}</h3>
                                                <IdBadge id={reg.participantId} hideLabel className="mt-1" />
                                            </div>
                                            <Badge variant="outline" className="text-[9px] font-black uppercase bg-white border-2">
                                                {safeFormatDateLocal(reg.createdAt).split(',')[0]}
                                            </Badge>
                                        </div>
                                        <div className="flex gap-1.5">
                                            {[1, 2, 3, 4].map(num => {
                                                const isDone = num === 1 || (reg as any)[`survey${num}_completed`];
                                                return (
                                                    <div key={num} className={cn(
                                                        "h-6 px-2.5 min-w-[32px] flex items-center justify-center rounded-lg border text-[9px] font-black",
                                                        isDone ? "bg-primary border-primary text-white" : "bg-white border-slate-200 text-slate-300"
                                                    )}>
                                                        S{num}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                        <ScrollArea className="hidden md:block h-[600px] w-full">
                            <Table>
                                <TableHeader className="bg-slate-50/80 sticky top-0 z-20 backdrop-blur-md shadow-sm border-b">
                                    <TableRow>
                                        <TableHead className="text-[10px] font-black uppercase tracking-[0.3em] pl-8 w-24">Actions</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-[0.3em]">ID Ref</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-[0.3em]">Name</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-[0.3em]">Phase Status</TableHead>
                                        <TableHead className="text-right text-[10px] font-black uppercase tracking-[0.3em] pr-8">Recorded</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredItems.visible.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-40 text-slate-400 italic font-black uppercase tracking-[0.4em] text-sm opacity-20">No matching records</TableCell>
                                        </TableRow>
                                    ) : (
                                        <>
                                            {filteredItems.visible.map((reg) => (
                                                <TableRow key={reg.id} className="group transition-all duration-300 hover:bg-primary/[0.03] border-l-4 border-l-transparent hover:border-l-primary/50 border-b border-border/40 cursor-pointer">
                                                    <TableCell className="pl-8 py-5">
                                                        <div className="flex items-center gap-2">
                                                            <Button asChild variant="secondary" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/20 bg-white dark:bg-slate-800 shadow-sm border-none">
                                                                <Link href={`/anc/participants/${encodeURIComponent(reg.id)}`}><Eye className="h-4 w-4 text-primary" /></Link>
                                                            </Button>

                                                            {isAdmin && (
                                                                <>
                                                                    <Button 
                                                                        variant="secondary" 
                                                                        size="icon" 
                                                                        className="h-9 w-9 rounded-xl hover:bg-amber-100 text-amber-600 bg-white dark:bg-slate-800 shadow-sm border-none"
                                                                        onClick={(e) => { e.stopPropagation(); setEditingParticipant(reg); }}
                                                                    >
                                                                        <Pencil className="h-4 w-4" />
                                                                    </Button>

                                                                    <AlertDialog>
                                                                        <AlertDialogTrigger asChild>
                                                                            <Button 
                                                                                variant="secondary" 
                                                                                size="icon" 
                                                                                className="h-9 w-9 rounded-xl hover:bg-rose-100 text-rose-600 bg-white dark:bg-slate-800 shadow-sm border-none"
                                                                                onClick={(e) => e.stopPropagation()}
                                                                            >
                                                                                <Trash2 className="h-4 w-4" />
                                                                            </Button>
                                                                        </AlertDialogTrigger>
                                                                        <AlertDialogContent className="rounded-[2.5rem] border-none shadow-4xl">
                                                                            <AlertDialogHeader>
                                                                                <AlertDialogTitle className="font-black text-2xl tracking-tighter">Purge Data Record?</AlertDialogTitle>
                                                                                <AlertDialogDescription className="text-sm font-medium text-slate-500 mt-2">
                                                                                    Permanently remove <span className="font-black text-rose-600">{reg.name}</span> from the registry? This action is irreversible.
                                                                                </AlertDialogDescription>
                                                                            </AlertDialogHeader>
                                                                            <AlertDialogFooter className="mt-8">
                                                                                <AlertDialogCancel className="rounded-xl text-[10px] font-black uppercase tracking-widest h-12">Discard</AlertDialogCancel>
                                                                                <AlertDialogAction 
                                                                                    onClick={() => handleDeleteParticipant(reg.id)}
                                                                                    className="bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest h-12 hover:bg-rose-700"
                                                                                >
                                                                                    Finalize Purge
                                                                                </AlertDialogAction>
                                                                            </AlertDialogFooter>
                                                                        </AlertDialogContent>
                                                                    </AlertDialog>
                                                                </>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-5">
                                                        <IdBadge id={reg.participantId} hideLabel className="scale-95 origin-left" />
                                                    </TableCell>
                                                    <TableCell className="font-black text-sm text-slate-800 dark:text-slate-200">{reg.name}</TableCell>
                                                    <TableCell>
                                                        <div className="flex gap-1.5">
                                                            {[1, 2, 3, 4].map(num => {
                                                                const isDone = num === 1 || (reg as any)[`survey${num}_completed`];
                                                                return (
                                                                    <div 
                                                                        key={num} 
                                                                        className={cn(
                                                                            "h-6 px-2.5 min-w-[32px] flex items-center justify-center rounded-lg border text-[9px] font-black transition-all",
                                                                            isDone ? "bg-primary border-primary text-white shadow-md shadow-primary/20" : "bg-muted/30 border-transparent text-muted-foreground/30"
                                                                        )}
                                                                    >
                                                                        S{num}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right pr-8 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]" suppressHydrationWarning>
                                                        {safeParseDate(reg.createdAt) ? format(safeParseDate(reg.createdAt)!, 'dd MMM yy') : 'Historical'}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            <TableRow>
                                                <TableCell colSpan={5} className="py-16 bg-primary/[0.01]">
                                                    <div className="flex flex-col items-center justify-center gap-4 text-center grayscale opacity-30">
                                                        <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center shadow-xl">
                                                            <CheckCircle2 className="h-7 w-7 text-white" />
                                                        </div>
                                                        <p className="text-[11px] font-black uppercase tracking-[0.5em] text-primary">Registry Feed End</p>
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

                <Card className="lg:col-span-4 border-none ring-1 ring-border shadow-sm bg-white dark:bg-card rounded-[2rem] overflow-hidden">
                    <CardHeader className="bg-primary/5 border-b p-6 md:p-8">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2 text-primary font-black uppercase tracking-[0.3em] text-[10px]"><Target className="h-4 w-4" /> Reach Target</div>
                            <Badge className="bg-primary text-white border-none font-black text-xs h-7 px-4 rounded-xl shadow-lg shadow-primary/20">{Math.round((registrations?.length || 0) / TOTAL_TARGET * 100)}%</Badge>
                        </div>
                        <CardTitle className="text-2xl font-black tracking-tight leading-none">Clinical Site Reach</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="h-[600px] w-full">
                            <div className="p-6 md:p-8 space-y-6">
                                {facilityStats.map((fac, i) => (
                                    <div key={i} className="space-y-3 group">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black tracking-[0.2em] text-slate-700 dark:text-slate-300 uppercase truncate max-w-[200px]">{fac.name.split(' (')[0]}</span>
                                            <span className="text-[10px] font-black text-primary bg-primary/10 px-2.5 py-1 rounded-lg ring-1 ring-primary/20">
                                                {fac.enrolled} / {fac.target}
                                            </span>
                                        </div>
                                        <div className="relative h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 shadow-inner overflow-hidden border border-black/5">
                                            <motion.div 
                                                initial={{ width: 0 }}
                                                animate={{ width: `${fac.percentage}%` }}
                                                transition={{ duration: 1, delay: i * 0.05 }}
                                                className={cn(
                                                    "absolute top-0 left-0 h-full rounded-full transition-all shadow-[0_0_12px_rgba(16,185,129,0.4)]",
                                                    fac.percentage > 80 ? "bg-emerald-500" : fac.percentage > 40 ? "bg-primary" : "bg-cyan-500"
                                                )}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>

            {editingParticipant && (
                <Dialog open={!!editingParticipant} onOpenChange={(open) => !open && setEditingParticipant(null)}>
                    <DialogContent className="sm:max-w-xl rounded-[2.5rem] border-none shadow-4xl p-0 overflow-hidden bg-background">
                        <DialogHeader className="p-8 bg-primary/[0.03] border-b">
                            <div className="flex items-center gap-4">
                                <div className="p-3.5 bg-white rounded-2xl shadow-xl ring-1 ring-primary/10"><Pencil className="h-6 w-6 text-primary" /></div>
                                <div>
                                    <DialogTitle className="text-2xl font-black tracking-tighter">Edit Profile Dossier</DialogTitle>
                                    <DialogDescription className="text-[10px] font-black uppercase tracking-[0.4em] opacity-60 mt-1">Audit Mode: {editingParticipant.name}</DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>
                        <ScrollArea className="max-h-[80vh] p-8">
                            <AncRegistrationForm 
                                editMode={true} 
                                initialData={editingParticipant} 
                                onOpenChange={(val) => !val && setEditingParticipant(null)} 
                            />
                        </ScrollArea>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
