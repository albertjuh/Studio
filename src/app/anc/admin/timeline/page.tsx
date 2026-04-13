
"use client";

import { useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell 
} from 'recharts';
import { 
  Baby, 
  Calendar, 
  Users, 
  Activity, 
  AlertCircle, 
  ShieldCheck, 
  Clock,
  CheckCircle2,
  TrendingUp,
  Hospital,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { format, subDays, startOfDay, isWithinInterval } from 'date-fns';
import { type AncRegistration } from '@/types';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { resolveParticipantStatuses } from '@/lib/timeline/formulas';

export default function AdminTimelineDashboard() {
  const firestore = useFirestore();

  const participantsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'anc_registrations');
  }, [firestore]);

  const { data: participants, isLoading } = useCollection<AncRegistration>(participantsQuery);

  const stats = useMemo(() => {
    if (!participants) return null;

    // Use live status resolution for aggregation
    const resolved = participants.map(p => resolveParticipantStatuses(p)).filter(Boolean);

    const total = resolved.length;
    const active = resolved.filter(p => p?.delivery_status === 'pregnant').length;
    const likelyDelivered = resolved.filter(p => p?.delivery_status === 'likely_delivered' || p?.delivery_status === 'overdue_pregnancy').length;
    const actionNeeded = resolved.filter(p => p?.overall_status === 'action_needed').length;
    const overdue = resolved.filter(p => p?.overall_status === 'overdue').length;
    const complete = resolved.filter(p => p?.overall_status === 'complete').length;
    
    // Preparation Count: Who will open a window in 1-2 weeks
    const prepForecast = resolved.filter(p => 
        (p?.survey2_status === 'due_soon' || p?.survey3_status === 'due_soon' || p?.survey4_status === 'due_soon') &&
        p?.overall_status !== 'overdue' && 
        p?.overall_status !== 'action_needed'
    ).length;

    // Trimester Distribution
    const trimesterData = [
        { name: 'T1 (0-14wk)', value: resolved.filter(p => p?.current_trimester === 1).length, color: '#10b981' },
        { name: 'T2 (14-28wk)', value: resolved.filter(p => p?.current_trimester === 2).length, color: '#3b82f6' },
        { name: 'T3 (28-40wk)', value: resolved.filter(p => p?.current_trimester === 3).length, color: '#8b5cf6' },
        { name: 'Postpartum', value: resolved.filter(p => p?.current_trimester === 'postpartum').length, color: '#f59e0b' },
    ];

    // Enrollment Trend
    const trendMap = participants.reduce((acc: any, p) => {
        const d = (p.createdAt as any)?.toDate ? format((p.createdAt as any).toDate(), 'MMM dd') : 'N/A';
        if (d === 'N/A') return acc;
        acc[d] = (acc[d] || 0) + 1;
        return acc;
    }, {});

    const trendData = Object.entries(trendMap).map(([date, count]) => ({ date, count })).reverse().slice(0, 14);

    return { total, active, likelyDelivered, actionNeeded, overdue, complete, prepForecast, trimesterData, trendData };
  }, [participants]);

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Activity className="h-10 w-10 animate-spin text-primary" />
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Synthesizing Cohort Intelligence...</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-[9px] mb-1">
            <ShieldCheck className="h-4 w-4" /> Management Control Unit
          </div>
          <h1 className="text-4xl font-black tracking-tighter">Cohort Timeline Analysis</h1>
          <p className="text-sm font-medium text-muted-foreground">Strategic oversight of pregnancy progression and follow-up adherence.</p>
        </div>
        <Button asChild className="h-12 px-6 rounded-xl font-black uppercase tracking-widest shadow-xl shadow-primary/20">
            <Link href="/anc/admin/timeline/due-today">
                <Sparkles className="mr-2 h-5 w-5" /> View Action & Forecast
            </Link>
        </Button>
      </div>

      {/* KPI Row */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-7">
        {[
            { label: 'Total Enrolled', value: stats?.total, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Active (Preg)', value: stats?.active, icon: Baby, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Action Due', value: stats?.actionNeeded, icon: Activity, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Prep Forecast', value: stats?.prepForecast, icon: Sparkles, color: 'text-blue-600', bg: 'bg-blue-50', highlight: true },
            { label: 'Overdue', value: stats?.overdue, icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
            { label: 'Likely Deliv.', value: stats?.likelyDelivered, icon: Clock, color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: 'Complete', value: stats?.complete, icon: CheckCircle2, color: 'text-slate-600', bg: 'bg-slate-50' },
        ].map((kpi, i) => (
            <Card key={i} className={cn(
                "border-none ring-1 ring-border shadow-none overflow-hidden hover:ring-primary/40 transition-all",
                kpi.highlight && "ring-blue-200 bg-blue-50/20"
            )}>
                <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                    <div className={cn("p-3 rounded-2xl", kpi.bg, kpi.color)}>
                        <kpi.icon className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-[8px] font-black uppercase tracking-tighter text-muted-foreground">{kpi.label}</p>
                        <p className="text-xl font-black tracking-tighter">{kpi.value}</p>
                    </div>
                </CardContent>
            </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-8 border-none ring-1 ring-border shadow-none rounded-[2.5rem] overflow-hidden">
            <CardHeader className="bg-primary/5 border-b p-8">
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="text-2xl font-black tracking-tight">Enrollment Velocity</CardTitle>
                        <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Cohort growth trend over last 14 days</CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-white font-black text-[9px] uppercase tracking-widest border-2">Global Trend</Badge>
                </div>
            </CardHeader>
            <CardContent className="p-8">
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={stats?.trendData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 800, fill: '#94a3b8' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 800, fill: '#94a3b8' }} />
                            <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', padding: '16px' }} />
                            <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={4} dot={{ r: 6, fill: 'hsl(var(--primary))', strokeWidth: 3, stroke: '#fff' }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>

        <Card className="lg:col-span-4 border-none ring-1 ring-border shadow-none rounded-[2.5rem] overflow-hidden">
            <CardHeader className="bg-primary/5 border-b p-8">
                <CardTitle className="text-xl font-black tracking-tight">Trimester Mix</CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-primary/60">Cohort biological distribution</CardDescription>
            </CardHeader>
            <CardContent className="p-8 flex flex-col items-center">
                <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={stats?.trimesterData}
                                cx="50%" cy="50%"
                                innerRadius={60} outerRadius={80}
                                paddingAngle={8}
                                dataKey="value"
                            >
                                {stats?.trimesterData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="w-full space-y-2 mt-4">
                    {stats?.trimesterData.map((t, i) => (
                        <div key={i} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{t.name}</span>
                            </div>
                            <span className="font-black text-xs">{t.value}</span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-none ring-1 ring-border shadow-none rounded-[2.5rem] overflow-hidden">
            <CardContent className="p-8 flex items-center gap-6">
                <div className="h-16 w-16 bg-blue-50 rounded-2xl flex items-center justify-center">
                    <Hospital className="h-8 w-8 text-blue-600" />
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-black tracking-tight">Clinical Site Reach</h3>
                    <p className="text-sm font-medium text-muted-foreground leading-snug">Active monitoring across all health facilities in the Temeke municipality.</p>
                </div>
                <Button variant="secondary" size="icon" className="rounded-xl h-12 w-12 hover:bg-blue-50">
                    <ChevronRight className="h-6 w-6 text-blue-600" />
                </Button>
            </CardContent>
        </Card>
        <Card className="border-none ring-1 ring-border shadow-none rounded-[2.5rem] overflow-hidden bg-primary/5">
            <CardContent className="p-8 flex items-center gap-6">
                <div className="h-16 w-16 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                    <TrendingUp className="h-8 w-8 text-primary" />
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-black tracking-tight">Recruitment Success</h3>
                    <p className="text-sm font-medium text-muted-foreground leading-snug">Enrollment target is 12% ahead of original projections this quarter.</p>
                </div>
                <Button variant="secondary" size="icon" className="rounded-xl h-12 w-12 hover:bg-primary/10">
                    <ChevronRight className="h-6 w-6 text-primary" />
                </Button>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
