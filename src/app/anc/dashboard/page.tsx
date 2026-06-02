
"use client";
import { FACILITY_TARGETS, TOTAL_TARGET } from '@/lib/facility-targets';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, deleteDoc, doc } from 'firebase/firestore';
import { 
  Loader2, UserPlus, Search, Hospital, Eye, Pencil, 
  ShieldCheck, Activity,
  UserCheck, Heart, Trash2,
  Target,
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
        } catch (error: any) {
            toast({ title: "Deletion Failed", description: error.message, variant: "destructive" });
        } finally {
            setIsDeleting(false);
        }
    };

    if (isRegLoading || registrations === null) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Syncing Data...</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 pb-6">
            <div className="flex flex-row items-center justify-between gap-4">
                <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 text-primary font-black uppercase tracking-widest text-[8px]">
                        <ShieldCheck className="h-3 w-3" /> Registry
                    </div>
                    <h1 className="text-xl font-black tracking-tighter">Cohort Population</h1>
                </div>
                <Button asChild size="sm" className="h-9 px-4 rounded-xl font-black uppercase tracking-widest text-[9px] shadow-lg shadow-primary/20">
                    <Link href="/anc/register"><UserPlus className="mr-1.5 h-3.5 w-3.5" /> Enroll</Link>
                </Button>
            </div>

            <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                {[
                    { label: "Enrolled", value: stats?.totalEnrolled ?? 0, icon: UserCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
                    { label: "Sites", value: stats?.siteCount ?? 0, icon: Hospital, color: "text-blue-600", bg: "bg-blue-50" },
                    { label: "Avg. Age", value: `${stats?.avgAge}y`, icon: Heart, color: "text-rose-600", bg: "bg-rose-50" },
                    { label: "Mode", value: isRegCached ? "Local" : "Live", icon: isRegCached ? Activity : ShieldCheck, color: "text-amber-600", bg: "bg-amber-50" },
                ].map((stat, i) => (
                    <Card key={i} className="border-none ring-1 ring-border shadow-sm rounded-xl overflow-hidden bg-white dark:bg-card">
                        <CardHeader className="p-3 pb-0 flex flex-row items-center justify-between space-y-0">
                            <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest truncate">{stat.label}</span>
                            <div className={`p-1.5 rounded-lg ${stat.bg} ${stat.color}`}><stat.icon className="h-3.5 w-3.5" /></div>
                        </CardHeader>
                        <CardContent className="p-3 pt-1">
                            <div className="text-lg font-black tracking-tighter tabular-nums">{stat.value}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                <Card className="lg:col-span-8 border-none ring-1 ring-border shadow-sm bg-white dark:bg-card rounded-xl overflow-hidden">
                    <CardHeader className="bg-primary/5 border-b p-4 flex flex-row items-center justify-between gap-4">
                        <div className="space-y-0.5">
                            <CardTitle className="text-sm font-black tracking-tight">Verified Registry</CardTitle>
                            <CardDescription className="text-[8px] font-black uppercase tracking-widest opacity-60">{registrations.length} Records</CardDescription>
                        </div>
                        <div className="relative w-48">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-primary/60" />
                            <Input 
                                placeholder="Search..." 
                                className="pl-8 h-8 rounded-lg border-none bg-background ring-1 ring-primary/20 text-[10px] font-bold shadow-inner" 
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)} 
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="h-[450px] w-full">
                            <Table>
                                <TableHeader className="bg-slate-50 sticky top-0 z-20 shadow-sm border-b">
                                    <TableRow>
                                        <TableHead className="text-[8px] font-black uppercase tracking-widest pl-4 w-16">Controls</TableHead>
                                        <TableHead className="text-[8px] font-black uppercase tracking-widest">ID</TableHead>
                                        <TableHead className="text-[8px] font-black uppercase tracking-widest">Name</TableHead>
                                        <TableHead className="text-[8px] font-black uppercase tracking-widest">Status</TableHead>
                                        <TableHead className="text-right text-[8px] font-black uppercase tracking-widest pr-4">Recorded</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredItems.visible.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-20 text-slate-300 italic text-[10px] font-black uppercase tracking-widest">No matching records</TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredItems.visible.map((reg) => (
                                            <TableRow key={reg.id} className="hover:bg-primary/[0.02] border-b last:border-0 group cursor-pointer">
                                                <TableCell className="pl-4 py-2">
                                                    <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                                        <Button asChild variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-primary/10">
                                                            <Link href={`/anc/participants/${encodeURIComponent(reg.id)}`}><Eye className="h-3.5 w-3.5 text-primary" /></Link>
                                                        </Button>
                                                        {isAdmin && (
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                className="h-7 w-7 rounded-lg hover:bg-rose-50"
                                                                onClick={(e) => { e.stopPropagation(); if(confirm('Purge?')) handleDeleteParticipant(reg.id); }}
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-2">
                                                    <IdBadge id={reg.participantId} hideLabel className="scale-75 origin-left" />
                                                </TableCell>
                                                <TableCell className="font-bold text-xs">{reg.name}</TableCell>
                                                <TableCell>
                                                    <div className="flex gap-1">
                                                        {[1, 2, 3, 4].map(num => (
                                                            <div 
                                                                key={num} 
                                                                className={cn(
                                                                    "h-4 px-1 min-w-[20px] flex items-center justify-center rounded-sm text-[7px] font-black",
                                                                    num === 1 || (reg as any)[`survey${num}_completed`] ? "bg-primary text-white" : "bg-muted text-muted-foreground/30"
                                                                )}
                                                            >
                                                                S{num}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right pr-4 text-[9px] font-bold text-slate-400">
                                                    {safeParseDate(reg.createdAt) ? format(safeParseDate(reg.createdAt)!, 'dd MMM') : '--'}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-4 border-none ring-1 ring-border shadow-sm bg-white dark:bg-card rounded-xl overflow-hidden">
                    <CardHeader className="bg-primary/5 border-b p-4">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5 text-primary font-black uppercase tracking-widest text-[8px]"><Target className="h-3 w-3" /> Progress</div>
                            <Badge className="bg-primary text-white border-none font-black text-[9px] h-4 px-2 rounded-lg">{Math.round((registrations?.length || 0) / TOTAL_TARGET * 100)}%</Badge>
                        </div>
                        <CardTitle className="text-sm font-black tracking-tight">Clinical Site Reach</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="h-[450px] w-full">
                            <div className="p-4 space-y-4">
                                {facilityStats.map((fac, i) => (
                                    <div key={i} className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[8px] font-black tracking-widest text-slate-500 uppercase truncate max-w-[140px]">{fac.name.split(' (')[0]}</span>
                                            <span className="text-[8px] font-black text-primary">{fac.enrolled}/{fac.target}</span>
                                        </div>
                                        <div className="relative h-1.5 rounded-full bg-slate-100 shadow-inner overflow-hidden">
                                            <motion.div 
                                                initial={{ width: 0 }}
                                                animate={{ width: `${fac.percentage}%` }}
                                                className={cn(
                                                    "absolute top-0 left-0 h-full rounded-full transition-all",
                                                    fac.percentage > 80 ? "bg-emerald-500" : "bg-primary"
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
        </div>
    );
}
