
"use client";

import { useMemo, useState, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, ReferenceLine
} from 'recharts';
import { 
  Users, UserCheck, UserX, Target, Calendar, Download, 
  TrendingUp, Building2, ChevronRight, Loader2, RefreshCcw,
  ShieldCheck, ClipboardCheck, Activity
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

    const workloadEntries = filtered.filter(e => e.first_row_flag === 1);

    const totalANC = workloadEntries.reduce((sum, e) => sum + (e.total_anc || 0), 0);
    const totalEligible = workloadEntries.reduce((sum, e) => sum + (e.eligible || 0), 0);
    const totalInterviewed = workloadEntries.reduce((sum, e) => sum + (e.interviewed || 0), 0);
    const totalMissed = filtered.reduce((sum, e) => sum + (e.num_women || 0), 0);
    
    const successRate = totalEligible > 0 ? (totalInterviewed / totalEligible) * 100 : 0;
    const uniqueSessions = workloadEntries.length;

    // RA Stats
    const raStatsMap = filtered.reduce((acc: any, e) => {
        if (!acc[e.ra_name]) {
            acc[e.ra_name] = { name: e.ra_name, anc: 0, eligible: 0, interviewed: 0, missed: 0 };
        }
        if (e.first_row_flag === 1) {
            acc[e.ra_name].anc += (e.total_anc || 0);
            acc[e.ra_name].eligible += (e.eligible || 0);
            acc[e.ra_name].interviewed += (e.interviewed || 0);
        }
        acc[e.ra_name].missed += (e.num_women || 0);
        return acc;
    }, {});

    const raStats = Object.values(raStatsMap).map((ra: any) => ({
        ...ra,
        rate: ra.eligible > 0 ? (ra.interviewed / ra.eligible) * 100 : 0
    })).sort((a: any, b: any) => b.rate - a.rate);

    // Facility Stats
    const facStatsMap = filtered.reduce((acc: any, e) => {
        if (!acc[e.facility]) {
            acc[e.facility] = { name: e.facility, sessions: 0, anc: 0, eligible: 0, interviewed: 0, missed: 0 };
        }
        if (e.first_row_flag === 1) {
            acc[e.facility].sessions += 1;
            acc[e.facility].anc += (e.total_anc || 0);
            acc[e.facility].eligible += (e.eligible || 0);
            acc[e.facility].interviewed += (e.interviewed || 0);
        }
        acc[e.facility].missed += (e.num_women || 0);
        return acc;
    }, {});

    const facStats = Object.values(facStatsMap).sort((a: any, b: any) => b.eligible - a.eligible);

    // Reason Stats
    const reasonStatsMap = filtered.reduce((acc: any, e) => {
        if (e.reason && e.reason !== 'None Logged') {
            acc[e.reason] = (acc[e.reason] || 0) + (e.num_women || 0);
        }
        return acc;
    }, {});

    const reasonStats = Object.entries(reasonStatsMap).map(([reason, count]) => ({
        reason,
        count: count as number,
        percentage: totalMissed > 0 ? ((count as number) / totalMissed) * 100 : 0
    })).sort((a, b) => b.count - a.count);

    // Trend Data
    const trendMap = workloadEntries.reduce((acc: any, e) => {
        const d = e.date?.toDate ? format(e.date.toDate(), 'MMM dd') : format(new Date(e.date), 'MMM dd');
        if (!acc[d]) acc[d] = { date: d, interviewed: 0, eligible: 0 };
        acc[d].interviewed += e.interviewed;
        acc[d].eligible += e.eligible;
        return acc;
    }, {});

    const trendData = Object.values(trendMap).map((d: any) => ({
        ...d,
        rate: d.eligible > 0 ? (d.interviewed / d.eligible) * 100 : 0
    })).reverse();

    return { 
        totalANC, totalEligible, totalInterviewed, totalMissed, successRate, uniqueSessions,
        raStats, facStats, reasonStats, trendData, filteredEntries: filtered
    };
  }, [entries, dateRange]);

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center h-[500px] gap-6">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <div className="text-center">
            <h2 className="text-xl font-bold">Compiling Recruitment Data</h2>
            <p className="text-muted-foreground">Aggregating session metrics from all facilities...</p>
        </div>
    </div>
  );

  if (!stats) return <div className="p-8 text-center">No recruitment data found.</div>;

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-12">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-card p-6 rounded-2xl border shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-widest text-[10px]">
            <ShieldCheck className="h-3 w-3" /> Monitoring & Analysis Unit
          </div>
          <h1 className="text-3xl font-black tracking-tight">Recruitment Dashboard</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            System Live <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Sync Time: {format(lastUpdate, 'MMM dd, hh:mm a')}
          </p>
        </div>
        <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="rounded-xl font-bold" onClick={() => setLastUpdate(new Date())}>
                <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
            </Button>
            <Button variant="default" size="sm" className="rounded-xl font-bold shadow-md">
                <Download className="mr-2 h-4 w-4" /> Generate Report
            </Button>
            <div className="h-10 w-px bg-border mx-2 hidden sm:block"></div>
            <Avatar className="h-10 w-10 border-2 border-primary/20">
                <AvatarFallback className="bg-primary/10 text-primary font-black">AD</AvatarFallback>
            </Avatar>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {[
          { label: "Total ANC", value: stats.totalANC, icon: Building2, color: "border-blue-500 text-blue-600", bg: "bg-blue-50", desc: "Facility Workload" },
          { label: "Eligible", value: stats.totalEligible, icon: Target, color: "border-purple-500 text-purple-600", bg: "bg-purple-50", desc: "Potential Recruits" },
          { label: "Interviewed", value: stats.totalInterviewed, icon: UserCheck, color: "border-green-500 text-green-600", bg: "bg-green-50", desc: "Confirmed Enrolls" },
          { label: "Missed", value: stats.totalMissed, icon: UserX, color: "border-orange-500 text-orange-600", bg: "bg-orange-50", desc: "Attrition Count" },
          { label: "Recruit Rate", value: `${stats.successRate.toFixed(1)}%`, icon: TrendingUp, color: "border-emerald-500 text-emerald-600", bg: "bg-emerald-50", desc: "Efficiency", isRate: true },
          { label: "ANC Sessions", value: stats.uniqueSessions, icon: Calendar, color: "border-slate-500 text-slate-600", bg: "bg-slate-50", desc: "Active Logs" },
        ].map((kpi, i) => (
          <Card key={i} className={`border-l-4 shadow-sm hover:translate-y-[-2px] transition-all ${kpi.color}`}>
            <CardHeader className="p-4 pb-0 flex flex-row items-center justify-between">
              <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{kpi.label}</CardTitle>
              <div className={`p-1.5 rounded-lg ${kpi.bg}`}>
                <kpi.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="text-3xl font-black mb-1">{kpi.value}</div>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">{kpi.desc}</p>
              {kpi.isRate && (
                 <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div className="bg-emerald-500 h-1.5 rounded-full transition-all duration-1000" style={{ width: kpi.value }}></div>
                 </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Main Trend Chart */}
        <Card className="lg:col-span-8 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl font-black">Performance Trend</CardTitle>
              <CardDescription className="text-xs font-medium">Recruitment conversion rates across all facilities</CardDescription>
            </div>
            <div className="flex items-center gap-6 text-[10px] font-bold">
                <div className="flex items-center gap-2 uppercase"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Conversion Rate</div>
                <div className="flex items-center gap-2 uppercase"><div className="w-2 h-2 rounded-full bg-emerald-500/20"></div> Target Zones</div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }} />
                  <YAxis domain={[0, 100]} hide />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ fontWeight: 800 }}
                  />
                  <ReferenceLine y={80} stroke="#10b981" strokeDasharray="5 5" label={{ position: 'right', value: 'TARGET 80%', fill: '#10b981', fontSize: 9, fontWeight: 900 }} />
                  <ReferenceLine y={60} stroke="#f59e0b" strokeDasharray="5 5" label={{ position: 'right', value: 'MIN 60%', fill: '#f59e0b', fontSize: 9, fontWeight: 900 }} />
                  <Line type="monotone" dataKey="rate" stroke="#3b82f6" strokeWidth={4} dot={{ r: 6, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Reasons Analysis */}
        <Card className="lg:col-span-4 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-black">Attrition Analysis</CardTitle>
            <CardDescription className="text-xs font-medium">Why are we missing eligible women?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            {stats.reasonStats.slice(0, 5).map((r, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between text-xs items-baseline">
                  <span className="font-bold text-slate-700 truncate max-w-[180px]">{r.reason}</span>
                  <span className="font-black text-primary">{r.count} <span className="text-[10px] text-muted-foreground ml-1">({r.percentage.toFixed(0)}%)</span></span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-primary h-full rounded-full transition-all duration-700" style={{ width: `${r.percentage}%` }}></div>
                </div>
              </div>
            ))}
            <Button variant="link" className="w-full text-xs font-bold uppercase tracking-widest" asChild>
                <Link href="/anc/admin/recruitment/table">Full Reason Breakdown <ChevronRight className="h-3 w-3 ml-1" /></Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Detail Tables */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-black">Research Assistant Performance</CardTitle>
                <CardDescription className="text-xs font-medium">Individual recruitment efficiency</CardDescription>
              </div>
              <Activity className="h-5 w-5 text-muted-foreground opacity-20" />
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 border-none hover:bg-slate-50">
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Name</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">ANC</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Eligible</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Enrolled</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Rate %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.raStats.map((ra: any) => (
                    <TableRow key={ra.name} className="hover:bg-slate-50/50">
                      <TableCell className="font-bold text-sm">{ra.name}</TableCell>
                      <TableCell className="text-right font-medium text-xs text-muted-foreground">{ra.anc}</TableCell>
                      <TableCell className="text-right font-medium text-xs">{ra.eligible}</TableCell>
                      <TableCell className="text-right font-bold text-xs text-green-600">{ra.interviewed}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-3">
                           <span className={`text-xs font-black ${ra.rate >= 80 ? "text-green-600" : ra.rate >= 60 ? "text-amber-600" : "text-red-600"}`}>
                            {ra.rate.toFixed(1)}%
                           </span>
                           <div className="w-16 bg-slate-100 h-2 rounded-full hidden sm:block overflow-hidden">
                             <div className={`h-full rounded-full ${ra.rate >= 80 ? "bg-green-500" : ra.rate >= 60 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${ra.rate}%` }}></div>
                           </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-black">Facility Performance</CardTitle>
                <CardDescription className="text-xs font-medium">Top performing health centers</CardDescription>
              </div>
              <Building2 className="h-5 w-5 text-muted-foreground opacity-20" />
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 border-none hover:bg-slate-50">
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Facility</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Sessions</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Workload</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.facStats.slice(0, 5).map((fac: any) => {
                    const rate = fac.eligible > 0 ? (fac.interviewed / fac.eligible) * 100 : 0;
                    return (
                      <TableRow key={fac.name} className="hover:bg-slate-50/50">
                        <TableCell className="text-sm font-bold truncate max-w-[200px]">{fac.name}</TableCell>
                        <TableCell className="text-right font-medium text-xs">{fac.sessions}</TableCell>
                        <TableCell className="text-right font-medium text-xs text-muted-foreground">{fac.anc}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className={`text-[10px] font-black uppercase border-none ${rate >= 80 ? "text-green-600 bg-green-50" : rate >= 60 ? "text-amber-600 bg-amber-50" : "text-red-600 bg-red-50"}`}>
                            {rate.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Activity Feed */}
        <Card className="lg:col-span-4 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-black">System Feed</CardTitle>
            <CardDescription className="text-xs font-medium">Real-time log of data entry events</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 pt-4">
            {stats.filteredEntries.slice(0, 6).map((e, i) => (
              <div key={i} className="flex gap-4 items-start relative">
                {i !== 5 && <div className="absolute left-[15px] top-[30px] w-0.5 h-[calc(100%+20px)] bg-slate-100"></div>}
                <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 z-10 ${e.reason !== 'None Logged' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                  {e.reason !== 'None Logged' ? <UserX className="h-4 w-4" /> : <ClipboardCheck className="h-4 w-4" />}
                </div>
                <div className="space-y-1">
                  <div className="flex flex-col">
                    <span className="text-xs font-black uppercase tracking-tight">
                        {e.ra_name} {e.reason !== 'None Logged' ? 'Logged Missed' : 'Completed Log'}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-bold">{e.facility}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-[9px] font-black uppercase px-2 py-0">
                        {e.reason !== 'None Logged' ? r.reason : 'SUCCESS'}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
            <div className="pt-2">
              <Button variant="outline" className="w-full text-[10px] font-black uppercase tracking-widest rounded-xl" asChild>
                <Link href="/anc/admin/recruitment/table">View Full System Activity Logs</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <footer className="pt-12 mt-12 border-t flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] text-muted-foreground font-black uppercase tracking-widest">
        <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" /> Partoma Project • Monitoring & Evaluation • {new Date().getFullYear()}
        </div>
        <div className="flex gap-8">
            <Link href="#" className="hover:text-primary">Data Ethics</Link>
            <Link href="#" className="hover:text-primary">Technical Specs</Link>
            <Link href="#" className="hover:text-primary">Support Hub</Link>
        </div>
      </footer>
    </div>
  );
}
