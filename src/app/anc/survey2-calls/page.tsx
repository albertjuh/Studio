"use client";

import { useMemo, useState, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, doc, updateDoc, Timestamp, addDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Phone, 
  CheckCircle2, 
  Building, 
  Home, 
  Users, 
  Loader2, 
  Baby, 
  MessageSquare,
  ArrowLeft,
  Timer,
  Calendar as CalendarIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { type AncRegistration } from '@/types';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { resolveParticipantStatuses } from '@/lib/timeline/formulas';
import { cn } from '@/lib/utils';

const RA_CONFIG: Record<string, { color: string; bg: string; border: string; text: string; icon: any }> = {
  'Riki Mahamba': { color: 'emerald', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: Building },
  'Lucy': { color: 'cyan', bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700', icon: Building },
  'Katie': { color: 'pink', bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700', icon: Home },
  'Majid': { color: 'amber', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: Home },
};

const DEFAULT_RA = { color: 'slate', bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', icon: Users };

export default function Survey2CallsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [filterRA, setFilterRA] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCalled, setShowCalled] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const partsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'anc_registrations'));
  }, [firestore]);

  const { data: participants, isLoading } = useCollection<AncRegistration>(partsQuery);

  const survey2Workload = useMemo(() => {
    if (!participants) return [];
    return participants
      .map((p: any) => ({ ...p, resolved: resolveParticipantStatuses(p) }))
      .filter((p: any) => {
        if (!p.resolved || !p.resolved.isValid) return false;
        const s = p.resolved.survey2_status;
        return s === 'due_now' || s === 'due_soon' || s === 'overdue' || s === 'completed';
      })
      .sort((a: any, b: any) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
        return dateA - dateB;
      });
  }, [participants]);

  const raStats = useMemo(() => {
    const stats: Record<string, { total: number; done: number }> = {};
    survey2Workload.forEach(p => {
      const ra = p.registeredBy || 'Unknown';
      if (!stats[ra]) stats[ra] = { total: 0, done: 0 };
      stats[ra].total++;
      if (p.survey2_completed) stats[ra].done++;
    });
    return Object.entries(stats).map(([name, data]) => ({
      name,
      ...data,
      config: RA_CONFIG[name] || DEFAULT_RA
    })).sort((a, b) => b.total - a.total);
  }, [survey2Workload]);

  const filtered = useMemo(() => {
    let list = survey2Workload;
    if (filterRA) list = list.filter((p: any) => (p.registeredBy || 'Unknown') === filterRA);
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      list = list.filter((p: any) =>
        p.name?.toLowerCase().includes(s) ||
        p.participantId?.toLowerCase().includes(s)
      );
    }
    if (!showCalled) list = list.filter((p: any) => !p.survey2_completed);
    return list;
  }, [survey2Workload, filterRA, searchTerm, showCalled]);

  const [callDialog, setCallDialog] = useState<any>(null);
  const [callOutcome, setCallOutcome] = useState('');
  const [deliveryStatus, setDeliveryStatus] = useState('');
  const [callNotes, setCallNotes] = useState('');
  const [isLogging, setIsLogging] = useState(false);

  const logCallOutcome = async () => {
    if (!firestore || !callDialog) return;
    setIsLogging(true);
    try {
      const participantId = callDialog.id;
      const updates: any = {
        survey2_call_attempted: true,
        survey2_completed: callOutcome === 'contacted',
        survey2_call_attempted_at: Timestamp.now(),
        survey2_call_outcome: callOutcome,
        survey2_call_notes: callNotes,
        updatedAt: serverTimestamp()
      };

      if (callOutcome === 'contacted') {
        updates.survey2_completed_at = Timestamp.now();
        if (deliveryStatus === 'still_pregnant') {
            updates.delivery_status = 'pregnant';
        } else {
            updates.delivery_status = 'delivered';
            updates.delivery_outcome = deliveryStatus;
            updates.current_trimester = 'postpartum';
        }
      }

      await updateDoc(doc(firestore, 'anc_registrations', participantId), updates);
      await addDoc(collection(firestore, `anc_registrations/${participantId}/timeline_events`), {
        event_type: 'phone_contact',
        event_date: Timestamp.now(),
        notes: `S2 Outreach: ${callOutcome}. Status: ${deliveryStatus}. ${callNotes}`,
        created_at: serverTimestamp()
      });

      toast({ title: 'Outcome Committed', variant: 'success' });
      setCallDialog(null);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsLogging(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 md:space-y-10 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-5">
          <Button variant="secondary" size="icon" asChild className="rounded-xl h-11 w-11 bg-white dark:bg-card shadow-sm ring-1 ring-border/50 hover:scale-105 transition-all">
            <Link href="/anc/activities"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
                <Badge className="bg-primary/10 text-primary border-none font-black uppercase text-[10px] tracking-widest px-3 h-6 rounded-xl">Outreach Unit</Badge>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
                    <Timer className="h-4 w-4" /> Protocol S2
                </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tighter">Call Plan <span className="text-primary italic">Registry</span></h1>
          </div>
        </div>
        <Button 
            variant={showCalled ? "default" : "outline"} 
            onClick={() => setShowCalled(!showCalled)} 
            size="lg"
            className={cn(
                "rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] h-12 px-8 border-2 transition-all w-full md:w-auto", 
                showCalled ? "bg-primary text-white border-primary shadow-xl shadow-primary/20" : "border-primary/20 bg-background hover:bg-primary/5"
            )}
        >
            {showCalled ? 'Showing All Effort' : 'Exclude Completed'}
        </Button>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {raStats.map((ra) => (
            <Card 
                key={ra.name} 
                className={cn(
                    "border-none ring-1 shadow-sm rounded-2xl cursor-pointer transition-all duration-300 hover:ring-primary/40 group",
                    filterRA === ra.name 
                        ? `ring-2 ring-primary bg-primary/5` 
                        : "ring-border bg-white dark:bg-card"
                )}
                onClick={() => setFilterRA(filterRA === ra.name ? null : ra.name)}
            >
                <CardContent className="p-4 md:p-6 flex items-center gap-4">
                    <div className={cn(
                        "p-3 rounded-xl transition-all duration-300", 
                        filterRA === ra.name 
                            ? `bg-primary text-white shadow-lg` 
                            : `${ra.config.bg} ${ra.config.text}`
                    )}>
                        <ra.config.icon className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] leading-none mb-1.5">{ra.name}</p>
                        <p className="text-2xl font-black tracking-tighter leading-none tabular-nums">{ra.done} <span className="text-xs opacity-40 font-bold">/ {ra.total}</span></p>
                    </div>
                </CardContent>
            </Card>
        ))}
      </div>

      <div className="space-y-6">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary/60 transition-all" />
          <Input 
            placeholder="Search current workload..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            className="pl-12 h-12 rounded-2xl border-none ring-1 ring-primary/10 bg-white dark:bg-card font-bold text-sm shadow-sm focus:ring-primary/30 transition-all" 
          />
        </div>

        {isLoading ? (
            <div className="py-40 text-center flex flex-col items-center gap-6">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400">Syncing Intelligence...</p>
            </div>
        ) : filtered.length === 0 ? (
            <div className="py-32 flex flex-col items-center justify-center text-center space-y-4 border-2 border-dashed rounded-[3rem] bg-slate-50 dark:bg-slate-900/10">
                <Users className="h-12 w-12 text-slate-300" />
                <p className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">Workload Clear</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((p: any) => (
                    <Card key={p.id} className={cn(
                        "border-none ring-1 ring-border/50 shadow-sm rounded-2xl overflow-hidden transition-all duration-500 hover:ring-primary/40 group relative",
                        p.survey2_completed ? 'bg-emerald-50/50' : 'bg-white dark:bg-card'
                    )}>
                        <div className={cn(
                            "absolute top-0 left-0 w-1.5 h-full transition-all",
                            p.resolved?.survey2_status === 'overdue' ? 'bg-rose-500 shadow-[2px_0_10px_rgba(244,63,94,0.4)]' : 
                            p.resolved?.survey2_status === 'due_now' ? 'bg-amber-500 shadow-[2px_0_10px_rgba(245,158,11,0.4)]' : 
                            'bg-primary shadow-[2px_0_10px_rgba(16,185,129,0.4)]'
                        )} />
                        
                        <CardContent className="p-5 md:p-6 flex items-center justify-between gap-4">
                            <Link href={`/anc/participants/${p.id}`} className="flex-1 min-w-0 pl-2">
                                <h3 className="font-black text-sm md:text-base tracking-tight truncate group-hover:text-primary transition-colors mb-1.5">{p.name}</h3>
                                <div className="flex items-center gap-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                    <span className="flex items-center gap-1.5"><Baby className="h-3.5 w-3.5 text-primary/60" /> {p.resolved?.current_ga?.weeks || '?'}w</span>
                                    <span className="flex items-center gap-1.5"><CalendarIcon className="h-3.5 w-3.5 text-primary/60" /> EDD: {p.resolved?.edd ? format(p.resolved.edd, 'dd MMM') : '??'}</span>
                                </div>
                                <div className="flex items-center gap-3 mt-4">
                                    <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600">
                                        <Phone className="h-3.5 w-3.5" />
                                    </div>
                                    <span className="text-xs font-mono font-black text-slate-600 dark:text-slate-400 tabular-nums">{(Array.isArray(p.phoneNumber) ? p.phoneNumber[0] : p.phoneNumber) || 'No Phone'}</span>
                                </div>
                            </Link>
                            
                            <div className="flex flex-col items-end gap-3 shrink-0">
                                <Badge className={cn(
                                    "text-[8px] font-black border-none px-2 h-5 rounded-lg uppercase tracking-widest", 
                                    p.resolved?.survey2_status === 'overdue' ? 'bg-rose-100 text-rose-700' : 
                                    p.resolved?.survey2_status === 'due_now' ? 'bg-amber-100 text-amber-700' : 
                                    'bg-primary text-white'
                                )}>
                                    {p.resolved?.survey2_status.replace('_', ' ')}
                                </Badge>
                                {!p.survey2_completed ? (
                                    <Button size="sm" onClick={() => setCallDialog(p)} className="rounded-xl text-[9px] font-black uppercase tracking-widest h-9 px-4 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/10 active:scale-95 transition-all">
                                        Log Protocol
                                    </Button>
                                ) : <div className="p-1 bg-emerald-50 rounded-full"><CheckCircle2 className="h-6 w-6 text-emerald-500" /></div>}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        )}
      </div>
      
      {callDialog && (
        <Dialog open={!!callDialog} onOpenChange={() => setCallDialog(null)}>
          <DialogContent className="sm:max-w-md rounded-[2.5rem] border-none shadow-4xl p-0 overflow-hidden bg-background">
            <DialogHeader className="p-8 bg-primary/5 border-b">
                <div className="flex items-center gap-5">
                    <div className="h-14 w-14 bg-white dark:bg-card rounded-2xl shadow-md flex items-center justify-center ring-1 ring-black/[0.03]">
                        <Phone className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <DialogTitle className="font-black text-2xl tracking-tighter leading-none">Commit Outreach</DialogTitle>
                        <DialogDescription className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 mt-2">{callDialog.name} • Protocol S2</DialogDescription>
                    </div>
                </div>
            </DialogHeader>
            <ScrollArea className="max-h-[75vh]">
              <div className="p-8 space-y-10">
                <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Effort Outcome *</Label>
                  <RadioGroup value={callOutcome} onValueChange={setCallOutcome} className="grid grid-cols-1 gap-3">
                    <div className={cn(
                        "flex items-center gap-4 p-5 rounded-2xl ring-1 transition-all cursor-pointer group", 
                        callOutcome === 'contacted' ? "ring-primary bg-primary/5" : "ring-border hover:bg-slate-50 dark:hover:bg-slate-900"
                    )} onClick={() => setCallOutcome('contacted')}>
                      <RadioGroupItem value="contacted" id="contacted" className="scale-110" />
                      <div className="flex-1">
                        <Label htmlFor="contacted" className="font-black text-xs cursor-pointer block uppercase tracking-tight">Protocol Executed</Label>
                        <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Participant reached and data verified</p>
                      </div>
                    </div>
                    <div className={cn(
                        "flex items-center gap-4 p-5 rounded-2xl ring-1 transition-all cursor-pointer group", 
                        callOutcome === 'no_answer' ? "ring-amber-500 bg-amber-50" : "ring-border hover:bg-slate-50 dark:hover:bg-slate-900"
                    )} onClick={() => setCallOutcome('no_answer')}>
                      <RadioGroupItem value="no_answer" id="no_answer" className="scale-110" />
                      <div className="flex-1">
                        <Label htmlFor="no_answer" className="font-black text-xs cursor-pointer block uppercase tracking-tight text-amber-700">Unsuccessful</Label>
                        <p className="text-[9px] font-bold text-amber-600/60 mt-1 uppercase tracking-widest">No answer, busy, or unreachable</p>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                {callOutcome === 'contacted' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                    <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Clinical Outcome *</Label>
                    <div className="grid grid-cols-1 gap-3">
                      {[
                        { id: 'still_pregnant', label: '🤰 Still Pregnant', sub: 'Continuing ANC Journey' },
                        { id: 'live_birth', label: '👶 Live Birth', sub: 'Confirmed Delivery' },
                        { id: 'stillbirth', label: '🕊️ Stillbirth', sub: 'Recorded Loss' },
                        { id: 'abortion', label: '💔 Abortion', sub: 'Early Pregnancy Loss' }
                      ].map(status => (
                        <div key={status.id} className={cn(
                            "flex items-center gap-4 p-5 rounded-2xl ring-1 transition-all cursor-pointer group", 
                            deliveryStatus === status.id ? "ring-primary bg-primary/5" : "ring-border hover:bg-slate-50 dark:hover:bg-slate-900"
                        )} onClick={() => setDeliveryStatus(status.id)}>
                          <div className={cn(
                              "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all",
                              deliveryStatus === status.id ? "border-primary bg-primary" : "border-slate-300 group-hover:border-primary/50"
                          )}>
                              {deliveryStatus === status.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <div className="flex-1">
                            <Label htmlFor={status.id} className="font-black text-xs cursor-pointer block uppercase tracking-tight">{status.label}</Label>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{status.sub}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-3"><MessageSquare className="h-4 w-4" /> Outreach Notes</Label>
                  <Textarea 
                    value={callNotes} 
                    onChange={e => setCallNotes(e.target.value)} 
                    placeholder="Record qualitative research context..." 
                    className="rounded-2xl border-none ring-1 ring-border focus:ring-primary/40 min-h-[120px] text-xs italic font-medium p-4 transition-all" 
                  />
                </div>
              </div>
            </ScrollArea>
            <DialogFooter className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t flex flex-col md:flex-row gap-3">
              <Button variant="ghost" onClick={() => setCallDialog(null)} className="rounded-xl font-black uppercase text-[10px] tracking-widest h-12 flex-1">Discard</Button>
              <Button onClick={logCallOutcome} disabled={isLogging || !callOutcome || (callOutcome === 'contacted' && !deliveryStatus)} className="rounded-xl font-black uppercase text-[10px] tracking-widest h-12 flex-[2] bg-primary shadow-2xl shadow-primary/20 active:scale-95 transition-all">
                {isLogging ? <Loader2 className="h-4 w-4 animate-spin mr-3" /> : null}
                Commit Outreach Effort
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
