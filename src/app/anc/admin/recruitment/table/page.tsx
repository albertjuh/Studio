"use client";

import React, { useMemo, useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Download, 
  ArrowLeft, 
  Trash2, 
  Loader2, 
  Info, 
  MessageSquare,
  Calendar,
  Hospital,
  User,
  Users2,
  ChevronDown
} from 'lucide-react';
import { format } from 'date-fns';
import { type RecruitmentEntry } from '@/types';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
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

export default function RecruitmentDataTable() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  const recruitmentQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'recruitment_entries'), orderBy('date', 'desc'));
  }, [firestore]);

  const { data: entries, isLoading } = useCollection<RecruitmentEntry>(recruitmentQuery);

  // Group entries by session (Date + Facility + RA)
  const groupedEntries = useMemo(() => {
    if (!entries) return [];
    
    const filtered = entries.filter(e => 
      e.ra_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      e.facility.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (e.reason && e.reason.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (e.notes && e.notes.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const groups: { [key: string]: { session: RecruitmentEntry, details: RecruitmentEntry[] } } = {};

    filtered.forEach(e => {
      const dateStr = e.date?.toDate ? format(e.date.toDate(), 'yyyy-MM-dd') : e.date;
      const key = `${dateStr}_${e.facility}_${e.ra_name}`;
      
      if (!groups[key]) {
        // We find the 'primary' row for this session to get the totals
        const primary = filtered.find(p => {
            const pDate = p.date?.toDate ? format(p.date.toDate(), 'yyyy-MM-dd') : p.date;
            return `${pDate}_${p.facility}_${p.ra_name}` === key && p.first_row_flag === 1;
        }) || e;

        groups[key] = {
          session: primary,
          details: []
        };
      }
      
      if (e.reason && e.reason !== 'None Logged') {
        groups[key].details.push(e);
      } else if (e.first_row_flag === 1 && e.reason === 'None Logged') {
        // Keep sessions with no attrition for the header
      }
    });

    return Object.values(groups).sort((a, b) => {
        const dA = a.session.date?.toDate ? a.session.date.toDate().getTime() : new Date(a.session.date).getTime();
        const dB = b.session.date?.toDate ? b.session.date.toDate().getTime() : new Date(b.session.date).getTime();
        return dB - dA;
    });
  }, [entries, searchTerm]);

  const deleteEntry = async (id: string) => {
    if (!firestore) return;
    setIsDeletingId(id);
    try {
        await deleteDoc(doc(firestore, 'recruitment_entries', id));
        toast({ title: "Entry Removed", description: "Log has been permanently deleted.", variant: "success" });
    } catch (error: any) {
        toast({ title: "Deletion Failed", description: error.message, variant: "destructive" });
    } finally {
        setIsDeletingId(null);
    }
  };

  const exportCSV = () => {
    if (!entries?.length) return;
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
    a.download = `recruitment_system_logs_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild className="rounded-xl h-11 w-11">
                <Link href="/anc/activities"><ArrowLeft className="h-5 w-5" /></Link>
            </Button>
            <div>
                <h1 className="text-3xl font-black tracking-tighter">System Logs</h1>
                <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest">Global Recruitment & Attrition Raw Dataset</p>
            </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
            <Button variant="outline" onClick={exportCSV} className="flex-1 md:flex-none h-11 rounded-xl font-bold border-2">
                <Download className="mr-2 h-4 w-4" /> Export Raw Logs
            </Button>
        </div>
      </div>

      <Card className="border-none shadow-xl ring-1 ring-border overflow-hidden">
        <div className="p-4 bg-primary/5 border-b flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search sessions or notes..." 
                    className="pl-10 h-11 rounded-xl border-2 font-medium"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500" /> Session Summary
                <div className="w-3 h-3 rounded-full bg-slate-100 border border-slate-300" /> Detail
            </div>
        </div>
        
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="text-[10px] font-black uppercase tracking-widest pl-6">Session / Attrition Detail</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-center">ANC</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-center">Eligible</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-center">Enrolled</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-center">Missed</TableHead>
                <TableHead className="text-right text-[10px] font-black uppercase tracking-widest pr-6">Controls</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-20 font-bold italic text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                    Synchronizing Logs...
                  </TableCell>
                </TableRow>
              ) : groupedEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-20 font-bold italic text-muted-foreground">No matching logs found.</TableCell>
                </TableRow>
              ) : (
                groupedEntries.map((group, groupIdx) => (
                  <React.Fragment key={groupIdx}>
                    {/* Session Header Row */}
                    <TableRow className="bg-emerald-50/30 border-l-4 border-l-emerald-500 hover:bg-emerald-50/50">
                      <TableCell className="pl-6 py-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white rounded-lg border shadow-sm">
                                <Calendar className="h-4 w-4 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-500">
                                    {group.session.date?.toDate ? format(group.session.date.toDate(), 'PPP') : group.session.date}
                                </p>
                                <p className="text-sm font-black tracking-tight flex items-center gap-2">
                                    {group.session.facility}
                                    <Badge variant="outline" className="text-[8px] font-black uppercase py-0 px-1.5 border-emerald-200 text-emerald-700 bg-white">
                                        RA: {group.session.ra_name}
                                    </Badge>
                                </p>
                            </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-black text-slate-600">{group.session.total_anc}</TableCell>
                      <TableCell className="text-center font-black text-purple-600">{group.session.eligible}</TableCell>
                      <TableCell className="text-center font-black text-emerald-600">{group.session.interviewed}</TableCell>
                      <TableCell className="text-center font-black text-rose-600">{group.session.missed}</TableCell>
                      <TableCell className="text-right pr-6">
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 font-black text-[8px] uppercase tracking-tighter">SESSION MASTER</Badge>
                      </TableCell>
                    </TableRow>

                    {/* Detail Rows for this Session */}
                    {group.details.map((detail) => (
                      <TableRow key={detail.id} className="group hover:bg-muted/20 border-l-4 border-l-transparent">
                        <TableCell className="pl-12 py-3" colSpan={5}>
                          <div className="flex flex-col md:flex-row md:items-center gap-4">
                            <div className="flex items-center gap-2 shrink-0">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                <Badge variant="outline" className="font-black text-[9px] uppercase tracking-widest bg-white border-slate-200">
                                    {detail.reason}
                                </Badge>
                                <span className="text-sm font-black text-primary">{detail.num_women} Women</span>
                            </div>
                            
                            {detail.notes && (
                                <div className="flex items-center gap-2 text-slate-500 bg-slate-50 px-3 py-1 rounded-lg border border-dashed">
                                    <MessageSquare className="h-3 w-3" />
                                    <span className="text-xs font-medium italic">"{detail.notes}"</span>
                                </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                        {isDeletingId === detail.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-2xl">
                                    <AlertDialogHeader>
                                    <AlertDialogTitle className="font-black text-2xl tracking-tight">Delete Detail Log?</AlertDialogTitle>
                                    <AlertDialogDescription className="font-medium">
                                        This will remove the attrition record for <span className="text-foreground font-extrabold">{detail.reason}</span>.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel className="rounded-xl font-bold">Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteEntry(detail.id)} className="bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700">
                                        Delete Entry
                                    </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                    
                    {group.details.length === 0 && (
                        <TableRow className="border-l-4 border-l-transparent">
                            <TableCell className="pl-12 py-2 text-[10px] text-muted-foreground font-bold italic" colSpan={6}>
                                No attrition details logged for this session (All eligible women enrolled).
                            </TableCell>
                        </TableRow>
                    )}
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
