"use client";

import { useMemo, useState, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, getDocs, writeBatch } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  UserCheck, UserX, Target, Download, 
  TrendingUp, Building2, ChevronRight, Loader2, RefreshCcw,
  ShieldCheck, Trash2, AlertCircle, Activity
} from 'lucide-react';
import { format, subDays, isWithinInterval, startOfDay } from 'date-fns';
import { type RecruitmentEntry, type AncRegistration } from '@/types';
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
import { Badge } from '@/components/ui/badge';

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#64748b', '#06b6d4', '#ec4899'];

export default function RecruitmentAnalysisDashboard() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [includeTestData, setIncludeTestData] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
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

  const recruitmentQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'recruitment_entries'), orderBy('date', 'desc'));
  }, [firestore]);

  const registrationsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'anc_registrations');
  }, [firestore]);

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

  const stats = useMemo(() => {
    if (!entries) return null;

    const filtered = entries.filter(e => {
        const d = e.date?.toDate ? e.date.toDate() : new Date(e.date);
        const inRange = isWithinInterval(d, { start: startOfDay(dateRange.from), end: dateRange.to });
        if (!inRange) return false;

        if (!includeTestData) {
            const isTest = e.ra_name === 'Admin' || e.ra_name === 'Test User' || e.ra_name === 'Test';
            if (isTest) return false;
        }
        return true;
    });

    const sessionMap: { [key: string]: RecruitmentEntry } = {};
    filtered.forEach(e => {
        const dStr = e.date?.toDate ? format(e.date.toDate(), 'yyyy-MM-dd') : e.date_string || 'N/A';
        const key = `${dStr}_${e.facility}_${e.ra_name}`.toLowerCase();
        
        if (!sessionMap[key] || e.first_row_flag === 1) {
            sessionMap[key] = e;
        }
    });

    const uniqueSessions = Object.values(sessionMap);

    const totalANC = uniqueSessions.reduce((sum, e) => sum + (e.total_anc || 0), 0);
    const totalEligible = uniqueSessions.reduce((sum, e) => sum + (e.eligible || 0), 0);
    const totalInterviewed = uniqueSessions.reduce((sum, e) => sum + (e.interviewed || 0), 0);
    const totalMissed = uniqueSessions.reduce((sum, e) => sum + (e.missed || 0), 0);
    
    const successRate = totalEligible > 0 ? (totalInterviewed / totalEligible) * 100 : 0;

    const trendMap = uniqueSessions.reduce((acc: any, e) => {
        const d = e.date?.toDate ? format(e.date.toDate(), 'MMM dd') : format(new Date(e.date), 'MMM dd');
        if (!acc[d]) acc[d] = { date: d, rate: 0, eligible: 0, interviewed: 0 };
        acc[d].eligible += e.eligible;
        acc[d].interviewed += e.interviewed;
        return acc;
    }, {});

    const trendData = Object.values(trendMap).map((d: any) => ({
        ...d,
        rate: d.eligible > 0 ? (d.interviewed / d.eligible) * 100 : 0
    })).reverse();

    const reasonStatsMap = filtered.reduce((acc: any, e) => {
        if (e.reason && e.reason !== 'None Logged') {
            acc[e.reason] = (acc[e.reason] || 0) + (e.num_women || 0);
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

  if (isLoading || isRegLoading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Synthesizing Workload Data...</p>
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
            <h1 className="text-3xl lg:text-4xl font-black tracking-tighter">Recruitment Analysis</h1>
            <Badge variant="outline" className="h-8 px-3 rounded-xl border-2 font-black text-sm bg-primary/5 text-primary border-primary/20">
                {stats.registryCount} Enrolled Participants
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground">
            <span className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500" /> LOG SYSTEM LIVE
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span>SYNC: {format(lastUpdate, 'hh:mm a')}</span>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <div className="flex items-center space-x-2 bg-muted/50 px-3 py-1.5 rounded-lg border border-dashed">
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
                    <Button variant="outline" size="sm" className="h-9 rounded-lg font-bold border-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-100 px-3">
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" /> <span className="text-[10px]">Purge Tests</span>
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                    <AlertDialogTitle className="text-2xl font-black tracking-tight">Purge Test Entries?</AlertDialogTitle>
                    <AlertDialogDescription className="font-medium">
                        This will permanently delete workload logs entered by <span className="text-foreground font-extrabold">Admin</span> and <span className="text-foreground font-extrabold">Test User</span>.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl font-bold">Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={purgeTestData} disabled={isPurging} className="bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700">
                        {isPurging ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        Purge All Test Logs
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
                </AlertDialog>
            )}

            <Button variant="outline" size="sm" className="h-9 rounded-lg font-bold border-2 px-3 text-slate-900" onClick={() => setLastUpdate(new Date())}>
                <RefreshCcw className="mr-1.5 h-3.5 w-3.5" /> <span className="text-[10px]">Refresh</span>
            </Button>
            <Button size="sm" className="h-9 rounded-lg font-bold bg-primary hover:bg-primary/90 text-white px-3 shadow-none">
                <Download className="mr-1.5 h-3.5 w-3.5" /> <span className="text-[10px]">Export Logs</span>
            </Button>
        </div>
      </div>

      <div className="space-y-4">
        {stats.hasRegistryMismatch && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center gap-3 text-amber-800">
                <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <Badge className="bg-amber-600 text-white border-none font-black text-[8px] uppercase">System Logic</Badge>
                </div>
                <span className="text-[10px] font-bold">Registry Mismatch: You have {stats.registryCount} registrations in the cohort, but RAs reported interviewing {stats.totalInterviewed} women in their workload logs.</span>
            </div>
        )}

        {Math.abs(stats.totalMissed - stats.totalWomenInReasons) > 0 && (
            <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center gap-3 text-rose-800">
                <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <Badge className="bg-rose-600 text-white border-none font-black text-[8px] uppercase">System Logic</Badge>
                </div>
                <span className="text-[10px] font-bold">Log Integrity Alert: Missed count ({stats.totalMissed}) does not match attrition driver sum ({stats.totalWomenInReasons}).</span>
            </div>
        )}
      </div>

      <div className="grid gap-2 lg:gap-4 grid-cols-2 md:grid-cols-5">
        {[
          { label: "Total ANC Flow", value: stats.totalANC, icon: Building2, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Eligible Identified", value: stats.totalEligible, icon: Target, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Reported Interviews", value: stats.totalInterviewed, icon: UserCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Total Missed", value: stats.totalMissed, icon: UserX, color: "text-rose-600", bg: "bg-rose-50" },
          { label: "Conversion Rate", value: `${stats.successRate.toFixed(1)}%`, icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-50" },
        ].map((kpi, i) => (
          <Card key={i} className="border-none ring-1 ring-border shadow-none group hover:ring-primary/40 transition-all overflow-hidden">
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
        <Card className="lg:col-span-7 border-none ring-1 ring-border shadow-none">
          <CardHeader className="bg-primary/5 border-b py-5 px-6">
              <CardTitle className="text-xl font-black tracking-tight">Recruitment Velocity</CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60">Log-reported conversion performance over time</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[350px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.trendData}>
                  <defs>
                    <linearGradient id="colorRate" x1="0" x1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 9, fontWeight: 800, fill: '#94a3b8' }}
                  />
                  <YAxis domain={[0, 100]} hide />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', padding: '12px' }}
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

        <Card className="lg:col-span-5 border-none ring-1 ring-border shadow-none">
          <CardHeader className="bg-primary/5 border-b py-5 px-6">
            <CardTitle className="text-xl font-black tracking-tight">Attrition Drivers</CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60">Barriers identified in logs</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {stats.reasonStats.length === 0 ? (
                <div className="py-12 text-center italic text-muted-foreground text-xs font-bold">No attrition reasons logged.</div>
            ) : (
                <>
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.reasonStats}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="count"
                        nameKey="name"
                      >
                        {stats.reasonStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', padding: '8px' }}
                        itemStyle={{ fontSize: '10px', fontWeight: 700 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="grid grid-cols-1 gap-2 mt-4">
                  {stats.reasonStats.slice(0, 4).map((r, i) => (
                    <div key={i} className="flex items-center justify-between text-[10px] font-bold">
                      <div className="flex items-center gap-2 truncate max-w-[200px]">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="truncate text-slate-600 uppercase tracking-tighter">{r.name}</span>
                      </div>
                      <span className="font-black text-slate-900">{r.count} <span className="text-muted-foreground opacity-60">({r.percentage.toFixed(0)}%)</span></span>
                    </div>
                  ))}
                </div>
                </>
            )}
            <div className="pt-2">
                <Button variant="ghost" className="w-full h-12 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-50 hover:bg-slate-100 text-slate-900" asChild>
                    <Link href="/anc/admin/recruitment/table">Full Raw Workload Dataset <ChevronRight className="ml-2 h-4 w-4" /></Link>
                </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
