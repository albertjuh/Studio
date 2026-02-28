
"use client";

import { useMemo, useState, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { 
  Users, UserCheck, UserX, Target, Calendar, Download, 
  TrendingUp, Building2, ChevronRight, Loader2, RefreshCcw,
  ShieldCheck, Activity, Users2
} from 'lucide-react';
import { format, subDays, isWithinInterval, startOfDay } from 'date-fns';
import { type RecruitmentEntry } from '@/types';
import Link from 'next/link';

export default function RecruitmentDashboard() {
  const firestore = useFirestore();
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [dateRange] = useState({ 
    from: subDays(new Date(), 30), 
    to: new Date() 
  });

  const recruitmentQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'recruitment_entries'), orderBy('date', 'desc'));
  }, [firestore]);

  const { data: entries, isLoading } = useCollection<RecruitmentEntry>(recruitmentQuery);

  const stats = useMemo(() => {
    if (!entries) return null;

    const filtered = entries.filter(e => {
        const d = e.date?.toDate ? e.date.toDate() : new Date(e.date);
        return isWithinInterval(d, { start: startOfDay(dateRange.from), end: dateRange.to });
    });

    // Sessions are defined by documents where first_row_flag === 1
    const workloadEntries = filtered.filter(e => e.first_row_flag === 1);

    const totalANC = workloadEntries.reduce((sum, e) => sum + (e.total_anc || 0), 0);
    const totalEligible = workloadEntries.reduce((sum, e) => sum + (e.eligible || 0), 0);
    const totalInterviewed = workloadEntries.reduce((sum, e) => sum + (e.interviewed || 0), 0);
    const totalMissed = workloadEntries.reduce((sum, e) => sum + (e.missed || 0), 0);
    const totalProviders = workloadEntries.reduce((sum, e) => sum + (e.providers || 0), 0);
    
    const avgProviders = workloadEntries.length > 0 ? (totalProviders / workloadEntries.length).toFixed(1) : 0;
    const successRate = totalEligible > 0 ? (totalInterviewed / totalEligible) * 100 : 0;
    const uniqueSessions = workloadEntries.length;

    const raStatsMap = filtered.reduce((acc: any, e) => {
        if (!acc[e.ra_name]) {
            acc[e.ra_name] = { name: e.ra_name, anc: 0, eligible: 0, interviewed: 0, missed: 0, sessions: 0 };
        }
        if (e.first_row_flag === 1) {
            acc[e.ra_name].anc += (e.total_anc || 0);
            acc[e.ra_name].eligible += (e.eligible || 0);
            acc[e.ra_name].interviewed += (e.interviewed || 0);
            acc[e.ra_name].missed += (e.missed || 0);
            acc[e.ra_name].sessions += 1;
        }
        return acc;
    }, {});

    const raStats = Object.values(raStatsMap).map((ra: any) => ({
        ...ra,
        rate: ra.eligible > 0 ? (ra.interviewed / ra.eligible) * 100 : 0
    })).sort((a: any, b: any) => b.rate - a.rate);

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

    const trendMap = workloadEntries.reduce((acc: any, e) => {
        const d = e.date?.toDate ? format(e.date.toDate(), 'MMM dd') : format(new Date(e.date), 'MMM dd');
        if (!acc[d]) acc[d] = { date: d, interviewed: 0, eligible: 0, anc: 0 };
        acc[d].interviewed += e.interviewed;
        acc[d].eligible += e.eligible;
        acc[d].anc += e.total_anc;
        return acc;
    }, {});

    const trendData = Object.values(trendMap).map((d: any) => ({
        ...d,
        rate: d.eligible > 0 ? (d.interviewed / d.eligible) * 100 : 0
    })).reverse();

    return { 
        totalANC, totalEligible, totalInterviewed, totalMissed, avgProviders, successRate, uniqueSessions,
        raStats, reasonStats, trendData, filteredEntries: filtered
    };
  }, [entries, dateRange]);

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <div className="text-center">
            <h2 className="text-xl font-black tracking-tight">Compiling Intelligence</h2>
            <p className="text-muted-foreground text-sm font-medium">Aggregating session metrics from all facilities...</p>
        </div>
    </div>
  );

  if (!stats) return <div className="p-8 text-center font-bold">No recruitment data found.</div>;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-24 lg:pb-12">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-[10px]">
            <ShieldCheck className="h-4 w-4" /> Monitoring & Analysis Unit
          </div>
          <h1 className="text-4xl font-black tracking-tighter">Recruitment Dashboard</h1>
          <div className="flex items-center gap-3 text-xs font-bold text-muted-foreground">
            <span className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> SYSTEM LIVE
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span>LAST SYNC: {format(lastUpdate, 'hh:mm a')}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full lg:w-auto">
            <Button variant="outline" className="flex-1 lg:flex-none h-11 rounded-xl font-bold border-2" onClick={() => setLastUpdate(new Date())}>
                <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
            </Button>
            <Button className="flex-1 lg:flex-none h-11 rounded-xl font-bold shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90">
                <Download className="mr-2 h-4 w-4" /> Export Report
            </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        {[
          { label: "Total ANC", value: stats.totalANC, icon: Building2, color: "text-blue-600", bg: "bg-blue-50", desc: "Workload" },
          { label: "Eligible", value: stats.totalEligible, icon: Target, color: "text-purple-600", bg: "bg-purple-50", desc: "Potential" },
          { label: "Interviewed", value: stats.totalInterviewed, icon: UserCheck, color: "text-emerald-600", bg: "bg-emerald-50", desc: "Enrolled" },
          { label: "Missed", value: stats.totalMissed, icon: UserX, color: "text-rose-600", bg: "bg-rose-50", desc: "Attrition" },
          { label: "Conversion", value: `${stats.successRate.toFixed(1)}%`, icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-50", desc: "Efficiency" },
          { label: "Avg Providers", value: stats.avgProviders, icon: Users2, color: "text-slate-600", bg: "bg-slate-50", desc: "Staffing" },
        ].map((kpi, i) => (
          <Card key={i} className="border-none ring-1 ring-border shadow-sm overflow-hidden group hover:ring-primary/40 transition-all duration-300">
            <CardHeader className="p-4 pb-0 flex flex-row items-center justify-between space-y-0">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{kpi.label}</span>
              <div className={`p-2 rounded-xl ${kpi.bg} ${kpi.color} group-hover:scale-110 transition-transform`}>
                <kpi.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className="text-2xl font-black tracking-tight">{kpi.value}</div>
              <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter mt-0.5">{kpi.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-8 border-none ring-1 ring-border shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2 bg-primary/5 border-b rounded-t-xl">
            <div>
              <CardTitle className="text-xl font-black tracking-tight">Recruitment Velocity</CardTitle>
              <CardDescription className="text-xs font-bold uppercase tracking-widest opacity-60">Conversion performance over time</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[380px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.trendData}>
                  <defs>
                    <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }}
                  />
                  <YAxis domain={[0, 100]} hide />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }}
                    itemStyle={{ fontWeight: 900, fontSize: '12px' }}
                    labelStyle={{ fontWeight: 900, color: '#64748b', marginBottom: '4px', fontSize: '10px' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="rate" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={4} 
                    fillOpacity={1} 
                    fill="url(#colorRate)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-4 border-none ring-1 ring-border shadow-lg">
          <CardHeader className="bg-primary/5 border-b rounded-t-xl">
            <CardTitle className="text-xl font-black tracking-tight">Attrition Drivers</CardTitle>
            <CardDescription className="text-xs font-bold uppercase tracking-widest opacity-60">Why are eligible women missed?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {stats.reasonStats.slice(0, 5).map((r, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between text-xs items-baseline">
                  <span className="font-bold text-slate-700 truncate max-w-[180px]">{r.reason}</span>
                  <span className="font-black text-primary">{r.count} <span className="text-[10px] text-muted-foreground ml-1">({r.percentage.toFixed(0)}%)</span></span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-primary h-full rounded-full transition-all duration-1000 ease-out" 
                    style={{ width: `${r.percentage}%` }}
                  />
                </div>
              </div>
            ))}
            <div className="pt-4">
                <Button variant="ghost" className="w-full h-12 rounded-xl text-xs font-black uppercase tracking-widest bg-slate-50 hover:bg-slate-100" asChild>
                    <Link href="/anc/admin/recruitment/table">Full Raw Dataset <ChevronRight className="ml-2 h-4 w-4" /></Link>
                </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-1">
        <Card className="border-none ring-1 ring-border shadow-lg overflow-hidden">
          <CardHeader className="border-b bg-primary/5">
            <div className="flex items-center justify-between">
                <div>
                    <CardTitle className="text-lg font-black tracking-tight">Staff Performance Hub</CardTitle>
                    <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60">RA-level detailed recruitment metrics</CardDescription>
                </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest pl-6">Research Assistant</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Sessions</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Total ANC</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Eligible</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Recruited</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Missed</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase tracking-widest pr-6">Conversion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.raStats.map((ra: any) => (
                  <TableRow key={ra.name} className="hover:bg-slate-50/50 group">
                    <TableCell className="font-extrabold text-sm pl-6 py-4">{ra.name}</TableCell>
                    <TableCell className="text-right font-bold text-xs text-muted-foreground">{ra.sessions}</TableCell>
                    <TableCell className="text-right font-bold text-xs text-blue-600">{ra.anc}</TableCell>
                    <TableCell className="text-right font-bold text-xs">{ra.eligible}</TableCell>
                    <TableCell className="text-right font-black text-xs text-emerald-600">{ra.interviewed}</TableCell>
                    <TableCell className="text-right font-bold text-xs text-rose-600">{ra.missed}</TableCell>
                    <TableCell className="text-right pr-6">
                      <Badge className={`text-[10px] font-black uppercase border-none tracking-tighter ${ra.rate >= 80 ? "bg-emerald-100 text-emerald-700" : ra.rate >= 60 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}`}>
                        {ra.rate.toFixed(1)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
