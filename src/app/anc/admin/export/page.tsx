
"use client";

import { useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Database, 
  Users, 
  ClipboardList, 
  ArrowLeft,
  ShieldCheck,
  FileSpreadsheet,
  Activity,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { type AncRegistration, type RecruitmentEntry } from '@/types';
import { safeParseDate } from '@/lib/timeline/formulas';

export default function ExportCenter() {
  const firestore = useFirestore();

  const registrationsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'anc_registrations'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const recruitmentQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'recruitment_entries'), orderBy('date', 'desc'));
  }, [firestore]);

  const { data: registrations, isLoading: isRegLoading } = useCollection<AncRegistration>(registrationsQuery);
  const { data: recruitment, isLoading: isRecLoading } = useCollection<RecruitmentEntry>(recruitmentQuery);

  const exportRegistrations = () => {
    if (!registrations || registrations.length === 0) return;
    const headers = [
        'Participant ID', 'Full Name', 'Age', 'Marital Status', 'Health Facility', 
        'Gestational Age', 'First ANC Date', 'Study Status', 'Withdrawal Reason', 
        'Withdrawal Date', 'Relocation Location', 'Delivery Outcome', 'Registered By', 'Created At'
    ];
    const rows = registrations.map((reg: any) => [
        reg.participantId,
        `"${reg.name}"`,
        reg.age,
        reg.maritalStatus,
        `"${reg.healthFacility}"`,
        reg.gestationalAge,
        reg.firstAncDate?.toDate ? format(reg.firstAncDate.toDate(), 'yyyy-MM-dd') : reg.firstAncDate,
        reg.study_status || 'active',
        `"${reg.withdrawal_reason || ''}"`,
        reg.withdrawal_date ? format(safeParseDate(reg.withdrawal_date)!, 'yyyy-MM-dd') : '',
        `"${reg.relocation_location || ''}"`,
        reg.delivery_outcome || '',
        reg.registeredBy,
        reg.createdAt ? format(safeParseDate(reg.createdAt)!, 'yyyy-MM-dd HH:mm') : ''
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadCSV(csvContent, `cohort_registrations_full_${format(new Date(), 'yyyy-MM-dd')}.csv`);
  };

  const exportRecruitment = () => {
    if (!recruitment || recruitment.length === 0) return;
    const headers = ['Date', 'Facility', 'RA Name', 'Providers', 'Total ANC', 'Eligible', 'Interviewed', 'Missed', 'Attrition Reason', 'Attrition Count', 'Notes'];
    const rows = recruitment.map((e: any) => [
        e.date?.toDate ? format(e.date.toDate(), 'yyyy-MM-dd') : e.date,
        `"${e.facility}"`,
        e.ra_name,
        e.providers,
        e.total_anc,
        e.eligible,
        e.interviewed,
        e.missed,
        `"${e.reason}"`,
        e.num_women,
        `"${e.notes?.replace(/"/g, '""') || ''}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadCSV(csvContent, `recruitment_logs_full_${format(new Date(), 'yyyy-MM-dd')}.csv`);
  };

  const downloadCSV = (content: string, fileName: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-24 lg:pb-12">
      <div className="flex items-center gap-4">
        <Button variant="secondary" size="icon" asChild className="rounded-xl">
            <Link href="/anc/activities"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div>
          <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-[10px] mb-1">
              <ShieldCheck className="h-4 w-4" /> Data Intelligence Hub
          </div>
          <h1 className="text-4xl font-black tracking-tighter">Export Center</h1>
          <p className="text-sm font-medium text-muted-foreground">Global data consolidation and intelligence exports.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Registration Dataset Card */}
        <Card className="border-none ring-1 ring-border shadow-xl overflow-hidden group hover:ring-primary/40 transition-all">
          <CardHeader className="bg-emerald-50/50 border-b p-8">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-emerald-600 rounded-2xl text-white">
                <Users className="h-6 w-6" />
              </div>
              <Badge variant="outline" className="bg-white font-black text-[10px] uppercase tracking-widest border-emerald-200 text-emerald-700">
                Cohort Population
              </Badge>
            </div>
            <CardTitle className="text-2xl font-black tracking-tight">Global Registry</CardTitle>
            <CardDescription className="text-sm font-medium">Full granular dataset of all enrolled study participants with clinical status and withdrawals.</CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="flex items-center gap-6 text-sm">
                <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Records</span>
                    <span className="font-black text-xl">{isRegLoading ? '...' : registrations?.length || 0}</span>
                </div>
                <div className="h-10 w-px bg-border" />
                <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Last Sync</span>
                    <span className="font-bold text-slate-600">{format(new Date(), 'HH:mm a')}</span>
                </div>
            </div>
            <Button 
                onClick={exportRegistrations} 
                disabled={isRegLoading || !registrations?.length}
                className="w-full h-14 rounded-2xl font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700"
            >
              <FileSpreadsheet className="mr-2 h-5 w-5" /> Export Registry Dataset
            </Button>
          </CardContent>
        </Card>

        {/* Recruitment Dataset Card */}
        <Card className="border-none ring-1 ring-border shadow-xl overflow-hidden group hover:ring-primary/40 transition-all">
          <CardHeader className="bg-blue-50/50 border-b p-8">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-blue-600 rounded-2xl text-white">
                <ClipboardList className="h-6 w-6" />
              </div>
              <Badge variant="outline" className="bg-white font-black text-[10px] uppercase tracking-widest border-blue-200 text-blue-700">
                Tracking Logs
              </Badge>
            </div>
            <CardTitle className="text-2xl font-black tracking-tight">Recruitment Logs</CardTitle>
            <CardDescription className="text-sm font-medium">Daily facility-level workload, staffing counts, and attrition driver raw logs.</CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="flex items-center gap-6 text-sm">
                <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Entries</span>
                    <span className="font-black text-xl">{isRecLoading ? '...' : recruitment?.length || 0}</span>
                </div>
                <div className="h-10 w-px bg-border" />
                <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Status</span>
                    <span className="font-bold text-blue-600 flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" /> LIVE
                    </span>
                </div>
            </div>
            <Button 
                onClick={exportRecruitment} 
                disabled={isRecLoading || !recruitment?.length}
                className="w-full h-14 rounded-2xl font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-700"
            >
              <Activity className="mr-2 h-5 w-5" /> Export Recruitment Data
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none ring-1 ring-border shadow-lg bg-primary/5">
        <CardContent className="p-8 flex flex-col md:flex-row items-center gap-6">
            <div className="p-4 bg-white rounded-2xl border-2 border-primary/20">
                <Calendar className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1 text-center md:text-left">
                <h3 className="text-xl font-black tracking-tight mb-1">Intelligence Reviews</h3>
                <p className="text-sm font-medium text-muted-foreground">Admin review queue for ethical data requests and protocol deviations is active.</p>
            </div>
            <Button asChild variant="outline" className="h-12 px-6 rounded-xl font-black uppercase tracking-widest border-2 bg-white text-slate-900">
                <Link href="/anc/admin/review-queue">Open Review Queue</Link>
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}
