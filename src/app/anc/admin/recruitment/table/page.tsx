"use client";

import { useMemo, useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  LayoutList, 
  MessageSquare,
  ClipboardCheck,
  Calendar,
  Hospital,
  User,
  Activity
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

export default function RecruitmentDataTable() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<RecruitmentEntry | null>(null);

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
      (e.reason && e.reason.toLowerCase().includes(lower)) ||
      (e.notes && e.notes.toLowerCase().includes(lower))
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
            <Link href="/anc/activities"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div>
          <h1 className="text-3xl font-black tracking-tighter">System Logs</h1>
          <p className="text-muted-foreground font-medium">Full granular dataset of all recruitment sessions and reason logs.</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3 text-blue-800 text-xs font-bold leading-relaxed">
        <Info className="h-5 w-5 shrink-0 mt-0.5" />
        <div>
            <p className="font-black uppercase tracking-widest text-[10px] mb-1">Data Integrity Note</p>
            One session may contain multiple logs if multiple attrition reasons exist. Only <Badge variant="outline" className="h-4 px-1.5 text-[8px] bg-blue-100 border-blue-200">PRIMARY</Badge> rows contain clinical totals (ANC, Eligible, Interviewed) to prevent duplication in study-wide reports. Click the info icon on a <Badge variant="ghost" className="h-4 px-1.5 text-[8px] bg-white border-slate-200">DETAIL</Badge> row to see the RA's qualitative notes.
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
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-emerald-800/70 pl-6">Type</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-emerald-800/70">Date</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-emerald-800/70">Facility</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-emerald-800/70">RA</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-emerald-800/70">Eligible</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-emerald-800/70">Reason</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-emerald-800/70">Notes</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-emerald-800/70 pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-20 font-bold italic text-muted-foreground">Synchronizing data...</TableCell>
                  </TableRow>
                ) : filteredEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-20 font-bold italic text-muted-foreground">No matching entries found.</TableCell>
                  </TableRow>
                ) : (
                  filteredEntries.map((e) => (
                    <TableRow 
                      key={e.id} 
                      className={cn(
                        "group transition-all duration-300 hover:bg-primary/[0.04] hover:translate-x-1 border-l-4",
                        e.first_row_flag === 1 ? "border-l-blue-500 bg-blue-50/10" : "border-l-transparent"
                      )}
                    >
                      <TableCell className="pl-6 py-4">
                        {e.first_row_flag === 1 ? (
                            <Badge className="bg-blue-600 text-white font-black text-[8px] uppercase tracking-tighter">Primary</Badge>
                        ) : (
                            <Badge variant="ghost" className="text-slate-400 font-bold text-[8px] uppercase tracking-tighter">Detail</Badge>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-[10px] font-bold text-slate-500">
                        {e.date?.toDate ? format(e.date.toDate(), 'dd/MM/yy') : e.date}
                      </TableCell>
                      <TableCell className="max-w-[120px] truncate text-xs font-extrabold">{e.facility}</TableCell>
                      <TableCell className="text-xs font-bold">{e.ra_name}</TableCell>
                      <TableCell className="text-right text-xs font-bold text-purple-600">
                        {e.first_row_flag === 1 ? e.eligible : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-black text-[9px] uppercase tracking-tighter bg-white px-2 py-0.5 border-slate-200">
                            {e.num_women > 0 && <span className="mr-1 text-primary">{e.num_women}x</span>}
                            {e.reason}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[150px]">
                        {e.notes ? (
                            <div className="flex items-center gap-1.5 text-slate-400">
                                <MessageSquare className="h-3 w-3 shrink-0" />
                                <span className="text-[10px] font-medium truncate">{e.notes}</span>
                            </div>
                        ) : (
                            <span className="text-[10px] text-slate-300 italic">No notes</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-blue-50 hover:text-blue-600">
                                        <Info className="h-4 w-4" />
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="rounded-2xl sm:max-w-md">
                                    <DialogHeader>
                                        <DialogTitle className="text-2xl font-black tracking-tight">Log Entry Detail</DialogTitle>
                                        <DialogDescription className="text-[10px] font-bold uppercase tracking-widest">
                                            {e.first_row_flag === 1 ? 'Primary Workload Record' : 'Attrition Detail Record'}
                                        </DialogDescription>
                                    </DialogHeader>
                                    <ScrollArea className="max-h-[60vh] pr-4">
                                        <div className="space-y-6 py-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                                        <Calendar className="h-3 w-3" />
                                                        <span className="text-[9px] font-black uppercase tracking-widest">Date</span>
                                                    </div>
                                                    <p className="text-sm font-bold">{e.date?.toDate ? format(e.date.toDate(), 'PPP') : e.date}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                                        <Hospital className="h-3 w-3" />
                                                        <span className="text-[9px] font-black uppercase tracking-widest">Facility</span>
                                                    </div>
                                                    <p className="text-sm font-bold">{e.facility}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                                        <User className="h-3 w-3" />
                                                        <span className="text-[9px] font-black uppercase tracking-widest">Research Assistant</span>
                                                    </div>
                                                    <p className="text-sm font-bold">{e.ra_name}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                                        <Activity className="h-3 w-3" />
                                                        <span className="text-[9px] font-black uppercase tracking-widest">Providers</span>
                                                    </div>
                                                    <p className="text-sm font-bold">{e.providers} on shift</p>
                                                </div>
                                            </div>

                                            <Separator />

                                            <div className="space-y-4">
                                                <div className="bg-primary/5 p-4 rounded-xl space-y-3">
                                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Session Workload</h4>
                                                    <div className="grid grid-cols-3 gap-2 text-center">
                                                        <div className="space-y-0.5">
                                                            <p className="text-[8px] font-bold text-muted-foreground uppercase">ANC</p>
                                                            <p className="text-lg font-black">{e.first_row_flag === 1 ? e.total_anc : '—'}</p>
                                                        </div>
                                                        <div className="space-y-0.5">
                                                            <p className="text-[8px] font-bold text-muted-foreground uppercase">Eligible</p>
                                                            <p className="text-lg font-black">{e.first_row_flag === 1 ? e.eligible : '—'}</p>
                                                        </div>
                                                        <div className="space-y-0.5">
                                                            <p className="text-[8px] font-bold text-muted-foreground uppercase">Interviewed</p>
                                                            <p className="text-lg font-black">{e.first_row_flag === 1 ? e.interviewed : '—'}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="bg-amber-50 p-4 rounded-xl space-y-3">
                                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-700">Reason Detail</h4>
                                                    <div className="flex justify-between items-center">
                                                        <p className="text-sm font-bold text-amber-900">{e.reason}</p>
                                                        <Badge className="bg-amber-200 text-amber-900 border-none font-black">{e.num_women} Women</Badge>
                                                    </div>
                                                    {e.notes && (
                                                        <div className="bg-white/50 p-3 rounded-lg border border-amber-100">
                                                            <p className="text-[9px] font-black uppercase tracking-widest text-amber-600 mb-1">RA Notes</p>
                                                            <p className="text-xs font-medium text-amber-900 italic">"{e.notes}"</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </ScrollArea>
                                </DialogContent>
                            </Dialog>

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
                        </div>
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
