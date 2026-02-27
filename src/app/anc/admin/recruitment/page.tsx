
"use client";

import { useMemo, useState, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, LineChart, Line, ReferenceLine, Cell
} from 'recharts';
import { 
  Users, UserCheck, UserX, Target, Calendar, Download, 
  TrendingUp, Building2, ChevronRight, Loader2, RefreshCcw,
  FileText, ShieldCheck, UserPlus, ClipboardCheck
} from 'lucide-react';
import { format, subDays, isWithinInterval, startOfDay } from 'date-fns';
import { type RecruitmentEntry } from '@/types';
import Link from 'next/link';

export default function RecruitmentDashboard() {
  const firestore = useFirestore();
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [dateRange, setDateRange] = useState({ 
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
    <div className="flex flex-col items-center justify-center h-[400px] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Aggregating recruitment data...</p>
    </div>
  );

  if (!stats) return <div className="p-8 text-center">No recruitment data found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">PARTOMA — Recruitment Dashboard</h1>
          <p className="text-xs text-muted-foreground">
            Last updated: {format(lastUpdate, 'MMM dd, yyyy, hh:mm a')}
          </p>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setLastUpdate(new Date())}>
                <RefreshCcw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" /> Export
            </Button>
            <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary text-xs">AD</AvatarFallback>
            </Avatar>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Total ANC Visits", value: stats.totalANC, icon: Users, color: "border-blue-500", trend: "+4.2%" },
          { label: "Total Eligible", value: stats.totalEligible, icon: Target, color: "border-purple-500", trend: "+1.8%" },
          { label: "Total Interviewed", value: stats.totalInterviewed, icon: UserCheck, color: "border-green-500", trend: "+12%" },
          { label: "Total Missed", value: stats.totalMissed, icon: UserX, color: "border-orange-500", trend: "-2.4%", trendColor: "text-red-500" },
          { label: "Recruitment Rate", value: `${stats.successRate.toFixed(1)}%`, icon: TrendingUp, color: "border-emerald-500", isRate: true },
          { label: "ANC Sessions", value: stats.uniqueSessions, icon: Calendar, color: "border-gray-500", target: "Target: 60" },
        ].map((kpi, i) => (
          <Card key={i} className={`border-l-4 ${kpi.color}`}>
            <CardHeader className="p-4 pb-0 flex flex-row items-center justify-between">
              <CardTitle className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{kpi.label}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold">{kpi.value}</span>
                {kpi.trend && <span className={`text-[10px] font-bold ${kpi.trendColor || 'text-green-500'}`}>{kpi.trend}</span>}
              </div>
              {kpi.isRate && (
                 <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2">
                    <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: kpi.value }}></div>
                 </div>
              )}
              {kpi.target && <p className="text-[10px] text-muted-foreground mt-1">{kpi.target}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Chart */}
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recruitment Rate Trend</CardTitle>
              <CardDescription className="text-xs">Performance across Research Assistants</CardDescription>
            </div>
            <div className="flex items-center gap-4 text-[10px]">
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Overall</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-gray-300"></div> Individual RAs</div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#999' }} />
                  <YAxis domain={[0, 100]} hide />
                  <Tooltip />
                  <ReferenceLine y={80} stroke="#10b981" strokeWidth={1} strokeOpacity={0.3} label={{ position: 'left', value: '80% THRESHOLD', fill: '#10b981', fontSize: 8 }} />
                  <ReferenceLine y={60} stroke="#f59e0b" strokeWidth={1} strokeOpacity={0.3} label={{ position: 'left', value: '60% THRESHOLD', fill: '#f59e0b', fontSize: 8 }} />
                  <Line type="monotone" dataKey="rate" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Reasons */}
        <Card>
          <CardHeader>
            <CardTitle>Top Reasons for Missing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {stats.reasonStats.slice(0, 4).map((r, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-medium">{r.reason}</span>
                  <span className="text-muted-foreground">{r.count} ({r.percentage.toFixed(0)}%)</span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${r.percentage}%` }}></div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Performance Tables */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>By RA Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50">
                    <TableHead className="text-[10px] uppercase">RA Name</TableHead>
                    <TableHead className="text-right text-[10px] uppercase">ANC</TableHead>
                    <TableHead className="text-right text-[10px] uppercase">Eligible</TableHead>
                    <TableHead className="text-right text-[10px] uppercase">Interviewed</TableHead>
                    <TableHead className="text-right text-[10px] uppercase">Missed</TableHead>
                    <TableHead className="text-right text-[10px] uppercase">Rate (%)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.raStats.map((ra: any) => (
                    <TableRow key={ra.name}>
                      <TableCell className="font-medium text-xs">{ra.name}</TableCell>
                      <TableCell className="text-right text-xs">{ra.anc}</TableCell>
                      <TableCell className="text-right text-xs">{ra.eligible}</TableCell>
                      <TableCell className="text-right text-xs">{ra.interviewed}</TableCell>
                      <TableCell className="text-right text-xs">{ra.missed}</TableCell>
                      <TableCell className="text-right font-bold text-xs">
                        <div className="flex items-center justify-end gap-2">
                           <span className={ra.rate >= 80 ? "text-green-600" : ra.rate >= 60 ? "text-amber-600" : "text-red-600"}>
                            {ra.rate.toFixed(1)}%
                           </span>
                           <div className="w-12 bg-gray-100 h-1.5 rounded-full hidden sm:block">
                             <div className={`h-1.5 rounded-full ${ra.rate >= 80 ? "bg-green-500" : ra.rate >= 60 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${ra.rate}%` }}></div>
                           </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>By Facility Performance</CardTitle>
              <Button variant="link" size="sm" asChild>
                <Link href="/anc/admin/recruitment/table" className="text-xs">View All <ChevronRight className="h-3 w-3 ml-1" /></Link>
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50">
                    <TableHead className="text-[10px] uppercase">Facility Name</TableHead>
                    <TableHead className="text-right text-[10px] uppercase">Sessions</TableHead>
                    <TableHead className="text-right text-[10px] uppercase">ANC</TableHead>
                    <TableHead className="text-right text-[10px] uppercase">Eligible</TableHead>
                    <TableHead className="text-right text-[10px] uppercase">Interviewed</TableHead>
                    <TableHead className="text-right text-[10px] uppercase">Rate (%)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.facStats.slice(0, 4).map((fac: any) => {
                    const rate = fac.eligible > 0 ? (fac.interviewed / fac.eligible) * 100 : 0;
                    return (
                      <TableRow key={fac.name}>
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-3 w-3 text-blue-500" />
                            {fac.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-xs">{fac.sessions}</TableCell>
                        <TableCell className="text-right text-xs">{fac.anc}</TableCell>
                        <TableCell className="text-right text-xs">{fac.eligible}</TableCell>
                        <TableCell className="text-right text-xs">{fac.interviewed}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className={`text-[10px] font-bold ${rate >= 80 ? "text-green-600 bg-green-50" : rate >= 60 ? "text-amber-600 bg-amber-50" : "text-red-600 bg-red-50"}`}>
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

        {/* Feed */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Entries Feed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {stats.filteredEntries.slice(0, 5).map((e, i) => (
              <div key={i} className="flex gap-4 items-start">
                <div className={`p-2 rounded-full ${e.reason !== 'None Logged' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                  {e.reason !== 'None Logged' ? <UserX className="h-4 w-4" /> : <ClipboardCheck className="h-4 w-4" />}
                </div>
                <div className="space-y-0.5">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-xs font-bold">{e.reason !== 'None Logged' ? 'Missed Recruitment' : 'New Recruitment Logged'}</span>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">2 MIN AGO</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    RA: {e.ra_name} • {e.reason !== 'None Logged' ? `Reason: ${e.reason}` : `Facility: ${e.facility}`}
                  </p>
                </div>
              </div>
            ))}
            <div className="pt-4 flex justify-center">
              <Button variant="link" size="sm" asChild>
                <Link href="/anc/admin/recruitment/table" className="text-xs text-blue-500 font-bold">View Complete Activity Feed</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <footer className="border-t pt-8 flex flex-col md:flex-row justify-between gap-4 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Partoma Health System • Monitoring Unit
        </div>
        <div className="flex gap-6">
            <span>Documentation</span>
            <span>Data Ethics</span>
            <span>Support</span>
        </div>
        <div>© 2024 Partoma Recruitment Management</div>
      </footer>
    </div>
  );
}
