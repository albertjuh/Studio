
"use client";

import { useMemo, useState, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, deleteDoc, doc, getDocs, writeBatch } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  UserCheck, UserX, Target, Download, 
  TrendingUp, Building2, ChevronRight, Loader2, RefreshCcw,
  ShieldCheck, Users2, Trash2, Filter, AlertCircle
} from 'lucide-react';
import { format, subDays, isWithinInterval, startOfDay } from 'date-fns';
import { type RecruitmentEntry } from '@/types';
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

export default function RecruitmentDashboard() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [includeTestData, setIncludeTestData] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [dateRange] = useState({ 
    from: subDays(new Date(), 30), 
    to: new Date() 
  });

  const recruitmentQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'recruitment_entries'), orderBy('date', 'desc'));
  }, [firestore]);

  const { data: entries, isLoading } = useCollection<RecruitmentEntry>(recruitmentQuery);

  const purgeTestData = async () => {
    if (!firestore) return;
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

    // Deduplicated entries for global session stats (Providers, Total ANC, Eligible, Interviewed)
    // workloadEntries correctly picks one row per unique session (RA + Date + Facility)
    const workloadEntries = filtered.filter(e => e.first_row_flag === 1);

    const totalANC = workloadEntries.reduce((sum, e) => sum + (e.total_anc || 0), 0);
    const totalEligible = workloadEntries.reduce((sum, e) => sum + (e.eligible || 0), 0);
    const totalInterviewed = workloadEntries.reduce((sum, e) => sum + (e.interviewed || 0), 0);
    const totalMissed = workloadEntries.reduce((sum, e) => sum + (e.missed || 0), 0);
    const totalProviders = workloadEntries.reduce((sum, e) => sum + (e.providers || 0), 0);
    
    const avgProviders = workloadEntries.length > 0 ? (totalProviders / workloadEntries.length).toFixed(1) : 0;
    const successRate = totalEligible > 0 ? (totalInterviewed / totalEligible) * 100 : 0;

    // Daily trend aggregation
    const trendMap = workloadEntries.reduce((acc: any, e) => {
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

    // Attrition reason aggregation (summing num_women from all entries to get accurate totals)
    const reasonStatsMap = filtered.reduce((acc: any, e) => {
        if (e.reason && e.reason !== 'None Logged') {
            acc[e.reason] = (acc[e.reason] || 0) + (e.num_women || 0);
        }
        return acc;
    }, {});

    const totalWomenInReasons = Object.values(reasonStatsMap).reduce((sum: number, count) => sum + (count as number), 0);
    const reasonStats = Object.entries(reasonStatsMap).map(([reason, count]) => ({
        reason,
        count: count as number,
        percentage: totalWomenInReasons > 0 ? ((count as number) / totalWomenInReasons) * 100 : 0
    })).sort((a, b) => b.count - a.count);

    // Data Integrity Warning: Checks if missed eligible count matches attrition driver sum
    const hasDiscrepancy = totalMissed !== totalWomenInReasons;

    return { 
        totalANC, totalEligible, totalInterviewed, totalMissed, avgProviders, successRate,
        reasonStats, trendData, hasDiscrepancy, totalWomenInReasons
    };
  }, [entries, dateRange, includeTestData]);

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Compiling Intelligence...</p>
    </div>
  );

  if (!stats) return <div className="p-8 text-center font-bold">No recruitment data found.</div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24 lg:pb-12">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 lg:gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-[9px]">
            <ShieldCheck className="h-4 w-4" /> Monitoring & Analysis Unit
          </div>
          <h1 className="text-3xl lg:text-4xl font-black tracking-tighter">Recruitment Dashboard</h1>
          <div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground">
            <span className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500" /> SYSTEM LIVE
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span>LAST SYNC: {format(lastUpdate, 'hh:mm a')}</span>
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
                    {includeTestData ? "All Data" : "Production"}
                </Label>
            </div>

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
                    This will permanently delete all records entered by <span className="text-foreground font-extrabold">Admin</span> and <span className="text-foreground font-extrabold">Test User</span>.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-xl font-bold">Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={purgeTestData} disabled={isPurging} className="bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700">
                    {isPurging ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                    Purge All Test Data
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button variant="outline" size="sm" className="h-9 rounded-lg font-bold border-2 px-3 text-slate-900" onClick={() => setLastUpdate(new Date())}>
                <RefreshCcw className="mr-1.5 h-3.5 w-3.5" /> <span className="text-[10px]">Refresh</span>
            </Button>
            <Button size="sm" className="h-9 rounded-lg font-bold bg-primary hover:bg-primary/90 text-white px-3 shadow-none">
                <Download className="mr-1.5 h-3.5 w-3.5" /> <span className="text-[10px]">Report</span>
            </Button>
        </div>
      </div>

      <div className="space-y-4">
        {!includeTestData && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-center gap-3 text-emerald-800 text-[10px] font-bold">
                <Filter className="h-3.5 w-3.5" />
                <span>Production Intelligence: Entries from "Admin" and "Test User" have been filtered for accuracy.</span>
            </div>
        )}

        {stats.hasDiscrepancy && (
            <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 flex items-center gap-3 text-rose-800 text-[10px] font-bold">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>Integrity Alert: Missed eligible count ({stats.totalMissed}) does not match attrition driver sum ({stats.totalWomenInReasons}). Please review daily logs.</span>
            </div>
        )}
      </div>

      {/* KPI Section: High-density grid */}
      <div className="grid gap-2 lg:gap-4 grid-cols-3 xl:grid-cols-6">
        {[
          { label: "Total ANC", value: stats.totalANC, icon: Building2, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Eligible", value: stats.totalEligible, icon: Target, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Interviewed", value: stats.totalInterviewed, icon: UserCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Missed", value: stats.totalMissed, icon: UserX, color: "text-rose-600", bg: "bg-rose-50" },
          { label: "Conv. %", value: `${stats.successRate.toFixed(1)}%`, icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Providers", value: stats.avgProviders, icon: Users2, color: "text-slate-600", bg: "bg-slate-50" },
        ].map((kpi, i) => (
          <Card key={i} className="border-none ring-1 ring-border shadow-none group hover:ring-primary/40 transition-all overflow-hidden">
            <CardHeader className="p-2 lg:p-4 pb-0 flex flex-row items-center justify-between space-y-0">
              <span className="text-[8px] lg:text-[10px] font-black text-muted-foreground uppercase tracking-tighter lg:tracking-widest truncate">{kpi.label}</span>
              <div className={`p-1.5 lg:p-2 rounded-lg ${kpi.bg} ${kpi.color} hidden sm:flex`}>
                <kpi.icon className="h-3 w-3 lg:h-4 lg:w-4" />
              </div>
            </CardHeader>
            <CardContent className="p-2 lg:p-4 pt-0 lg:pt-1">
              <div className="text-sm lg:text-2xl font-black tracking-tighter lg:tracking-tight">{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-8 border-none ring-1 ring-border shadow-none">
          <CardHeader className="bg-primary/5 border-b rounded-t-xl py-3 px-4 lg:py-6 lg:px-6">
              <CardTitle className="text-lg lg:text-xl font-black tracking-tight">Recruitment Velocity</CardTitle>
              <CardDescription className="text-[9px] lg:text-xs font-bold uppercase tracking-widest opacity-60">Conversion performance over time</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[250px] lg:h-[380px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.trendData}>
                  <defs>
                    <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                      <strong offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                      <strong offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 9, fontBold: 800, fill: '#94a3b8' }}
                  />
                  <YAxis domain={[0, 100]} hide />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: 'none', padding: '12px' }}
                    itemStyle={{ fontWeight: 900, fontSize: '12px' }}
                    labelStyle={{ fontWeight: 900, color: '#64748b', marginBottom: '4px', fontSize: '10px' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="rate" 
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

        <Card className="lg:col-span-4 border-none ring-1 ring-border shadow-none">
          <CardHeader className="bg-primary/5 border-b rounded-t-xl py-3 px-4 lg:py-6 lg:px-6">
            <CardTitle className="text-lg lg:text-xl font-black tracking-tight">Attrition Drivers</CardTitle>
            <CardDescription className="text-[9px] lg:text-xs font-bold uppercase tracking-widest opacity-60">Why are eligible women missed?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 lg:space-y-6 pt-6">
            {stats.reasonStats.length === 0 ? (
                <div className="py-12 text-center italic text-muted-foreground text-xs font-bold">No attrition reasons logged.</div>
            ) : (
                stats.reasonStats.slice(0, 6).map((r, i) => (
                    <div key={i} className="space-y-1 lg:space-y-2">
                        <div className="flex justify-between text-[10px] lg:text-xs items-baseline">
                        <span className="font-bold text-slate-700 truncate max-w-[150px] lg:max-w-[180px]">{r.reason}</span>
                        <span className="font-black text-primary">{r.count} <span className="text-[9px] text-muted-foreground ml-1">({r.percentage.toFixed(0)}%)</span></span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 lg:h-2 rounded-full overflow-hidden">
                        <div 
                            className="bg-primary h-full rounded-full transition-all duration-1000 ease-out" 
                            style={{ width: `${r.percentage}%` }}
                        />
                        </div>
                    </div>
                ))
            )}
            <div className="pt-4">
                <Button variant="ghost" className="w-full h-10 lg:h-12 rounded-xl text-[10px] lg:text-xs font-black uppercase tracking-widest bg-slate-50 hover:bg-slate-100 text-slate-900" asChild>
                    <Link href="/anc/admin/recruitment/table">Full Raw Dataset <ChevronRight className="ml-2 h-4 w-4" /></Link>
                </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
