
"use client";

import { useMemo, useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, LineChart, Line, ReferenceLine, Cell
} from 'recharts';
import { 
  Users, UserCheck, UserX, Target, Calendar, Download, 
  TrendingUp, Building2, ChevronRight, Loader2, AlertCircle
} from 'lucide-react';
import { format, subDays, isWithinInterval, startOfDay } from 'date-fns';
import { RECRUITMENT_REASONS, type RecruitmentEntry } from '@/types';
import Link from 'next/link';

export default function RecruitmentDashboard() {
  const firestore = useFirestore();
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

    // Filter by date range
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
        raStats, facStats, reasonStats, trendData 
    };
  }, [entries, dateRange]);

  const exportCSV = () => {
    if (!entries) return;
    const headers = ["Date", "Facility", "RA", "Providers", "Total ANC", "Eligible", "Interviewed", "Missed", "# Women", "Reason", "Notes"];
    const rows = entries.map(e => [
        e.date?.toDate ? format(e.date.toDate(), 'yyyy-MM-dd') : e.date,
        e.facility,
        e.ra_name,
        e.providers,
        e.total_anc,
        e.eligible,
        e.interviewed,
        e.missed,
        e.num_women,
        e.reason,
        `"${e.notes?.replace(/"/g, '""') || ''}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recruitment_export_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center h-[400px] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Aggregating recruitment data...</p>
    </div>
  );

  if (!stats) return <div className="p-8 text-center">No recruitment data found for this period.</div>;

  const rateColor = stats.successRate >= 80 ? "text-green-600" : stats.successRate >= 60 ? "text-amber-600" : "text-destructive";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Recruitment Dashboard</h1>
          <p className="text-muted-foreground">Live analytics from study enrollment tracking.</p>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV}>
                <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
            <Button asChild size="sm">
                <Link href="/anc/recruitment">
                    <ClipboardList className="mr-2 h-4 w-4" /> New Entry
                </Link>
            </Button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total ANC Workload</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalANC}</div>
            <p className="text-xs text-muted-foreground">Logged across {stats.uniqueSessions} sessions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Eligible (1st Visit)</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEligible}</div>
            <p className="text-xs text-muted-foreground">{((stats.totalEligible/stats.totalANC)*100).toFixed(1)}% of total ANC</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Recruitment Success</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${rateColor}`}>{stats.successRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">{stats.totalInterviewed} women enrolled</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Missed</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.totalMissed}</div>
            <p className="text-xs text-muted-foreground">{((stats.totalMissed/stats.totalEligible)*100).toFixed(1)}% attrition rate</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Trend Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Recruitment Rate Trend</CardTitle>
            <CardDescription>Daily enrollment success rate over time.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} />
                  <Tooltip formatter={(v: any) => [`${v.toFixed(1)}%`, 'Success Rate']} />
                  <ReferenceLine y={80} stroke="#10b981" strokeDasharray="4 4" label={{ position: 'right', value: '80%', fill: '#10b981', fontSize: 10 }} />
                  <ReferenceLine y={60} stroke="#ef4444" strokeDasharray="4 4" label={{ position: 'right', value: '60%', fill: '#ef4444', fontSize: 10 }} />
                  <Line type="monotone" dataKey="rate" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Reasons Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Top Reasons for Missing</CardTitle>
            <CardDescription>Aggregated across all RAs and facilities.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.reasonStats.slice(0, 8)} layout="vertical" margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="reason" type="category" width={120} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: any, name: any, p: any) => [`${v} women (${p.payload.percentage.toFixed(1)}%)`, 'Missed']} />
                  <Bar dataKey="count" fill="#f97316" radius={[0, 4, 4, 0]}>
                    {stats.reasonStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index < 3 ? "#ea580c" : "#f97316"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
         {/* RA Table */}
        <Card>
          <CardHeader>
            <CardTitle>RA Performance</CardTitle>
            <CardDescription>Metrics grouped by Research Assistant.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>RA Name</TableHead>
                  <TableHead className="text-right">Eligible</TableHead>
                  <TableHead className="text-right">Interviewed</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.raStats.map((ra: any) => (
                  <TableRow key={ra.name}>
                    <TableCell className="font-medium">{ra.name}</TableCell>
                    <TableCell className="text-right">{ra.eligible}</TableCell>
                    <TableCell className="text-right">{ra.interviewed}</TableCell>
                    <TableCell className="text-right font-bold">
                        <span className={ra.rate >= 80 ? "text-green-600" : ra.rate >= 60 ? "text-amber-600" : "text-destructive"}>
                            {ra.rate.toFixed(1)}%
                        </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Facility Table */}
        <Card>
          <CardHeader>
            <CardTitle>Facility Breakdown</CardTitle>
            <CardDescription>Top contributing health facilities.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Facility</TableHead>
                  <TableHead className="text-right">Sessions</TableHead>
                  <TableHead className="text-right">Eligible</TableHead>
                  <TableHead className="text-right">Interviewed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.facStats.slice(0, 6).map((fac: any) => (
                  <TableRow key={fac.name}>
                    <TableCell className="max-w-[150px] truncate text-xs font-medium">{fac.name}</TableCell>
                    <TableCell className="text-right">{fac.sessions}</TableCell>
                    <TableCell className="text-right">{fac.eligible}</TableCell>
                    <TableCell className="text-right">{fac.interviewed}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4 flex justify-center">
                <Button variant="ghost" size="sm" asChild>
                    <Link href="/anc/admin/recruitment/table" className="text-xs">
                        View All Data Table <ChevronRight className="ml-1 h-3 w-3" />
                    </Link>
                </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
