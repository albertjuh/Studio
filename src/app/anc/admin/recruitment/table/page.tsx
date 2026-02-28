
"use client";

import { useMemo, useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Download, ArrowLeft, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
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

  const filteredEntries = useMemo(() => {
    if (!entries) return [];
    const lower = searchTerm.toLowerCase();
    return entries.filter(e => 
      e.ra_name.toLowerCase().includes(lower) || 
      e.facility.toLowerCase().includes(lower) || 
      (e.reason && e.reason.toLowerCase().includes(lower))
    );
  }, [entries, searchTerm]);

  const deleteEntry = async (id: string) => {
    if (!firestore) return;
    setIsDeletingId(id);
    try {
        await deleteDoc(doc(firestore, 'recruitment_entries', id));
        toast({ title: "Entry Removed", description: "The recruitment log has been permanently deleted.", variant: "success" });
    } catch (error: any) {
        toast({ title: "Deletion Failed", description: error.message, variant: "destructive" });
    } finally {
        setIsDeletingId(null);
    }
  };

  const exportCSV = () => {
    if (!filteredEntries.length) return;
    const headers = ["Date", "Facility", "RA", "Providers", "Total ANC", "Eligible", "Interviewed", "Missed", "# Women", "Reason", "Notes", "Flag"];
    const rows = filteredEntries.map(e => [
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
        `"${e.notes?.replace(/"/g, '""') || ''}"`,
        e.first_row_flag
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `detailed_recruitment_raw_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="rounded-xl">
            <Link href="/anc/admin/recruitment"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div>
          <h1 className="text-3xl font-black tracking-tighter">Detailed Recruitment Registry</h1>
          <p className="text-muted-foreground font-medium">Full granular dataset of all recruitment sessions and reason logs.</p>
        </div>
      </div>

      <Card className="border-none shadow-xl ring-1 ring-border overflow-hidden">
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-primary/5 border-b">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by RA, facility, or reason..." 
              className="pl-10 h-11 rounded-xl border-2 font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={exportCSV} disabled={!filteredEntries.length} className="h-11 rounded-xl font-bold border-2">
            <Download className="mr-2 h-4 w-4" /> Export Complete Dataset
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-emerald-50/60">
                <TableRow>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-emerald-800/70 pl-6">Date</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-emerald-800/70">Facility</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-emerald-800/70">RA</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-emerald-800/70">ANC</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-emerald-800/70">Missed</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-emerald-800/70">Reason</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-emerald-800/70 pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-20 font-bold italic text-muted-foreground">Synchronizing data...</TableCell>
                  </TableRow>
                ) : filteredEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-20 font-bold italic text-muted-foreground">No matching entries found.</TableCell>
                  </TableRow>
                ) : (
                  filteredEntries.map((e) => (
                    <TableRow 
                      key={e.id} 
                      className="group transition-all duration-300 hover:bg-primary/[0.04] hover:translate-x-1 border-l-4 border-l-transparent hover:border-l-primary/50"
                    >
                      <TableCell className="whitespace-nowrap text-[10px] font-bold text-slate-500 pl-6 py-4">
                        {e.date?.toDate ? format(e.date.toDate(), 'dd/MM/yy') : e.date}
                      </TableCell>
                      <TableCell className="max-w-[120px] truncate text-xs font-extrabold">{e.facility}</TableCell>
                      <TableCell className="text-xs font-bold">{e.ra_name}</TableCell>
                      <TableCell className="text-right text-xs font-bold text-blue-600">{e.total_anc}</TableCell>
                      <TableCell className="text-right text-xs font-black text-rose-600">{e.missed}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-black text-[9px] uppercase tracking-tighter bg-white px-2 py-0.5 border-slate-200">{e.reason}</Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 rounded-lg">
                                {isDeletingId === e.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="rounded-2xl">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="font-black text-2xl tracking-tight">Delete Log Entry?</AlertDialogTitle>
                              <AlertDialogDescription className="font-medium">
                                Are you sure you want to remove this log for <span className="text-foreground font-extrabold">{e.ra_name}</span> at <span className="text-foreground font-extrabold">{e.facility}</span>? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="rounded-xl font-bold">Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteEntry(e.id)} className="bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700">
                                Delete Entry
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
