
"use client";

import { useMemo, useState, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy, getDocs, writeBatch } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Sector
} from 'recharts';
import { 
  UserCheck, UserX, Target, Download, 
  TrendingUp, Building2, ChevronRight, Loader2, RefreshCcw,
  ShieldCheck, Trash2, AlertCircle, Users, Database, LayoutList, MapPin
} from 'lucide-react';
import { format, subDays, isWithinInterval, startOfDay, formatDistanceToNow, isValid } from 'date-fns';
import { type RecruitmentEntry, type AncRegistration } from '@/types';
import { FACILITY_TARGETS } from '@/lib/facility-targets';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { ScrollArea } from '@/components/ui/scroll-area';

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#64748b', '#06b6d4', '#ec4899'];

/**
 * Robust Date Parser for Recruitment Dashboard
 */
const safeParseDate = (data: any): Date | null => {
  if (!data) return null;
  const dateVal = data.date || data.created_at || data.createdAt || data.updated_at;
  
  if (!dateVal) return null;
  if (dateVal instanceof Date) return dateVal;
  if (typeof dateVal.toDate === 'function') return dateVal.toDate();
  const parsed = new Date(dateVal);
  return isValid(parsed) ? parsed : null;
};

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percentage } = props;

  return (
    <g>
      <text x={cx} y={cy - 10} dy={8} textAnchor="middle" fill="#94a3b8" className="text-[10px] font-black uppercase tracking-tighter">
        {payload.name?.length > 15 ? payload.name.substring(0, 15) + '...' : payload.name || 'Unknown'}
      </text>
      <text x={cx} y={cy + 15} dy={8} textAnchor="middle" fill={fill} className="text-xl font-black tracking-tighter">
        {payload.count || 0} Women
      </text>
      <text x={cx} y={cy + 32} dy={8} textAnchor="middle" fill="#64748b" className="text-[9px] font-bold">
        {(percentage || 0).toFixed(1)}% of Attrition
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 10}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 12}
        outerRadius={outerRadius + 15}
        fill={fill}
      />
    </g>
  );
};

export default function RecruitmentAnalysisDashboard() {
  const firestore = useFirestore();
  const { user: fbUser } = useUser();
  const { toast } = useToast();
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [includeTestData, setIncludeTestData] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [dateRange] = useState({ 
    from: subDays(new Date(), 30), 
    to: new Date() 
  });

  useEffect(() => {
    const userStr = localStorage.getItem('ancUser');
    if (userStr) {
      setUserRole(JSON.parse(userStr).role);
    }
  }, []);

  const isAdmin = userRole === 'admin';

  // Queries are authentication-aware
  const recruitmentQuery = useMemoFirebase(() => {
    if (!firestore || !fbUser) return null;
    return query(collection(firestore, 'recruitment_entries'), orderBy('date', 'desc'));
  }, [firestore, fbUser]);

  const registrationsQuery = useMemoFirebase(() => {
    if (!firestore || !fbUser) return null;
    return query(collection(firestore, 'anc_registrations'));
  }, [firestore, fbUser]);

  const { data: entries, isLoading } = useCollection<RecruitmentEntry>(recruitmentQuery);
  const { data: registrations, isLoading: isRegLoading } = useCollection<AncRegistration>(registrationsQuery);

  const purgeTestData = async () => {
    if (!firestore || !isAdmin) return;
    setIsPurging(true);
    try {
        const batch = writeBatch(firestore);
        const q = query(collection(firestore, 'recruitment_entries'));
        const snap = await getDocs(q);
        
        let count = 0;
        snap.docs.forEach((d) => {
            const data = d.data();
            if (data.ra_name === 'Admin' || data.ra_name === 'Test User' || data.ra_name === 'Test') {
                batch.delete(d.ref);
                count++;
            }
        });

        if (count > 0) {
            await batch.commit();
            toast({ title: "Purge Complete", description: `Removed ${count} test entries from the database.`, variant: "success" });
        } else {
            toast({ title: "No Test Data Found", description: "The database is already clean." });
        }
    } catch (error: any) {
        toast({ title: "Purge Failed", description: error.message, variant: "destructive" });
    } finally {
        setIsPurging(false);
    }
  };

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

  const allFacilitiesWithCounts = useMemo(() => {
    return Object.entries(FACILITY_TARGETS)
      .map(([fullName, target]) => ({
        fullName,
        name: fullName.split(' (')[0],
        count: facilityTargetCounts[fullName] || 0,
        target
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [facilityTargetCounts]);

  const facilityEnrollmentTicker = useMemo(() => {
    return allFacilitiesWithCounts.filter(f => f.count > 0);
  }, [allFacilitiesWithCounts]);

  const stats = useMemo(() => {
    if (!entries) return null;

    const filtered = entries.filter(e => {
        const d = safeParseDate(e);
        if (!d) return false;
        const inRange = isWithinInterval(d, { start: startOfDay(dateRange.from), end: dateRange.to });
        if (!inRange) return false;

        if (!includeTestData) {
            const isTest = e.ra_name === 'Admin' || e.ra_name === 'Test User' || e.ra_name === 'Test';
            if (isTest) return false;
        }
        return true;
    });

    // Aggregation Logic: Collect all master and detail rows per session
    const sessionsMap: { [key: string]: { master: RecruitmentEntry | null, details: RecruitmentEntry[] } } = {};
    
    filtered.forEach(e => {
        const dStr = e.date?.toDate ? format(e.date.toDate(), 'yyyy-MM-dd') : e.date_string || 'N/A';
        const key = `${dStr}_${e.facility || 'Unknown'}_${e.ra_name}`.toLowerCase();
        
        if (!sessionsMap[key]) sessionsMap[key] = { master: null, details: [] };
        
        if (e.first_row_flag === 1) {
            sessionsMap[key].master = e;
        } else if (e.reason && e.reason !== 'None Logged') {
            sessionsMap[key].details.push(e);
        }
    });

    const uniqueSessions = Object.values(sessionsMap).map(group => {
        const master = group.master || group.details[0]; // Fallback if master row is missing
        if (!master) return null;

        const detailMissedTotal = group.details.reduce((sum, d) => sum + (Number(d.num_women) || 0), 0);
        // Discrepancy: if reasons count > session total, we adjust to reflect documented reality
        const discrepancy = Math.max(0, detailMissedTotal - (Number(master.missed) || 0));

        return {
            ...master,
            total_anc: (Number(master.total_anc) || 0) + discrepancy,
            eligible: (Number(master.eligible) || 0) + discrepancy,
            missed: (Number(master.missed) || 0) + discrepancy
        };
    }).filter(Boolean) as RecruitmentEntry[];

    const totalANC = uniqueSessions.reduce((sum, e) => sum + (Number(e.total_anc) || 0), 0);
    const totalEligible = uniqueSessions.reduce((sum, e) => sum + (Number(e.eligible) || 0), 0);
    const totalInterviewed = uniqueSessions.reduce((sum, e) => sum + (Number(e.interviewed) || 0), 0);
    const totalMissed = uniqueSessions.reduce((sum, e) => sum + (Number(e.missed) || 0), 0);
    
    const successRate = totalEligible > 0 ? (totalInterviewed / totalEligible) * 100 : 0;

    const trendMap = uniqueSessions.reduce((acc: any, e) => {
        const dDate = safeParseDate(e);
        const d = dDate ? format(dDate, 'MMM dd') : 'N/A';
        if (d === 'N/A') return acc;
        if (!acc[d]) acc[d] = { date: d, rate: 0, eligible: 0, interviewed: 0 };
        acc[d].eligible += (Number(e.eligible) || 0);
        acc[d].interviewed += (Number(e.interviewed) || 0);
        return acc;
    }, {});

    const trendData = Object.values(trendMap).map((d: any) => ({
        ...d,
        rate: d.eligible > 0 ? (d.interviewed / d.eligible) * 100 : 0
    })).reverse();

    const reasonStatsMap = filtered.reduce((acc: any, e) => {
        if (e.reason && e.reason !== 'None Logged') {
            acc[e.reason] = (acc[e.reason] || 0) + (Number(e.num_women) || 0);
        }
        return acc;
    }, {});

    const totalWomenInReasons = Object.values(reasonStatsMap).reduce((sum: number, count) => sum + (count as number), 0);
    const reasonStats = Object.entries(reasonStatsMap).map(([reason, count]) => ({
        name: reason,
        count: count as number,
        percentage: totalWomenInReasons > 0 ? ((count as number) / totalWomenInReasons) * 100 : 0
    })).sort((a, b) => b.count - a.count);

    const registryCount = registrations?.length || 0;
    const reportedTotalInterviewed = totalInterviewed;
    const hasRegistryMismatch = Math.abs(registryCount - reportedTotalInterviewed) > 0;

    return { 
        totalANC, totalEligible, totalInterviewed, totalMissed, successRate,
        reasonStats, trendData, registryCount, hasRegistryMismatch, totalWomenInReasons
    };
  }, [entries, dateRange, includeTestData, registrations]);

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  if (isLoading || isRegLoading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Synthesizing Workload Data...</p>
    </div>
  );

  if (!stats) return <div className="p-8 text-center font-bold">No recruitment data found.</div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24 lg:pb-12">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 lg:gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-[9px]">
            <ShieldCheck className="h-4 w-4" /> Workload Monitoring Unit
          </div>
          <div className="flex items-center gap-4">
            <h1 className="text-3xl lg:text-4xl font-black tracking-tighter">Workload Analysis</h1>
            <Badge className="h-8 px-3 rounded-xl border-none font-black text-sm bg-primary/5 text-primary shadow-none">
                {stats.registryCount} Enrolled Participants
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground">
            <span className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500" /> LOG SYSTEM LIVE
            </span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span suppressHydrationWarning>SYNC: {formatDistanceToNow(lastUpdate, { addSuffix: true })}</span>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <div className="flex items-center space-x-2 bg-muted/50 px-3 py-1.5 rounded-lg shadow-none">
                <Switch 
                  id="test-data" 
                  checked={includeTestData} 
                  onCheckedChange={setIncludeTestData} 
                  className="scale-75"
                />
                <Label htmlFor="test-data" className="text-[9px] font-black uppercase tracking-widest cursor-pointer">
                    {includeTestData ? "All Logs" : "Production"}
                </Label>
            </div>

            {isAdmin && (
                <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="secondary" size="sm" className="h-9 rounded-lg font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 px-3 shadow-none">
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" /> <span className="text-[10px]">Purge Tests</span>
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-2xl border-none shadow-2xl">
                    <AlertDialogHeader>
                    <AlertDialogTitle className="text-2xl font-black tracking-tight">Purge Test Entries?</AlertDialogTitle>
                    <AlertDialogDescription className="font-medium">
                        This will permanently delete workload logs entered by <span className="text-foreground font-extrabold">Admin</span> and <span className="text-foreground font-extrabold">Test User</span>.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl font-bold">Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={purgeTestData} disabled={isPurging} className="bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 border-none">
                        {isPurging ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        Purge All Test Logs
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
                </AlertDialog>
            )}

            <Button variant="secondary" size="sm" className="h-9 rounded-lg font-bold px-3 text-foreground hover:bg-muted/50 shadow-none" onClick={() => setLastUpdate(new Date())}>
                <RefreshCcw className="mr-1.5 h-3.5 w-3.5" /> <span className="text-[10px]">Refresh</span>
            </Button>
            <Button size="sm" className="h-9 rounded-lg font-bold bg-primary hover:bg-primary/90 text-white px-3 shadow-none">
                <Download className="mr-1.5 h-3.5 w-3.5" /> <span className="text-[10px]">Export Logs</span>
            </Button>
        </div>
      </div>

      <div className="space-y-4">
        {stats.hasRegistryMismatch && (
            <div className="bg-amber-50 dark:bg-amber-900/10 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center gap-3 text-amber-800 dark:text-amber-400">
                <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <Badge className="bg-amber-600 text-white border-none font-black text-[8px] uppercase shadow-none">System Logic</Badge>
                </div>
                <span className="text-[10px] font-bold">Registry Mismatch: You have {stats.registryCount} registrations in the cohort, but RAs reported interviewing {stats.totalInterviewed} women in their workload logs.</span>
            </div>
        )}

        {Math.abs(stats.totalMissed - stats.totalWomenInReasons) > 0 && (
            <div className="bg-rose-50 dark:bg-rose-900/10 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center gap-3 text-rose-800 dark:text-rose-400">
                <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <Badge className="bg-rose-600 text-white border-none font-black text-[8px] uppercase shadow-none">System Logic</Badge>
                </div>
                <span className="text-[10px] font-bold">Log Integrity Alert: Missed count ({stats.totalMissed}) does not match attrition driver sum ({stats.totalWomenInReasons}).</span>
            </div>
        )}
      </div>

      {/* Facility Ticker: Sourced from 'anc_registrations' (Ground Truth) */}
      {facilityEnrollmentTicker.length > 0 && (
        <Dialog>
            <DialogTrigger asChild>
                <div className="relative overflow-hidden bg-primary/5 rounded-[2rem] py-4 shadow-none group cursor-pointer hover:bg-primary/10 transition-colors">
                    <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-background to-transparent z-10 opacity-50 pointer-events-none" />
                    <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background to-transparent z-10 opacity-50 pointer-events-none" />
                    
                    <div className="flex items-center px-6 mb-2">
                        <Badge variant="secondary" className="bg-primary/10 text-primary border-none font-black text-[8px] uppercase tracking-widest gap-1.5 py-0 h-4 shadow-none">
                            <Database className="h-2 w-2" /> Global Registry Feed • Click to Expand
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
                        Verified Registry Counts by Facility (Total: {stats.registryCount})
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh]">
                    <div className="p-6 grid gap-2">
                        {allFacilitiesWithCounts.map((f, i) => (
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
                                        {f.count} / {f.target} Women
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
      )}

      <div className="grid gap-2 lg:gap-4 grid-cols-2 md:grid-cols-5">
        {[
          { label: "Total ANC Flow", value: stats.totalANC, icon: Building2, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20" },
          { label: "Eligible Identified", value: stats.totalEligible, icon: Target, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-900/20" },
          { label: "Reported Interviews", value: stats.totalInterviewed, icon: UserCheck, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
          { label: "Total Missed", value: stats.totalMissed, icon: UserX, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-900/20" },
          { label: "Conversion Rate", value: `${stats.successRate.toFixed(1)}%`, icon: TrendingUp, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20" },
        ].map((kpi, i) => (
          <Card key={i} className="border-none ring-1 ring-border shadow-none group hover:ring-primary/40 transition-all overflow-hidden bg-card">
            <CardHeader className="p-4 pb-0 flex flex-row items-center justify-between space-y-0">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest truncate">{kpi.label}</span>
              <div className={`p-2 rounded-xl ${kpi.bg} ${kpi.color} hidden sm:flex`}>
                <kpi.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className="text-2xl font-black tracking-tighter">{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-7 border-none ring-1 ring-border shadow-none bg-card">
          <CardHeader className="bg-primary/5 border-b py-5 px-6">
              <CardTitle className="text-xl font-black tracking-tight">Recruitment Velocity</CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60">Log-reported conversion performance over time</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[350px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.trendData}>
                  <defs>
                    <linearGradient id="colorRate" x1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 9, fontWeights: 800, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis domain={[0, 100]} hide />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', background: 'hsl(var(--card))', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', padding: '12px', color: 'hsl(var(--foreground))' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="rate" 
                    name="Conv. %"
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorRate)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-5 border-none ring-1 ring-border shadow-none bg-card">
          <CardHeader className="bg-primary/5 border-b py-5 px-6">
            <CardTitle className="text-xl font-black tracking-tight">Attrition Drivers</CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60">Barriers identified in logs (Hover for specs)</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {stats.reasonStats.length === 0 ? (
                <div className="py-12 text-center italic text-muted-foreground text-xs font-bold">No attrition reasons logged.</div>
            ) : (
                <>
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        activeShape={renderActiveShape}
                        data={stats.reasonStats}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={110}
                        paddingAngle={5}
                        dataKey="count"
                        nameKey="name"
                        onMouseEnter={onPieEnter}
                        isAnimationActive={true}
                        animationBegin={0}
                        animationDuration={800}
                      >
                        {stats.reasonStats.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={COLORS[index % COLORS.length]} 
                            stroke="none"
                            style={{ outline: 'none' }}
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-card p-4 rounded-2xl shadow-2xl border border-primary/10 ring-1 ring-black/5 animate-in fade-in zoom-in duration-200">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: payload[0].payload.fill }} />
                                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Barrier Analysis</span>
                                </div>
                                <p className="text-sm font-black text-foreground leading-tight mb-2">{payload[0].name || 'Unknown'}</p>
                                <div className="flex items-center gap-4">
                                  <div>
                                    <p className="text-[8px] font-bold text-muted-foreground uppercase">Case Load</p>
                                    <p className="text-lg font-black text-primary">{payload[0].value || 0} Women</p>
                                  </div>
                                  <div className="w-px h-8 bg-border" />
                                  <div>
                                    <p className="text-[8px] font-bold text-muted-foreground uppercase">Impact</p>
                                    <p className="text-lg font-black text-foreground opacity-80">{(stats.totalMissed > 0 ? (payload[0].value / stats.totalMissed) * 100 : 0).toFixed(1)}%</p>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="grid grid-cols-1 gap-2 mt-4">
                  {stats.reasonStats.slice(0, 4).map((r, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "flex items-center justify-between p-2 rounded-xl transition-all duration-300 border-2 border-transparent",
                        activeIndex === i ? "bg-primary/5 scale-[1.02]" : "opacity-60"
                      )}
                      onMouseEnter={() => setActiveIndex(i)}
                    >
                      <div className="flex items-center gap-2 truncate max-w-[200px]">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="truncate text-[10px] font-black text-muted-foreground uppercase tracking-tighter">{r.name || 'Unknown'}</span>
                      </div>
                      <span className="font-black text-xs text-foreground">{r.count || 0} <span className="text-muted-foreground opacity-60 text-[9px]">({(r.percentage || 0).toFixed(0)}%)</span></span>
                    </div>
                  ))}
                </div>
                </>
            )}
            <div className="pt-2">
                <Button variant="secondary" className="w-full h-12 rounded-xl text-[10px] font-black uppercase tracking-widest bg-muted/20 hover:bg-muted/40 text-foreground shadow-none" asChild>
                    <Link href="/anc/admin/recruitment/table">Full Raw Workload Dataset <ChevronRight className="ml-2 h-4 w-4" /></Link>
                </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
