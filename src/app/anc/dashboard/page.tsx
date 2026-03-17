
"use client";
import { FACILITY_TARGETS, getFacilityProgress } from '@/lib/facility-targets';

import { Separator } from '@/components/ui/separator';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMutation } from '@tanstack/react-query';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, deleteDoc, writeBatch, getDocs, query, orderBy } from 'firebase/firestore';
import { 
  Loader2, UserPlus, Search, Hospital, Eye, Pencil, Trash2, 
  ShieldCheck, Activity, ChevronRight, ChevronDown,
  Users2, UserCheck, Baby, Heart, Calendar, History,
  Building2, Database, Users, LayoutList, MapPin, Phone,
  RefreshCcw
} from 'lucide-react';
import Link from "next/link";
import { format, isValid, formatDistanceToNow } from 'date-fns';
import type { AncRegistration } from "@/types";
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

export default function AncDashboardPage() {
    const { toast } = useToast();
    const firestore = useFirestore();
    const { user: fbUser } = useUser();

    const [userRole, setUserRole] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingParticipant, setEditingParticipant] = useState<AncRegistration | null>(null);
    const [selectedParticipant, setSelectedParticipant] = useState<AncRegistration | null>(null);
    const [displayLimit, setDisplayLimit] = useState(15);

    const isAdmin = userRole === 'admin';
    const isViewer = userRole === 'viewer';

    const registrationsQuery = useMemoFirebase(() => {
        if (!firestore || !fbUser) return null;
        return query(collection(firestore, 'anc_registrations'));
    }, [firestore, fbUser]);

    const { data: rawRegistrations, isLoading } = useCollection<AncRegistration>(registrationsQuery);
    
    useEffect(() => {
        const userStr = localStorage.getItem('ancUser');
        if (userStr) {
            const user = JSON.parse(userStr);
            setUserRole(user.role);
        }
    }, []);

    // Stabilized & Sorted Registrations
    const registrations = useMemo(() => {
        if (!rawRegistrations) return [];
        return [...rawRegistrations].sort((a, b) => {
            const dA = safeParseDate(a)?.getTime() || 0;
            const dB = safeParseDate(b)?.getTime() || 0;
            return dB - dA;
        });
    }, [rawRegistrations]);

    // Performance Optimization: Map counts by exact facility key
    const facilityTargetCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        if (!registrations) return counts;
        registrations.forEach(r => {
            if (r && r.healthFacility) {
                counts[r.healthFacility] = (counts[r.healthFacility] || 0) + 1;
            }
        });
        return counts;
    }, [registrations]);

    const facilityEnrollmentTicker = useMemo(() => {
        if (!registrations) return [];
        const counts: Record<string, number> = {};
        registrations.forEach(r => {
            if (!r) return;
            const name = r.healthFacility?.split(' (')[0] || 'Unknown';
            counts[name] = (counts[name] || 0) + 1;
        });
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .map(([name, count]) => ({ name, count }));
    }, [registrations]);

    const stats = useMemo(() => {
        if (!registrations || registrations.length === 0) return { totalEnrolled: 0, siteCount: 0, avgAge: 0 };
        const totalEnrolled = registrations.length;
        const siteSet = new Set(registrations.map(r => r.healthFacility || 'Unknown'));
        const avgAge = (registrations.reduce((sum, r) => sum + (r.age || 0), 0) / totalEnrolled).toFixed(1);
        
        return { totalEnrolled, siteCount: siteSet.size, avgAge };
    }, [registrations]);

    const filteredItems = useMemo(() => {
        if (!registrations) return { visible: [], total: 0 };
        const lower = searchTerm.toLowerCase();
        const filtered = registrations.filter(reg => {
            if (!reg) return false;
            const matchesName = reg.name?.toLowerCase().includes(lower);
            const matchesId = reg.participantId?.toLowerCase().includes(lower);
            const matchesPhone = Array.isArray(reg.phoneNumber) 
                ? reg.phoneNumber.some(p => p?.toLowerCase()?.includes(lower)) 
                : (reg.phoneNumber as string)?.toLowerCase()?.includes(lower);
            return matchesName || matchesId || matchesPhone;
        });
        return {
            visible: filtered.slice(0, displayLimit),
            total: filtered.length
        };
    }, [registrations, searchTerm, displayLimit]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Compiling Cohort Intelligence...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-[1600px] mx-auto pb-24 lg:pb-12">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 px-4 md:px-0">
                <div>
                    <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-[9px] mb-1">
                        <ShieldCheck className="h-4 w-4" /> Management Control Center
                    </div>
                    <div className="flex items-center gap-4">
                        <h1 className="text-4xl font-black tracking-tighter">Cohort Registry</h1>
                        <Badge variant="outline" className="h-8 px-3 rounded-xl border-none font-black text-sm bg-primary/5 text-primary">
                            {registrations?.length || 0} Verified Records
                        </Badge>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {!isViewer && (
                        <Button asChild className="h-12 px-6 rounded-xl font-black uppercase tracking-widest shadow-xl shadow-primary/20">
                            <Link href="/anc/register"><UserPlus className="mr-2 h-5 w-5" /> Register Participant</Link>
                        </Button>
                    )}
                </div>
            </div>
            
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4 px-4 md:px-0">
                {[
                    { label: "Total Enrolled", value: stats.totalEnrolled, icon: UserCheck, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20", desc: "Biological Population" },
                    { label: "Active Sites", value: stats.siteCount, icon: Hospital, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20", desc: "Clinical Reach" },
                    { label: "Avg. Age", value: stats.avgAge, icon: Heart, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-900/20", desc: "Cohort Demographics" },
                    { label: "Registry Status", value: "Live", icon: Activity, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20", desc: "Audit Active" },
                ].map((stat, i) => (
                    <Card key={i} className="border-none ring-1 ring-border shadow-none overflow-hidden hover:ring-primary/40 transition-all">
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

            {/* Global Registry Feed Ticker */}
            {facilityEnrollmentTicker.length > 0 && (
                <div className="px-4 md:px-0">
                    <Dialog>
                        <DialogTrigger asChild>
                            <div className="relative overflow-hidden bg-primary/5 rounded-[2rem] py-4 shadow-none group cursor-pointer hover:bg-primary/10 transition-colors">
                                <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-background to-transparent z-10 opacity-50 pointer-events-none" />
                                <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background to-transparent z-10 opacity-50 pointer-events-none" />
                                
                                <div className="flex items-center px-6 mb-2">
                                    <Badge variant="secondary" className="bg-primary/10 text-primary border-none font-black text-[8px] uppercase tracking-widest gap-1.5 py-0 h-4 shadow-none">
                                        <Database className="h-2 w-2" /> Global Registry Feed • Click to Expand Site Details
                                    </Badge>
                                </div>

                                <motion.div 
                                    className="flex whitespace-nowrap gap-12 items-center"
                                    animate={{ x: ["-100%", "0%"] }}
                                    transition={{
                                        ease: "linear",
                                        duration: 40,
                                        repeat: Infinity,
                                    }}
                                >
                                    {[...facilityEnrollmentTicker, ...facilityEnrollmentTicker].map((f, i) => (
                                        <div key={i} className="flex items-center gap-3">
                                            <Building2 className="h-3.5 w-3.5 text-primary opacity-40" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{f.name}</span>
                                            <div className="px-3 py-1 bg-background rounded-full shadow-sm flex items-center gap-2">
                                                <Users className="h-3 w-3 text-primary" />
                                                <span className="text-xs font-black text-primary">{f.count}</span>
                                            </div>
                                        </div>
                                    ))}
                                </motion.div>
                            </div>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-xl rounded-[2.5rem] border-none shadow-2xl overflow-hidden p-0 bg-background">
                            <DialogHeader className="p-8 bg-primary/5 border-b">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-primary/10 rounded-xl text-primary">
                                        <LayoutList className="h-5 w-5" />
                                    </div>
                                    <DialogTitle className="text-2xl font-black tracking-tight">Clinical Site Distribution</DialogTitle>
                                </div>
                                <DialogDescription className="font-bold uppercase tracking-widest text-[10px] text-slate-500">
                                    Verified Registry Counts by Facility (Total: {stats.totalEnrolled})
                                </DialogDescription>
                            </DialogHeader>
                            <ScrollArea className="max-h-[60vh]">
                                <div className="p-6 grid gap-2">
                                    {facilityEnrollmentTicker.map((f, i) => (
                                        <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 hover:bg-primary/5 transition-all group">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 rounded-xl bg-background flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                                    <MapPin className="h-5 w-5 text-primary/60" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black uppercase tracking-tight text-slate-700">{f.name}</p>
                                                    <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">Temeke Municipality</p>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <Badge className="bg-primary text-white border-none font-black text-xs px-3 shadow-none">
                                                    {f.count} Women
                                                </Badge>
                                                <p className="text-[8px] font-black uppercase tracking-widest text-primary/40 mt-1">Registry Verified</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                            <DialogFooter className="p-6 bg-muted/30 border-t">
                                <p className="text-[9px] font-bold text-muted-foreground italic text-center w-full">
                                    Data is real-time from the Global Registry Feed.
                                </p>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-4 md:px-0">
                {/* Facility Enrollment Tracker (Moved up for mobile visibility) */}
                <Card className="lg:col-span-5 lg:order-last border-none ring-1 ring-border shadow-none rounded-[2.5rem] overflow-hidden bg-card h-fit lg:sticky lg:top-24">
                    <CardHeader className="bg-blue-50/50 dark:bg-blue-900/10 border-b py-6 px-8">
                        <div className="flex items-center gap-3 mb-1">
                            <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-600/20">
                                <Building2 className="h-4 w-4" />
                            </div>
                            <CardTitle className="text-xl font-black tracking-tight">Facility Targets</CardTitle>
                        </div>
                        <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60">Real-time enrollment vs site projections</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="max-h-[calc(100vh-25rem)] lg:max-h-[calc(100vh-20rem)]">
                            <div className="p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-x-10 gap-y-5">
                                {Object.entries(FACILITY_TARGETS).map(([facility, target]) => {
                                    const enrolled = facilityTargetCounts[facility] || 0;
                                    const { remaining, percentage, isFull } = getFacilityProgress(facility, enrolled);
                                    
                                    return (
                                        <div key={facility} className="space-y-2 group p-2 -m-2 rounded-2xl transition-all duration-300 hover:bg-primary/[0.03] hover:translate-x-1">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 truncate max-w-[70%]">
                                                    <div className={cn(
                                                        "w-1 h-4 rounded-full transition-all duration-500 group-hover:h-6 group-hover:w-1.5 shadow-sm",
                                                        isFull ? "bg-red-500 shadow-red-500/20" : percentage >= 80 ? "bg-amber-500 shadow-amber-500/20" : "bg-emerald-500 shadow-emerald-500/20"
                                                    )} />
                                                    <span className="text-[10px] font-black uppercase tracking-tight text-slate-600 dark:text-slate-400 truncate group-hover:text-foreground transition-colors">
                                                        {facility.replace(/ \(Zone [A-D]\)/, '')}
                                                    </span>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <span className={cn(
                                                        "text-[10px] font-black transition-all group-hover:scale-110 block",
                                                        isFull ? "text-red-600" : (remaining !== null && remaining <= 5) ? "text-amber-600" : "text-emerald-600"
                                                    )}>
                                                        {isFull ? 'FULL' : `${enrolled}/${target}`}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="h-2 bg-muted rounded-full overflow-hidden shadow-inner relative group-hover:h-2.5 transition-all">
                                                <div 
                                                    className={cn(
                                                        "h-full rounded-full transition-all duration-1000 ease-out",
                                                        isFull ? "bg-red-500" : percentage >= 80 ? "bg-amber-500" : "bg-emerald-500"
                                                    )} 
                                                    style={{ width: `${Math.min(percentage, 100)}%` }} 
                                                />
                                                {percentage > 0 && percentage < 100 && (
                                                    <div className="absolute top-0 right-0 h-full w-4 bg-gradient-to-r from-transparent to-white/20 animate-pulse" />
                                                )}
                                            </div>
                                            {remaining !== null && remaining > 0 && remaining <= 5 && (
                                                <p className="text-[8px] font-bold text-amber-600 uppercase tracking-tighter animate-pulse">
                                                    Critical: Only {remaining} spots remaining
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </ScrollArea>
                        <div className="p-6 bg-muted/20 border-t flex items-center justify-between">
                            <div className="text-center flex-1">
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Global Target Reach</p>
                                <div className="text-xl font-black tracking-tighter text-primary">
                                    {Math.round(((registrations?.length || 0) / 1148) * 100)}%
                                </div>
                            </div>
                            <div className="w-px h-8 bg-border" />
                            <div className="text-center flex-1">
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Active Sites</p>
                                <div className="text-xl font-black tracking-tighter text-blue-600">
                                    {facilityEnrollmentTicker.length}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Main Registry Feed */}
                <Card className="lg:col-span-7 border-none ring-1 ring-border shadow-none overflow-hidden bg-card rounded-[2.5rem]">
                    <CardHeader className="bg-primary/5 border-b py-6 px-8">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                            <div>
                                <CardTitle className="text-2xl font-black tracking-tight flex items-center gap-2">
                                    Registry Feed
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                </CardTitle>
                                <CardDescription className="text-xs font-bold uppercase tracking-widest opacity-60">Audit-ready clinical dataset</CardDescription>
                            </div>
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <div className="relative flex-1 sm:w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input 
                                        placeholder="Search name, ID or phone..." 
                                        className="pl-10 h-11 rounded-2xl border-none bg-background/50 focus:bg-background ring-1 ring-border transition-all font-medium" 
                                        value={searchTerm} 
                                        onChange={(e) => setSearchTerm(e.target.value)} 
                                    />
                                </div>
                                <Button variant="secondary" size="icon" className="h-11 w-11 rounded-2xl bg-background/50 shadow-none border-none hover:bg-background">
                                    <RefreshCcw className="h-4 w-4 text-muted-foreground" />
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-muted/30 sticky top-0 z-10 backdrop-blur-sm border-b">
                                <TableRow className="hover:bg-transparent border-none">
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest pl-8 w-28">Controls</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Participant ID</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Name</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Facility</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Contact</TableHead>
                                    <TableHead className="text-right text-[10px] font-black uppercase tracking-widest pr-8">Date Recorded</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredItems.visible.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-32 text-muted-foreground italic font-medium">
                                            <div className="flex flex-col items-center gap-4">
                                                <Users className="h-12 w-12 opacity-10" />
                                                <p className="text-sm">No registrations match your clinical query.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredItems.visible.map((reg) => (
                                        <TableRow key={reg.id} className="group transition-colors hover:bg-muted/20 border-b border-border/50 last:border-none">
                                            <TableCell className="pl-8 py-4 flex items-center gap-2">
                                                <Dialog open={selectedParticipant?.id === reg.id} onOpenChange={(open) => !open && setSelectedParticipant(null)}>
                                                    <DialogTrigger asChild>
                                                        <Button variant="secondary" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary bg-background shadow-sm border-none transition-all group-hover:scale-105" onClick={() => setSelectedParticipant(reg)}>
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="sm:max-w-2xl rounded-[2.5rem] border-none shadow-2xl overflow-hidden p-0 bg-background">
                                                        <DialogHeader className="p-8 bg-primary/5 border-b">
                                                            <DialogTitle className="text-2xl font-black tracking-tight">Participant Profile</DialogTitle>
                                                            <DialogDescription className="font-bold uppercase tracking-widest text-[10px] flex items-center gap-2">
                                                                ID: {reg.participantId}
                                                                {reg.is_edited && <Badge className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 py-0 h-4 ml-2 shadow-none border-none">History Active</Badge>}
                                                            </DialogDescription>
                                                        </DialogHeader>
                                                        <ScrollArea className="max-h-[60vh]">
                                                            <div className="p-8 space-y-8">
                                                                <div className="grid grid-cols-2 gap-8 text-sm">
                                                                    <div className="space-y-4">
                                                                        <div>
                                                                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1">Full Name</label>
                                                                            <div className="font-extrabold text-lg">{reg.name}</div>
                                                                        </div>
                                                                        <div>
                                                                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1">Clinical Bio</label>
                                                                            <div className="font-bold">{reg.age} yrs • {reg.maritalStatus}</div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="space-y-4">
                                                                        <div>
                                                                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1">Gestational Age</label>
                                                                            <Badge className="bg-primary/10 text-primary border-none font-black shadow-none">{reg.gestationalAge} Weeks</Badge>
                                                                        </div>
                                                                        <div>
                                                                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1">Facility</label>
                                                                            <div className="font-bold text-slate-600 dark:text-slate-400">{reg.healthFacility || 'Not Recorded'}</div>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-6 pt-6 border-t border-dashed">
                                                                    <div className="space-y-2">
                                                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                                                            <Phone className="h-3 w-3" /> Woman's Contact Number(s)
                                                                        </label>
                                                                        <div className="flex flex-wrap gap-2">
                                                                            {Array.isArray(reg.phoneNumber) ? reg.phoneNumber.map((num, i) => (
                                                                                <Badge key={i} variant="secondary" className="font-mono font-bold text-xs px-3 py-1 bg-muted/50 border-none shadow-none">
                                                                                    {num}
                                                                                </Badge>
                                                                            )) : (
                                                                                <Badge variant="secondary" className="font-mono font-bold text-xs px-3 py-1 bg-muted/50 border-none shadow-none">
                                                                                    {reg.phoneNumber || 'None'}
                                                                                </Badge>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    <div className="grid grid-cols-2 gap-8 text-sm">
                                                                        <div>
                                                                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1">Next of Kin Name</label>
                                                                            <div className="font-bold">{reg.nextOfKinName || 'Not Recorded'}</div>
                                                                        </div>
                                                                        <div>
                                                                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1">Alternative Contact</label>
                                                                            <div className="font-bold text-slate-600 dark:text-slate-400 font-mono">{reg.alternativeContact || 'Not Recorded'}</div>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {reg.edit_history && reg.edit_history.length > 0 && (
                                                                    <div className="space-y-4 pt-6 border-t border-dashed">
                                                                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">
                                                                            <History className="h-3.5 w-3.5" /> Data Correction History
                                                                        </div>
                                                                        <div className="space-y-3">
                                                                            {reg.edit_history.map((h, hi) => (
                                                                                <div key={hi} className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 text-[11px]">
                                                                                    <div className="flex justify-between mb-2 font-bold text-amber-800 dark:text-amber-400">
                                                                                        <span>Modified by {h.edited_by}</span>
                                                                                        <span suppressHydrationWarning>
                                                                                            {(() => {
                                                                                                const d = safeParseDate(h.edited_at);
                                                                                                return d ? formatDistanceToNow(d, { addSuffix: true }) : 'Historical';
                                                                                            })()}
                                                                                        </span>
                                                                                    </div>
                                                                                    <div className="space-y-1 opacity-80">
                                                                                        {Object.entries(h.changes || {}).map(([field, delta]: any) => (
                                                                                            <div key={field} className="flex gap-2">
                                                                                                <span className="font-black uppercase text-[8px] w-20">{field}:</span>
                                                                                                <span className="line-through text-slate-400">{delta.before}</span>
                                                                                                <ChevronRight className="h-3 w-3 text-amber-600" />
                                                                                                <span className="font-black text-amber-700 dark:text-amber-300">{delta.after}</span>
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </ScrollArea>
                                                        {isAdmin && (
                                                            <DialogFooter className="p-8 bg-muted/30 dark:bg-muted/10 border-t sm:justify-start">
                                                                <Button variant="outline" className="rounded-xl font-bold h-12 bg-background shadow-sm border-none" onClick={() => { setSelectedParticipant(null); setEditingParticipant(reg); }}>
                                                                    <Pencil className="mr-2 h-4 w-4" /> Correct Record
                                                                </Button>
                                                            </DialogFooter>
                                                        )}
                                                    </DialogContent>
                                                </Dialog>

                                                {isAdmin && (
                                                    <Button variant="secondary" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary bg-background shadow-sm border-none transition-all group-hover:scale-105" onClick={() => setEditingParticipant(reg)}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </TableCell>
                                            <TableCell className="font-mono text-[10px] font-bold text-slate-500">
                                                {reg.participantId}
                                                {reg.is_edited && <Badge className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 py-0 h-3 ml-2 text-[7px] border-none shadow-none">EDITED</Badge>}
                                            </TableCell>
                                            <TableCell className="font-extrabold text-sm">{reg.name}</TableCell>
                                            <TableCell className="text-[10px] font-black text-muted-foreground uppercase truncate max-w-[140px]">{reg.healthFacility?.replace(/ \(Zone [A-D]\)/, '') || 'Unknown'}</TableCell>
                                            <TableCell className="font-mono text-[10px] font-bold text-primary">
                                                {Array.isArray(reg.phoneNumber) ? reg.phoneNumber[0] : reg.phoneNumber || 'None'}
                                            </TableCell>
                                            <TableCell className="text-right pr-8 text-[10px] font-black uppercase text-slate-500" suppressHydrationWarning>
                                                {(() => {
                                                    const d = safeParseDate(reg);
                                                    return d ? formatDistanceToNow(d, { addSuffix: true }) : 'Historical';
                                                })()}
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
                                    className="font-black uppercase tracking-widest text-[10px] gap-2 bg-background hover:bg-primary/5 h-12 px-10 rounded-2xl shadow-sm border-none transition-all hover:scale-105"
                                >
                                    View More Records ({filteredItems.total - displayLimit} remaining) <ChevronDown className="h-3 w-3" />
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {editingParticipant && (
                <Dialog open={!!editingParticipant} onOpenChange={(open) => !open && setEditingParticipant(null)}>
                    <DialogContent className="sm:max-w-2xl rounded-[2.5rem] border-none shadow-2xl overflow-hidden p-0 bg-background">
                        <DialogHeader className="p-8 bg-amber-50 dark:bg-amber-900/10 border-b border-amber-100 dark:border-amber-900/20">
                            <DialogTitle className="text-xl font-black text-amber-900 dark:text-amber-400">Correct Participant Data</DialogTitle>
                            <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-amber-700/60 dark:text-amber-400/60">Audit Trail Enabled</DialogDescription>
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
