
"use client";

import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  FileText, 
  Search, 
  Filter, 
  ArrowLeft,
  Loader2,
  Users,
  Clock,
  History,
  Info,
  ChevronRight,
  Eye,
  Activity,
  MessageSquare,
  Tag,
  User as UserIcon,
  Sparkles,
  Download
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { type ParticipantNote } from '@/types';
import { cn } from '@/lib/utils';
import { useState, useMemo } from 'react';
import { IdBadge } from '@/app/anc/components/id-badge';
import { safeParseDate } from '@/lib/timeline/formulas';

export default function StudyNotesDashboard() {
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const notesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'participant_notes'), orderBy('created_at', 'desc'), limit(100));
  }, [firestore]);

  const { data: notes, isLoading } = useCollection<ParticipantNote>(notesQuery);

  const filteredNotes = useMemo(() => {
    if (!notes) return [];
    return notes.filter(n => {
        const lower = searchTerm.toLowerCase();
        const matchesSearch = n.title.toLowerCase().includes(lower) || 
                             n.content.toLowerCase().includes(lower) ||
                             n.participant_name.toLowerCase().includes(lower) ||
                             n.tags?.some(t => t.toLowerCase().includes(lower));
        const matchesCat = categoryFilter === 'all' || n.category === categoryFilter;
        return matchesSearch && matchesCat;
    });
  }, [notes, searchTerm, categoryFilter]);

  const stats = useMemo(() => {
    if (!notes) return null;
    const catMap: Record<string, number> = {};
    notes.forEach(n => catMap[n.category] = (catMap[n.category] || 0) + 1);
    return {
        total: notes.length,
        categories: Object.entries(catMap).sort((a, b) => b[1] - a[1])
    };
  }, [notes]);

  const exportNotes = () => {
    if (!filteredNotes.length) return;
    const headers = ["Date", "Participant", "Facility", "Author", "Category", "Title", "Content", "Importance", "Tags"];
    const rows = filteredNotes.map(n => [
        format(safeParseDate(n.created_at) || new Date(), 'yyyy-MM-dd'),
        n.participant_name,
        n.participant_facility,
        n.author_name,
        n.category,
        `"${n.title}"`,
        `"${n.content.replace(/"/g, '""')}"`,
        n.importance,
        `"${n.tags?.join(', ')}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `study_notes_${format(new Date(), 'yyyy-MM-dd')}.csv`; a.click();
  };

  if (isLoading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12 pt-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
            <Button variant="secondary" size="icon" asChild className="rounded-xl"><Link href="/anc/activities"><ArrowLeft className="h-5 w-5" /></Link></Button>
            <div>
                <h1 className="text-3xl font-black tracking-tighter">Study Notes Hub</h1>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Global Qualitative Database & Insights</p>
            </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
            <Button variant="outline" onClick={exportNotes} className="flex-1 h-11 rounded-xl font-bold border-2"><Download className="mr-2 h-4 w-4" /> Export for Analysis</Button>
            <Button asChild className="flex-1 h-11 rounded-xl font-black uppercase text-[10px] tracking-widest bg-violet-600 hover:bg-violet-700 shadow-lg shadow-violet-500/20 text-white">
                <Link href="/anc/dashboard"><Users className="mr-2 h-4 w-4" /> Registry View</Link>
            </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-6">
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/40" />
                    <Input placeholder="Search across all study notes..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 h-12 rounded-2xl border-none ring-1 ring-slate-200 bg-white" />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full sm:w-56 h-12 rounded-2xl bg-white ring-1 ring-slate-200 font-bold text-xs uppercase tracking-widest">
                        <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {stats?.categories.map(([cat]) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-4">
                {filteredNotes.length === 0 ? (
                    <div className="py-32 text-center border-2 border-dashed rounded-[3rem] bg-muted/20 flex flex-col items-center gap-4">
                        <MessageSquare className="h-12 w-12 text-slate-300" />
                        <p className="text-xs font-black uppercase tracking-widest text-slate-400">No notes match your active filters</p>
                    </div>
                ) : (
                    filteredNotes.map(note => (
                        <Card key={note.id} className="border-none ring-1 ring-border/50 shadow-sm rounded-3xl overflow-hidden bg-white hover:ring-violet-400 transition-all">
                            <CardContent className="p-6 space-y-4">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 ring-1 ring-slate-100">
                                            <UserIcon className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-black text-sm text-slate-900 leading-none">{note.participant_name}</p>
                                                <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black uppercase px-2 h-4">{note.participant_facility.split(' (')[0]}</Badge>
                                            </div>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">{note.author_name} ({note.author_role}) • {format(safeParseDate(note.created_at) || new Date(), 'dd MMM yyyy')}</p>
                                        </div>
                                    </div>
                                    <Badge className={cn("rounded-md border-none font-black text-[9px] uppercase px-2 h-5 tracking-widest", 
                                        note.importance === 'critical' ? 'bg-rose-100 text-rose-700' : 
                                        note.importance === 'high' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                                    )}>
                                        {note.importance}
                                    </Badge>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="rounded-md border-violet-200 text-violet-700 bg-violet-50/50 font-black text-[8px] uppercase">{note.category}</Badge>
                                        <h4 className="font-black text-base text-slate-900 leading-tight">{note.title}</h4>
                                    </div>
                                    <p className="text-xs font-medium text-slate-600 leading-relaxed bg-slate-50/50 p-4 rounded-2xl border border-slate-100 italic">"{note.content}"</p>
                                </div>
                                <div className="flex items-center justify-between pt-2">
                                    <div className="flex flex-wrap gap-1.5">
                                        {note.tags?.map(tag => (
                                            <span key={tag} className="text-[8px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 px-2 py-0.5 rounded flex items-center gap-1">
                                                <Tag className="h-2 w-2" /> {tag}
                                            </span>
                                        ))}
                                    </div>
                                    <Button asChild variant="ghost" size="sm" className="h-8 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/10 hover:text-primary">
                                        <Link href={`/anc/participants/${encodeURIComponent(note.participant_id)}`}>Dossier <ChevronRight className="ml-1 h-3 w-3" /></Link>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
            <Card className="border-none ring-1 ring-border shadow-sm rounded-3xl overflow-hidden bg-white">
                <CardHeader className="bg-primary/5 border-b p-6">
                    <CardTitle className="text-sm font-black uppercase tracking-tight">Category Mix</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                    {stats?.categories.map(([cat, count]) => (
                        <div key={cat} className="space-y-1.5">
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                <span className="text-slate-500">{cat}</span>
                                <span className="text-primary">{count}</span>
                            </div>
                            <Progress value={(count / (stats?.total || 1)) * 100} className="h-1.5 rounded-full bg-slate-100" />
                        </div>
                    ))}
                </CardContent>
            </Card>

            <Card className="border-none ring-1 ring-border shadow-lg rounded-3xl overflow-hidden bg-slate-900 text-white">
                <CardHeader className="p-6 pb-0">
                    <div className="flex items-center gap-3">
                        <Sparkles className="h-5 w-5 text-emerald-400" />
                        <CardTitle className="text-sm font-black uppercase tracking-tight">AI Monthly Insights</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                    <p className="text-[10px] font-medium leading-relaxed uppercase tracking-widest opacity-60">These notes feed directly into the Monthly Intelligence Reports, allowing the system to extract themes around financial barriers and family dynamics.</p>
                    <div className="p-4 bg-white/10 rounded-2xl border border-white/10 italic text-[11px] font-medium">
                        "Top recurring theme identified this month: Logistical challenges related to distance from health facilities."
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
