
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
  UserCheck, Heart, Trash2,
  Target
} from 'lucide-react';
import Link from "next/link";
import { format } from 'date-fns';
import type { AncRegistration } from "@/types";
import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { safeParseDate } from '@/lib/timeline/formulas';
import { IdBadge } from '@/app/anc/components/id-badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion } from 'framer-motion';

export default function AncDashboardPage() {
    const { toast } = useToast();
    const firestore = useFirestore();
    const [userRole, setUserRole] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
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
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Syncing Registry...</p>
            </div>
        );
    }

    return (
        <div className="space-y-3 pb-6 max-w-6xl mx-auto">
            <div className="flex flex-row items-center justify-between gap-4">
                <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 text-primary font-black uppercase tracking-widest text-[8px]">
                        <ShieldCheck className="h-3 w-3" /> Registry
                    </div>
                    <h1 className="text-xl font-black tracking-tighter">Cohort Population</h1>
                </div>
                <Button asChild size="sm" className="h-8 px-4 rounded-xl font-black uppercase tracking-widest text-[9px] shadow-lg shadow-primary/20">
                    <Link href="/anc/register"><UserPlus className="mr-1.5 h-3.5 w-3.5" /> Enroll</Link>
                </Button>
            </div>

            <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
                {[
                    { label: "Enrolled", value: stats?.totalEnrolled ?? 0, icon: UserCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
                    { label: "Sites", value: stats?.siteCount ?? 0, icon: Hospital, color: "text-blue-600", bg: "bg-blue-50" },
                    { label: "Avg. Age", value: `${stats?.avgAge}y`, icon: Heart, color: "text-rose-600", bg: "bg-rose-50" },
                    { label: "Mode", value: isRegCached ? "Local" : "Live", icon: isRegCached ? Activity : ShieldCheck, color: "text-amber-600", bg: "bg-amber-50" },
                ].map((stat, i) => (
                    <Card key={i} className="border-none ring-1 ring-border shadow-sm rounded-xl overflow-hidden bg-white dark:bg-card">
                        <CardHeader className="p-2 pb-0 flex flex-row items-center justify-between space-y-0">
                            <span className="text-[7px] font-black text-muted-foreground uppercase tracking-widest truncate">{stat.label}</span>
                            <div className={`p-1 rounded-lg ${stat.bg} ${stat.color}`}><stat.icon className="h-3 w-3" /></div>
                        </CardHeader>
                        <CardContent className="p-2 pt-0">
                            <div className="text-base font-black tracking-tighter tabular-nums">{stat.value}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
                <Card className="lg:col-span-8 border-none ring-1 ring-border shadow-sm bg-white dark:bg-card rounded-xl overflow-hidden">
                    <CardHeader className="bg-primary/5 border-b p-3 flex flex-row items-center justify-between gap-4">
                        <div className="space-y-0.5">
                            <CardTitle className="text-xs font-black tracking-tight uppercase">Registry Logs</CardTitle>
                            <CardDescription className="text-[7px] font-black uppercase tracking-widest opacity-60">{registrations.length} Verified Entries</CardDescription>
                        </div>
                        <div className="relative w-40">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-primary/60" />
                            <Input 
                                placeholder="Filter..." 
                                className="pl-7 h-7 rounded-lg border-none bg-background ring-1 ring-primary/20 text-[9px] font-bold shadow-inner" 
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)} 
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="h-[400px] w-full">
                            <Table>
                                <TableHeader className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-20 shadow-sm border-b">
                                    <TableRow>
                                        <TableHead className="text-[7px] font-black uppercase tracking-widest pl-3 w-12 text-slate-400">View</TableHead>
                                        <TableHead className="text-[7px] font-black uppercase tracking-widest text-slate-400">ID</TableHead>
                                        <TableHead className="text-[7px] font-black uppercase tracking-widest text-slate-400">Name</TableHead>
                                        <TableHead className="text-[7px] font-black uppercase tracking-widest text-slate-400">Status</TableHead>
                                        <TableHead className="text-right text-[7px] font-black uppercase tracking-widest pr-3 text-slate-400">Date</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredItems.visible.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-16 text-slate-300 italic text-[9px] font-black uppercase tracking-widest">Registry Clear</TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredItems.visible.map((reg) => (
                                            <TableRow key={reg.id} className="hover:bg-primary/[0.02] border-b last:border-0 group cursor-pointer h-10">
                                                <TableCell className="pl-3 py-1">
                                                    <div className="flex items-center gap-1">
                                                        <Button asChild variant="ghost" size="icon" className="h-6 w-6 rounded-lg hover:bg-primary/10">
                                                            <Link href={`/anc/participants/${encodeURIComponent(reg.id)}`}><Eye className="h-3 w-3 text-primary" /></Link>
                                                        </Button>
                                                        {isAdmin && (
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                className="h-6 w-6 rounded-lg hover:bg-rose-50"
                                                                onClick={(e) => { e.stopPropagation(); if(confirm('Purge record?')) handleDeleteParticipant(reg.id); }}
                                                            >
                                                                <Trash2 className="h-3 w-3 text-rose-500" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-1">
                                                    <IdBadge id={reg.participantId} hideLabel className="scale-[0.65] origin-left" />
                                                </TableCell>
                                                <TableCell className="font-bold text-[11px] truncate max-w-[120px]">{reg.name}</TableCell>
                                                <TableCell>
                                                    <div className="flex gap-0.5">
                                                        {[1, 2, 3, 4].map(num => (
                                                            <div 
                                                                key={num} 
                                                                className={cn(
                                                                    "h-3.5 px-0.5 min-w-[16px] flex items-center justify-center rounded-[2px] text-[6px] font-black",
                                                                    num === 1 || (reg as any)[`survey${num}_completed`] ? "bg-primary text-white" : "bg-muted text-muted-foreground/30"
                                                                )}
                                                            >
                                                                S{num}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right pr-3 text-[8px] font-bold text-slate-400">
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
                    <CardHeader className="bg-primary/5 border-b p-3">
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1 text-primary font-black uppercase tracking-widest text-[8px]"><Target className="h-3 w-3" /> Site Coverage</div>
                            <Badge className="bg-primary text-white border-none font-black text-[8px] h-4 px-1.5 rounded-md">{Math.round((registrations?.length || 0) / TOTAL_TARGET * 100)}%</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="h-[400px] w-full">
                            <div className="p-3 space-y-3">
                                {facilityStats.map((fac, i) => (
                                    <div key={i} className="space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[7px] font-black tracking-widest text-slate-500 uppercase truncate max-w-[120px]">{fac.name.split(' (')[0]}</span>
                                            <span className="text-[8px] font-black text-primary">{fac.enrolled}/{fac.target}</span>
                                        </div>
                                        <div className="relative h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 shadow-inner overflow-hidden">
                                            <motion.div 
                                                initial={{ width: 0 }}
                                                animate={{ width: `${fac.percentage}%` }}
                                                transition={{ duration: 1, delay: i * 0.05 }}
                                                className={cn(
                                                    "absolute top-0 left-0 h-full rounded-full",
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
