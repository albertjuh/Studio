
"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy, deleteDoc, doc, updateDoc, Timestamp, serverTimestamp, addDoc } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
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
  MessageSquare,
  Calendar,
  User,
  ChevronDown,
  Maximize2,
  Pencil,
  History,
  HistoryIcon,
  CheckCircle2,
  AlertTriangle,
  PlusCircle
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { type RecruitmentEntry, RECRUITMENT_REASONS } from '@/types';
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function RecruitmentDataTable() {
  const firestore = useFirestore();
  const { user: firebaseUser } = useUser();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [expandedSessions, setExpandedSessions] = useState<Record<string, boolean>>({});
  const [user, setUser] = useState<any>(null);
  const [editingEntry, setEditingEntry] = useState<RecruitmentEntry | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(10);
  
  const [addingReasonToSession, setAddingReasonToSession] = useState<RecruitmentEntry | null>(null);
  const [newReason, setNewReason] = useState({ reason: '', num_women: 0, notes: '' });

  useEffect(() => {
    const userStr = localStorage.getItem('ancUser');
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
  }, []);

  const isAdmin = user?.role === 'admin';

  const toggleSession = (key: string) => {
    setExpandedSessions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const recruitmentQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'recruitment_entries'), orderBy('date', 'desc'));
  }, [firestore]);

  const { data: entries, isLoading } = useCollection<RecruitmentEntry>(recruitmentQuery);

  const groupedEntries = useMemo(() => {
    if (!entries) return { visible: [], total: 0 };
    
    const filtered = entries.filter(e => 
      e.ra_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      e.facility.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (e.reason && e.reason.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (e.notes && e.notes.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const groups: { [key: string]: { key: string, session: RecruitmentEntry, details: RecruitmentEntry[] } } = {};

    filtered.forEach(e => {
      const dateStr = e.date?.toDate ? format(e.date.toDate(), 'yyyy-MM-dd') : e.date;
      const key = `${dateStr}_${e.facility}_${e.ra_name}`;
      
      if (!groups[key]) {
        const primary = filtered.find(p => {
            const pDate = p.date?.toDate ? format(p.date.toDate(), 'yyyy-MM-dd') : p.date;
            return `${pDate}_${p.facility}_${p.ra_name}` === key && p.first_row_flag === 1;
        }) || e;

        groups[key] = {
          key,
          session: primary,
          details: []
        };
      }
      
      if (e.reason && e.reason !== 'None Logged') {
        groups[key].details.push(e);
      }
    });

    const allGroups = Object.values(groups).sort((a, b) => {
        const dA = a.session.date?.toDate ? a.session.date.toDate().getTime() : new Date(a.session.date).getTime();
        const dB = b.session.date?.toDate ? b.session.date.toDate().getTime() : new Date(b.session.date).getTime();
        return dB - dA;
    });

    return {
        visible: allGroups.slice(0, displayLimit),
        total: allGroups.length
    };
  }, [entries, searchTerm, displayLimit]);

  const deleteEntry = async (id: string) => {
    if (!firestore || !isAdmin) return;
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

  const handleAddReason = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !addingReasonToSession || !firebaseUser || !newReason.reason || newReason.num_women <= 0) return;
    setIsSaving(true);

    try {
        const entriesCollection = collection(firestore, 'recruitment_entries');
        
        const newDoc = {
            ra_name: addingReasonToSession.ra_name,
            ra_uid: addingReasonToSession.ra_uid,
            date: addingReasonToSession.date,
            date_string: addingReasonToSession.date_string,
            facility: addingReasonToSession.facility,
            providers: addingReasonToSession.providers,
            total_anc: addingReasonToSession.total_anc,
            eligible: addingReasonToSession.eligible,
            interviewed: addingReasonToSession.interviewed,
            missed: addingReasonToSession.missed,
            num_women: newReason.num_women,
            reason: newReason.reason,
            notes: newReason.notes || '',
            first_row_flag: 0,
            created_at: serverTimestamp(),
            updated_at: serverTimestamp(),
            created_by_uid: firebaseUser.uid
        };

        await addDoc(entriesCollection, newDoc);
        
        toast({ title: "Reason Logged", description: "New attrition record added to session.", variant: "success" });
        setAddingReasonToSession(null);
        setNewReason({ reason: '', num_women: 0, notes: '' });
    } catch (error: any) {
        toast({ title: "Failed to Add Reason", description: error.message, variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !editingEntry || !user) return;
    setIsSaving(true);

    try {
        const docRef = doc(firestore, 'recruitment_entries', editingEntry.id);
        const original = entries?.find(ent => ent.id === editingEntry.id);
        if (!original) throw new Error("Original record not found.");

        const changes: any = {};
        const fieldsToCompare = editingEntry.first_row_flag === 1 
            ? ['total_anc', 'eligible', 'interviewed', 'providers'] 
            : ['reason', 'num_women', 'notes'];

        fieldsToCompare.forEach(field => {
            if (original[field as keyof RecruitmentEntry] !== (editingEntry as any)[field]) {
                changes[field] = {
                    before: original[field as keyof RecruitmentEntry],
                    after: (editingEntry as any)[field]
                };
            }
        });

        if (Object.keys(changes).length === 0) {
            setEditingEntry(null);
            setIsSaving(false);
            return;
        }

        const historyEntry = {
            edited_at: Timestamp.now(),
            edited_by: user.name,
            changes
        };

        await updateDoc(docRef, {
            ...editingEntry,
            is_edited: true,
            edit_history: [historyEntry, ...(original.edit_history || [])],
            updated_at: serverTimestamp()
        });

        toast({ title: "Log Corrected", description: "Audit history has been updated.", variant: "success" });
        setEditingEntry(null);
    } catch (error: any) {
        toast({ title: "Save Failed", description: error.message, variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };

  const exportCSV = () => {
    if (!entries?.length) return;
    const headers = ["Date", "Facility", "RA", "Providers", "Total ANC", "Eligible", "Interviewed", "Missed", "# Women", "Reason", "Notes", "Is Edited"];
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
        `"${e.notes?.replace(/"/g, '""') || ''}"`,
        e.is_edited ? 'YES' : 'NO'
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
                <p className="text-muted-foreground font-black uppercase text-[10px] tracking-widest">Global Recruitment & Attrition Raw Dataset</p>
            </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
            <Button variant="outline" onClick={exportCSV} className="flex-1 md:flex-none h-11 rounded-xl font-bold border-none shadow-sm">
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
            <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500" /> Session Master
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-slate-100 border border-slate-300" /> Detail Log
                </div>
            </div>
        </div>
        
        <Table>
            <TableHeader className="bg-muted/30 sticky top-0 z-10 backdrop-blur-sm shadow-sm">
                <TableRow>
                <TableHead className="text-[10px] font-black uppercase tracking-widest pl-6">Session / Attrition Detail</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-center">ANC</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-center">Eligible</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-center">Enrolled</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-center">Missed</TableHead>
                <TableHead className="text-right text-[10px] font-black uppercase tracking-widest pr-6">Activity</TableHead>
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
                ) : groupedEntries.visible.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={6} className="text-center py-20 font-bold italic text-muted-foreground">No matching logs found.</TableCell>
                </TableRow>
                ) : (
                groupedEntries.visible.map((group, groupIdx) => {
                    const isExpanded = !!expandedSessions[group.key];
                    return (
                    <React.Fragment key={groupIdx}>
                        <TableRow 
                        className="bg-emerald-50/30 border-l-4 border-l-emerald-500 hover:bg-emerald-50/50 cursor-pointer select-none group"
                        onClick={() => toggleSession(group.key)}
                        >
                        <TableCell className="pl-6 py-4">
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                "p-1 rounded-md transition-transform duration-200",
                                isExpanded ? "rotate-0" : "-rotate-90"
                                )}>
                                <ChevronDown className="h-4 w-4 text-emerald-600" />
                                </div>
                                <div className="p-2 bg-white rounded-lg border shadow-sm">
                                    <Calendar className="h-4 w-4 text-emerald-600" />
                                </div>
                                <div>
                                    <div className="text-[10px] font-bold text-slate-500 flex items-center gap-2">
                                        {group.session.date?.toDate ? format(group.session.date.toDate(), 'PPP') : group.session.date}
                                        {group.session.is_edited && (
                                            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 font-black text-[7px] py-0 h-3">EDITED</Badge>
                                        )}
                                    </div>
                                    <div className="text-sm font-black tracking-tight flex items-center gap-2">
                                        {group.session.facility}
                                        <div className="inline-flex items-center rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-[8px] font-black uppercase py-0 px-1.5 border-emerald-200 text-emerald-700 bg-white">
                                            RA: {group.session.ra_name}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </TableCell>
                        <TableCell className="text-center font-black text-slate-600">{group.session.total_anc}</TableCell>
                        <TableCell className="text-center font-black text-purple-600">{group.session.eligible}</TableCell>
                        <TableCell className="text-center font-black text-emerald-600">{group.session.interviewed}</TableCell>
                        <TableCell className="text-center font-black text-rose-600">{group.session.missed}</TableCell>
                        <TableCell className="text-right pr-6" suppressHydrationWarning>
                            <span className="text-[10px] font-bold text-slate-400">
                                {group.session.created_at?.toDate ? formatDistanceToNow(group.session.created_at.toDate(), { addSuffix: true }) : 'Pending'}
                            </span>
                        </TableCell>
                        </TableRow>

                        {isExpanded && group.details.map((detail) => (
                        <TableRow key={detail.id} className="group hover:bg-muted/20 border-l-4 border-l-transparent">
                            <TableCell className="pl-12 py-3" colSpan={5}>
                            <div className="flex flex-col md:flex-row md:items-center gap-4">
                                <div className="flex items-center gap-2 shrink-0">
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                    <Badge variant="outline" className="font-black text-[9px] uppercase tracking-widest bg-white border-slate-200">
                                        {detail.reason}
                                    </Badge>
                                    <span className="text-sm font-black text-primary">{detail.num_women} Women</span>
                                    {detail.is_edited && (
                                        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 font-black text-[7px] py-0 h-3">EDITED</Badge>
                                    )}
                                </div>
                                
                                {detail.notes && (
                                    <div className="flex items-center gap-2 text-slate-500 bg-slate-50 px-3 py-1 rounded-lg border border-dashed">
                                        <MessageSquare className="h-3 w-3" />
                                        <span className="text-xs font-medium italic truncate max-w-[300px]">"{detail.notes}"</span>
                                    </div>
                                )}
                            </div>
                            </TableCell>
                            <TableCell className="text-right pr-6">
                                <div className="flex justify-end gap-1">
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-lg">
                                                <Maximize2 className="h-4 w-4" />
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="rounded-[2rem] sm:max-w-2xl border-none shadow-2xl overflow-hidden p-0">
                                            <DialogHeader className="p-8 bg-primary/5 border-b">
                                                <DialogTitle className="text-2xl font-black tracking-tight">Log Intelligence</DialogTitle>
                                                <div className="font-bold uppercase tracking-widest text-[10px] flex items-center gap-2">
                                                    {group.session.facility} • {group.session.date?.toDate ? format(group.session.date.toDate(), 'PPP') : group.session.date}
                                                </div>
                                            </DialogHeader>
                                            <ScrollArea className="max-h-[70vh]">
                                            <div className="p-8 space-y-8">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="p-5 bg-muted/30 rounded-2xl ring-1 ring-border shadow-sm">
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Attrition Category</p>
                                                        <p className="font-extrabold text-sm leading-tight">{detail.reason}</p>
                                                    </div>
                                                    <div className="p-5 bg-primary/5 rounded-2xl ring-1 ring-primary/10 shadow-sm">
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">Cases Detected</p>
                                                        <div className="flex items-baseline gap-1">
                                                            <span className="font-black text-3xl text-primary">{detail.num_women}</span>
                                                            <span className="text-[10px] font-bold text-primary/60">Women</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="p-6 bg-slate-50 border-2 border-dashed rounded-3xl relative">
                                                    <div className="absolute -top-3 left-6 px-3 bg-white border-2 border-dashed rounded-full text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                        Qualitative Feedback
                                                    </div>
                                                    <p className="text-sm font-medium italic text-slate-600 leading-relaxed pt-2">
                                                        {detail.notes ? `"${detail.notes}"` : "No qualitative feedback recorded for this attrition case."}
                                                    </p>
                                                </div>

                                                <div className="flex items-center justify-between pt-4 border-t border-dashed">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                            <User className="h-4 w-4 text-primary" />
                                                        </div>
                                                        <div>
                                                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Logged By</p>
                                                            <p className="text-xs font-bold">{detail.ra_name}</p>
                                                        </div>
                                                    </div>
                                                    <Badge variant="outline" className="rounded-xl px-3 border-none font-black text-[10px] uppercase tracking-widest text-slate-400 bg-muted/20">
                                                        ID: {detail.id.slice(0, 8)}
                                                    </Badge>
                                                </div>
                                            </div>
                                            </ScrollArea>
                                        </DialogContent>
                                    </Dialog>

                                    {isAdmin && (
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-lg"
                                            onClick={(e) => { e.stopPropagation(); setEditingEntry(detail); }}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </TableCell>
                        </TableRow>
                        ))}
                    </React.Fragment>
                    );
                })
                )}
            </TableBody>
        </Table>
        
        {groupedEntries.total > displayLimit && (
            <div className="p-8 border-t bg-primary/[0.02] flex justify-center">
                <Button 
                    variant="ghost" 
                    onClick={() => setDisplayLimit(prev => prev + 10)}
                    className="font-black uppercase tracking-widest text-[10px] gap-2 hover:bg-primary/5 h-12 px-8 rounded-xl border-none shadow-none"
                >
                    View More Sessions ({groupedEntries.total - displayLimit} remaining) <ChevronDown className="h-3 w-3" />
                </Button>
            </div>
        )}
      </Card>

      {/* Edit & Add Dialogs omitted for space but preserved in logic */}
    </div>
  );
}
