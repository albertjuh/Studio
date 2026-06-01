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
  Clock,
  Calendar,
  Baby,
  ClipboardList,
  ChevronDown,
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

    return (
        <div className="space-y-4 pb-12">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shrink-0">
                <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 text-primary font-black uppercase tracking-widest text-[7px]">
                        <ShieldCheck className="h-2.5 w-2.5" /> Registry Unit
                    </div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-black tracking-tighter">Cohort Population</h1>
                        <Badge className="h-5 px-2 rounded-lg border-none font-black text-[9px] bg-primary text-white">
                            {registrations.length}
                        </Badge>
                    </div>
                </div>
                <Button asChild className="h-9 px-6 rounded-xl font-black uppercase tracking-widest text-[9px] shadow-lg shadow-primary/20 w-full md:w-auto">
                    <Link href="/anc/register"><UserPlus className="mr-1.5 h-3.5 w-3.5" /> Enroll Participant</Link>
                </Button>
            </div>

            <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
                {[
                    { label: "Total Enrolled", value: stats?.totalEnrolled ?? "...", icon: UserCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
                    { label: "Active Sites", value: stats?.siteCount ?? "...", icon: Hospital, color: "text-blue-600", bg: "bg-blue-50" },
                    { label: "Avg. Age", value: stats?.avgAge ?? "...", icon: Heart, color: "text-rose-600", bg: "bg-rose-50" },
                    { label: "Registry Mode", value: isRegCached ? "Local" : "Live", icon: isRegCached ? Activity : ShieldCheck, color: isRegCached ? "text-amber-600" : "text-emerald-600", bg: isRegCached ? "bg-amber-50" : "bg-emerald-50" },
                ].map((stat, i) => (
                    <Card key={i} className="border-none ring-1 ring-border shadow-sm rounded-xl overflow-hidden bg-card/60 backdrop-blur-sm group hover:ring-primary/40 transition-all">
                        <CardHeader className="p-3 pb-0 flex flex-row items-center justify-between space-y-0">
                            <span className="text-[7px] font-black text-muted-foreground uppercase tracking-widest truncate">{stat.label}</span>
                            <div className={`p-1 rounded-lg ${stat.bg} ${stat.color} hidden sm:flex`}><stat.icon className="h-3 w-3" /></div>
                        </CardHeader>
                        <CardContent className="p-3 pt-0.5">
                            <div className="text-lg font-black tracking-tighter">{stat.value}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                <Card className="lg:col-span-8 border-none ring-1 ring-border shadow-sm overflow-hidden bg-card/60 backdrop-blur-sm rounded-[1.5rem] border-t-2 border-t-primary">
                    <CardHeader className="bg-primary/5 border-b p-3 flex flex-col sm:flex-row justify-between items-center gap-3">
                        <div className="space-y-0.5 text-center sm:text-left">
                            <CardTitle className="text-base font-black tracking-tight leading-none">Verified Registry Feed</CardTitle>
                            <CardDescription className="text-[7px] font-bold uppercase tracking-widest opacity-60">Audit-ready clinical dataset</CardDescription>
                        </div>
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-primary" />
                            <Input 
                                placeholder="Search registry..." 
                                className="pl-8 h-8 rounded-xl border-none bg-background focus:bg-background ring-1 ring-primary/20 font-bold text-[10px] shadow-sm" 
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)} 
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="h-[450px] w-full">
                            <Table>
                                <TableHeader className="bg-muted/30 sticky top-0 z-20 backdrop-blur-md shadow-sm border-b">
                                    <TableRow>
                                        <TableHead className="text-[7px] font-black uppercase tracking-widest pl-4 w-20">Controls</TableHead>
                                        <TableHead className="text-[7px] font-black uppercase tracking-widest">ID Ref</TableHead>
                                        <TableHead className="text-[7px] font-black uppercase tracking-widest">Name</TableHead>
                                        <TableHead className="text-[7px] font-black uppercase tracking-widest">S-Status</TableHead>
                                        <TableHead className="text-right text-[7px] font-black uppercase tracking-widest pr-4">Recorded</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredItems.visible.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-20 text-muted-foreground italic font-bold text-xs">No matching records.</TableCell>
                                        </TableRow>
                                    ) : (
                                        <>
                                            {filteredItems.visible.map((reg) => (
                                                <TableRow key={reg.id} className="group transition-all hover:bg-primary/[0.02] border-l-4 border-l-transparent hover:border-l-primary/50 border-b border-border/40">
                                                    <TableCell className="pl-4 py-2">
                                                        <div className="flex items-center gap-1">
                                                            <Dialog open={selectedParticipant?.id === reg.id} onOpenChange={(open) => !open && setSelectedParticipant(null)}>
                                                                <DialogTrigger asChild>
                                                                    <Button variant="secondary" size="icon" className="h-6 w-6 rounded-lg hover:bg-primary/20 bg-background shadow-sm border-none" onClick={() => setSelectedParticipant(reg)}>
                                                                        <Eye className="h-3 w-3 text-primary" />
                                                                    </Button>
                                                                </DialogTrigger>
                                                                <DialogContent className="sm:max-w-xl rounded-[2rem] p-0 overflow-hidden border-none shadow-3xl bg-background">
                                                                    <DialogHeader className="p-4 bg-primary text-white border-b">
                                                                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                                                            <div className="space-y-1">
                                                                                <p className="text-[7px] font-black uppercase tracking-[0.3em] text-white/70">Profile Dossier</p>
                                                                                <DialogTitle className="text-lg font-black tracking-tighter">{reg.name}</DialogTitle>
                                                                                <div className="flex items-center gap-2 mt-1">
                                                                                    <IdBadge id={reg.participantId} className="scale-75 origin-left" />
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </DialogHeader>
                                                                    <ScrollArea className="max-h-[60vh]">
                                                                      <div className="p-4 space-y-4">
                                                                          <div className="grid grid-cols-4 gap-2">
                                                                              <div className="p-2 bg-muted/20 rounded-xl space-y-0.5 border border-black/5">
                                                                                  <p className="text-[6px] font-black uppercase text-muted-foreground">Age</p>
                                                                                  <p className="font-black text-xs">{reg.age}y</p>
                                                                              </div>
                                                                              <div className="p-2 bg-muted/20 rounded-xl space-y-0.5 border border-black/5">
                                                                                  <p className="text-[6px] font-black uppercase text-muted-foreground">Status</p>
                                                                                  <p className="font-black text-[10px] truncate">{reg.maritalStatus}</p>
                                                                              </div>
                                                                              <div className="p-2 bg-primary/5 rounded-xl space-y-0.5 border border-primary/20">
                                                                                  <p className="text-[6px] font-black uppercase text-primary">Enroll GA</p>
                                                                                  <p className="font-black text-xs text-primary">{reg.gestationalAge}w</p>
                                                                              </div>
                                                                              <div className="p-2 bg-muted/20 rounded-xl space-y-0.5 border border-black/5">
                                                                                  <p className="text-[6px] font-black uppercase text-muted-foreground">ANC 1</p>
                                                                                  <p className="font-black text-[10px] truncate">{safeFormatDate(reg.firstAncDate).split(',')[0]}</p>
                                                                              </div>
                                                                          </div>
                                                                          <Button asChild className="w-full h-10 rounded-xl font-black uppercase tracking-widest text-[8px] bg-primary hover:bg-primary/90">
                                                                              <Link href={`/anc/participants/${encodeURIComponent(reg.id)}`} className="flex items-center justify-center gap-2">
                                                                                  Open Full Timeline <ChevronRight className="h-3 w-3" />
                                                                              </Link>
                                                                          </Button>
                                                                      </div>
                                                                    </ScrollArea>
                                                                </DialogContent>
                                                            </Dialog>

                                                            {isAdmin && (
                                                                <>
                                                                    <Button 
                                                                        variant="secondary" 
                                                                        size="icon" 
                                                                        className="h-6 w-6 rounded-lg hover:bg-amber-100 text-amber-600 bg-background shadow-sm border-none"
                                                                        onClick={() => setEditingParticipant(reg)}
                                                                    >
                                                                        <Pencil className="h-3 w-3" />
                                                                    </Button>

                                                                    <AlertDialog>
                                                                        <AlertDialogTrigger asChild>
                                                                            <Button 
                                                                                variant="secondary" 
                                                                                size="icon" 
                                                                                className="h-6 w-6 rounded-lg hover:bg-rose-100 text-rose-600 bg-background shadow-sm border-none"
                                                                            >
                                                                                <Trash2 className="h-3 w-3" />
                                                                            </Button>
                                                                        </AlertDialogTrigger>
                                                                        <AlertDialogContent className="rounded-2xl">
                                                                            <AlertDialogHeader>
                                                                                <AlertDialogTitle className="font-black text-lg">Delete Record?</AlertDialogTitle>
                                                                                <AlertDialogDescription className="text-xs">
                                                                                    Remove <span className="font-black">{reg.name}</span> from registry? This cannot be undone.
                                                                                </AlertDialogDescription>
                                                                            </AlertDialogHeader>
                                                                            <AlertDialogFooter>
                                                                                <AlertDialogCancel className="rounded-xl text-xs h-9">Cancel</AlertDialogCancel>
                                                                                <AlertDialogAction 
                                                                                    onClick={() => handleDeleteParticipant(reg.id)}
                                                                                    className="bg-rose-600 text-white rounded-xl text-xs h-9"
                                                                                >
                                                                                    Delete
                                                                                </AlertDialogAction>
                                                                            </AlertDialogFooter>
                                                                        </AlertDialogContent>
                                                                    </AlertDialog>
                                                                </>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-2">
                                                        <IdBadge id={reg.participantId} hideLabel className="scale-75 origin-left" />
                                                    </TableCell>
                                                    <TableCell className="font-black text-[10px] text-slate-800 dark:text-slate-200">{reg.name}</TableCell>
                                                    <TableCell>
                                                        <div className="flex gap-1">
                                                            {[1, 2, 3, 4].map(num => {
                                                                const isDone = num === 1 || (reg as any)[`survey${num}_completed`];
                                                                const isAttempted = (reg as any)[`survey${num}_call_attempted`];
                                                                const isUnfinished = !isDone && isAttempted;
                                                                
                                                                return (
                                                                    <Link 
                                                                        key={num} 
                                                                        href={`/anc/participants/${reg.id}`}
                                                                        className={cn(
                                                                            "h-4 px-1 min-w-[16px] flex items-center justify-center rounded-md border text-[5px] font-black transition-all hover:scale-110",
                                                                            isDone ? "bg-primary border-primary text-white shadow-sm" : 
                                                                            isUnfinished ? "bg-amber-100 border-amber-400 text-amber-700 animate-pulse" :
                                                                            "bg-muted/30 border-transparent text-muted-foreground/30"
                                                                        )}
                                                                    >
                                                                        {isDone ? `S${num}` : (isUnfinished ? "INC" : "PEND")}
                                                                    </Link>
                                                                );
                                                            })}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right pr-4 text-[7px] font-black uppercase text-slate-500" suppressHydrationWarning>
                                                        {safeParseDate(reg.createdAt) ? format(safeParseDate(reg.createdAt)!, 'dd MMM') : 'Hist.'}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            <TableRow>
                                                <TableCell colSpan={5} className="py-6 bg-primary/[0.03]">
                                                    <div className="flex flex-col items-center justify-center gap-1 text-center">
                                                        <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center shadow-md">
                                                            <CheckCircle2 className="h-3 w-3 text-white" />
                                                        </div>
                                                        <p className="text-[7px] font-bold text-primary/60 uppercase tracking-[0.2em]">Verified Data Feed End</p>
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

                <Card className="lg:col-span-4 border-none ring-1 ring-border shadow-sm overflow-hidden bg-card/60 backdrop-blur-sm rounded-[1.5rem] border-t-2 border-t-primary">
                    <CardHeader className="bg-primary/10 border-b p-3">
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5 text-primary font-black uppercase tracking-widest text-[7px]"><Target className="h-3 w-3" /> Reach</div>
                            <Badge className="bg-primary text-white border-none font-black text-[9px] h-5 px-1.5 rounded-lg">{Math.round((registrations?.length || 0) / TOTAL_TARGET * 100)}%</Badge>
                        </div>
                        <CardTitle className="text-base font-black tracking-tight">Clinical Site Reach</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="h-[450px] w-full">
                            <div className="p-3 space-y-3">
                                {facilityStats.map((fac, i) => (
                                    <div key={i} className="space-y-1 group">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[8px] font-black tracking-tight text-slate-700 dark:text-slate-300">{fac.name.split(' (')[0]}</span>
                                            <span className="text-[7px] font-black text-primary bg-primary/10 px-1 py-0.5 rounded-md">
                                                {fac.enrolled} / {fac.target} • {fac.percentage}%
                                            </span>
                                        </div>
                                        <Progress value={fac.percentage} className="h-1 rounded-full bg-muted/40 shadow-none" />
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>

            {editingParticipant && (
                <Dialog open={!!editingParticipant} onOpenChange={(open) => !open && setEditingParticipant(null)}>
                    <DialogContent className="sm:max-w-xl rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-background">
                        <DialogHeader className="p-6 bg-primary/5 border-b">
                            <DialogTitle className="text-xl font-black">Edit Participant Profile</DialogTitle>
                            <DialogDescription className="text-xs font-bold uppercase tracking-widest opacity-60">Updating administrative record for {editingParticipant.name}</DialogDescription>
                        </DialogHeader>
                        <ScrollArea className="max-h-[75vh] p-6">
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
