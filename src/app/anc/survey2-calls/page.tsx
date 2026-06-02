
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
  'Riki Mahamba': { color: 'emerald', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-600', icon: Building },
  'Lucy': { color: 'cyan', bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-600', icon: Building },
  'Katie': { color: 'pink', bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-600', icon: Home },
  'Majid': { color: 'amber', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600', icon: Home },
};

const DEFAULT_RA = { color: 'slate', bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-500', icon: Users };

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
        updates.delivery_status = deliveryStatus === 'still_pregnant' ? 'pregnant' : 'delivered';
      }
      await updateDoc(doc(firestore, 'anc_registrations', participantId), updates);
      await addDoc(collection(firestore, `anc_registrations/${participantId}/timeline_events`), {
        event_type: 'phone_contact',
        event_date: Timestamp.now(),
        notes: `S2 Outreach: ${callOutcome}. Status: ${deliveryStatus}. ${callNotes}`,
        created_at: serverTimestamp()
      });
      toast({ title: 'Logged', variant: 'success' });
      setCallDialog(null);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsLogging(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-3 pb-6">
      <div className="flex flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="icon" asChild className="h-7 w-7 rounded-lg shadow-sm border-none">
            <Link href="/anc/activities"><ArrowLeft className="h-3.5 w-3.5" /></Link>
          </Button>
          <div className="space-y-0">
            <div className="flex items-center gap-1.5 text-primary font-black uppercase text-[7px] tracking-widest">
                <Timer className="h-2.5 w-2.5" /> Registry S2
            </div>
            <h1 className="text-base font-black tracking-tighter">Call Plan Dashboard</h1>
          </div>
        </div>
        <Button 
            variant="outline" 
            onClick={() => setShowCalled(!showCalled)} 
            size="sm"
            className={cn("h-7 px-3 rounded-lg font-black uppercase text-[7px] tracking-widest", showCalled && "bg-primary text-white border-primary")}
        >
            {showCalled ? 'Showing All' : 'Hide Done'}
        </Button>
      </div>

      <div className="grid gap-1.5 grid-cols-2 md:grid-cols-4">
        {raStats.map((ra) => (
            <Card 
                key={ra.name} 
                className={cn("border-none ring-1 shadow-sm rounded-xl cursor-pointer transition-all h-[44px]", filterRA === ra.name ? "ring-2 ring-primary bg-primary/5" : "ring-border bg-white dark:bg-card")}
                onClick={() => setFilterRA(filterRA === ra.name ? null : ra.name)}
            >
                <CardContent className="p-2 flex items-center gap-2 h-full">
                    <div className={cn("p-1 rounded-lg", filterRA === ra.name ? "bg-primary text-white" : ra.config.bg + " " + ra.config.text)}>
                        <ra.config.icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[6px] font-black uppercase tracking-widest leading-none mb-0.5 truncate">{ra.name}</p>
                        <p className="text-xs font-black tracking-tighter leading-none">{ra.done}/{ra.total}</p>
                    </div>
                </CardContent>
            </Card>
        ))}
      </div>

      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-primary/40" />
          <Input 
            placeholder="Search registry..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            className="pl-8 h-8 rounded-lg border-none ring-1 ring-primary/10 bg-white dark:bg-card text-[10px] font-bold shadow-sm" 
          />
        </div>

        {isLoading ? (
            <div className="py-16 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mt-2">Loading...</p>
            </div>
        ) : filtered.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed rounded-xl bg-muted/20 text-[9px] font-black uppercase tracking-widest text-slate-400">Queue Clear</div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {filtered.map((p: any) => (
                    <Card key={p.id} className={cn("border-none ring-1 ring-border/50 shadow-sm rounded-xl overflow-hidden hover:ring-primary/40 group relative transition-all h-[74px]", p.survey2_completed ? 'bg-emerald-50/20' : 'bg-white dark:bg-card')}>
                        <div className={cn("absolute top-0 left-0 w-1 h-full", p.resolved?.survey2_status === 'overdue' ? 'bg-rose-500' : p.resolved?.survey2_status === 'due_now' ? 'bg-amber-500' : 'bg-primary')} />
                        <CardContent className="p-2 flex items-center justify-between gap-2 h-full">
                            <Link href={`/anc/participants/${p.id}`} className="flex-1 min-w-0 pl-1 h-full flex flex-col justify-between">
                                <div>
                                    <h3 className="font-bold text-[11px] truncate leading-none mb-1">{p.name}</h3>
                                    <div className="flex items-center gap-1.5 text-[7px] font-black text-slate-400 uppercase tracking-widest">
                                        <span className="flex items-center gap-1"><Baby className="h-2 w-2" /> {p.resolved?.current_ga?.weeks}w</span>
                                        <span className="flex items-center gap-1"><CalendarIcon className="h-2 w-2" /> {p.resolved?.edd ? format(p.resolved.edd, 'dd MMM') : '--'}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 mt-1.5">
                                    <div className="p-0.5 rounded bg-emerald-50 text-emerald-600"><Phone className="h-2 w-2" /></div>
                                    <span className="text-[8px] font-mono font-bold">{(Array.isArray(p.phoneNumber) ? p.phoneNumber[0] : p.phoneNumber)}</span>
                                </div>
                            </Link>
                            <div className="flex flex-col items-end gap-1.5 shrink-0 h-full justify-between">
                                <Badge className={cn("text-[6px] font-black border-none px-1 h-3.5 rounded-sm uppercase tracking-widest", p.resolved?.survey2_status === 'overdue' ? 'bg-rose-100 text-rose-700' : p.resolved?.survey2_status === 'due_now' ? 'bg-amber-100 text-amber-700' : 'bg-primary text-white')}>
                                    {p.resolved?.survey2_status}
                                </Badge>
                                {!p.survey2_completed ? (
                                    <Button size="sm" onClick={(e) => { e.preventDefault(); setCallDialog(p); }} className="rounded-lg text-[7px] font-black uppercase tracking-widest h-6 px-3 bg-primary shadow-sm active:scale-95 transition-all">
                                        Log
                                    </Button>
                                ) : <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        )}
      </div>
      
      {callDialog && (
        <Dialog open={!!callDialog} onOpenChange={() => setCallDialog(null)}>
          <DialogContent className="sm:max-w-md rounded-2xl border-none shadow-2xl p-0 overflow-hidden">
            <DialogHeader className="p-4 bg-primary/5 border-b">
                <DialogTitle className="font-black text-base tracking-tight uppercase">Commit Registry Outreach</DialogTitle>
                <DialogDescription className="text-[8px] font-black uppercase tracking-widest">{callDialog.name} • Phase 2</DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh]">
              <div className="p-4 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Protocol Outcome *</Label>
                  <RadioGroup value={callOutcome} onValueChange={setCallOutcome} className="grid grid-cols-1 gap-1.5">
                    {['contacted', 'no_answer'].map(o => (
                        <div key={o} className={cn("flex items-center gap-2.5 p-2 rounded-xl border transition-all cursor-pointer", callOutcome === o ? "border-primary bg-primary/5" : "border-border")} onClick={() => setCallOutcome(o)}>
                            <RadioGroupItem value={o} id={o} />
                            <Label htmlFor={o} className="font-bold text-[10px] uppercase cursor-pointer">{o.replace('_', ' ')}</Label>
                        </div>
                    ))}
                  </RadioGroup>
                </div>

                {callOutcome === 'contacted' && (
                  <div className="space-y-1.5">
                    <Label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Current Biological Status *</Label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {['still_pregnant', 'live_birth', 'stillbirth', 'abortion'].map(s => (
                        <div key={s} className={cn("p-2 rounded-xl border text-center transition-all cursor-pointer", deliveryStatus === s ? "border-primary bg-primary/5" : "border-border")} onClick={() => setDeliveryStatus(s)}>
                          <p className="font-black text-[8px] uppercase leading-none">{s.replace('_', ' ')}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Clinical Handover Notes</Label>
                  <Textarea value={callNotes} onChange={e => setCallNotes(e.target.value)} className="rounded-xl text-[9px] italic font-medium p-2.5 min-h-[60px]" placeholder="Specific clinical context..." />
                </div>
              </div>
            </ScrollArea>
            <DialogFooter className="p-3 bg-slate-50 border-t flex flex-row gap-2">
              <Button variant="ghost" onClick={() => setCallDialog(null)} className="h-9 rounded-xl font-black uppercase text-[8px] tracking-widest flex-1">Discard</Button>
              <Button onClick={logCallOutcome} disabled={isLogging || !callOutcome} className="h-9 rounded-xl font-black uppercase text-[8px] tracking-widest flex-[2] bg-primary shadow-lg shadow-primary/20">
                {isLogging ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : null} Commit Log
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
