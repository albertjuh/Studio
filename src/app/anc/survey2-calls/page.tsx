
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
  AlertCircle, 
  Building, 
  Home, 
  Users, 
  Loader2, 
  Baby, 
  MessageSquare,
  ChevronRight,
  ArrowLeft,
  Timer,
  Clock,
  Calendar as CalendarIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { type AncRegistration } from '@/types';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { resolveParticipantStatuses } from '@/lib/timeline/formulas';
import { IdBadge } from '@/app/anc/components/id-badge';
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
    <div className="space-y-6 max-w-7xl mx-auto pb-24 pt-2">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-3 md:px-0">
        <div className="flex items-center gap-4">
          <Button variant="secondary" size="icon" asChild className="rounded-xl h-10 w-10 bg-background border-none shadow-sm hover:scale-105 transition-all">
            <Link href="/anc/activities"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-primary/10 text-primary border-none font-black uppercase text-[8px] tracking-[0.2em] px-3 h-5 rounded-full">Outreach Unit</Badge>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Timer className="h-3 w-3" /> Protocol S2
                </span>
            </div>
            <h1 className="text-3xl font-black tracking-tighter">Call Plan <span className="text-primary italic">Registry</span></h1>
          </div>
        </div>
        <Button 
            variant={showCalled ? "default" : "outline"} 
            onClick={() => setShowCalled(!showCalled)} 
            className={cn(
                "rounded-xl font-black uppercase tracking-[0.2em] text-[10px] h-11 px-8 border-2 transition-all", 
                showCalled ? "bg-primary text-white border-primary shadow-xl shadow-primary/20" : "border-primary/20 bg-background hover:bg-primary/5"
            )}
        >
            {showCalled ? 'Showing All Effort' : 'Exclude Completed'}
        </Button>
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4 px-3 md:px-0">
        {raStats.map((ra) => (
            <Card 
                key={ra.name} 
                className={cn(
                    "border-none ring-1 shadow-sm rounded-xl cursor-pointer transition-all duration-300 hover:ring-primary/40 group",
                    filterRA === ra.name 
                        ? `ring-2 ring-primary bg-primary/5` 
                        : "ring-border bg-card/60 backdrop-blur-sm"
                )}
                onClick={() => setFilterRA(filterRA === ra.name ? null : ra.name)}
            >
                <CardContent className="p-4 flex items-center gap-4">
                    <div className={cn(
                        "p-3 rounded-xl transition-all duration-300", 
                        filterRA === ra.name 
                            ? `bg-primary text-white shadow-lg` 
                            : `${ra.config.bg} ${ra.config.text}`
                    )}>
                        <ra.config.icon className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-0.5">{ra.name}</p>
                        <p className="text-lg font-black tracking-tighter leading-none">{ra.done} <span className="text-[10px] opacity-40">/ {ra.total}</span></p>
                    </div>
                </CardContent>
            </Card>
        ))}
      </div>

      <div className="space-y-4 px-3 md:px-0">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary group-focus-within:scale-110 transition-all" />
          <Input 
            placeholder="Filter current workload by name or ID..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            className="pl-12 h-14 rounded-xl border-none ring-2 ring-primary/5 bg-background font-bold text-sm shadow-xl shadow-black/[0.02] focus:ring-primary/40 transition-all placeholder:text-slate-400" 
          />
        </div>

        {isLoading ? (
            <div className="py-32 text-center flex flex-col items-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Syncing Intelligence...</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filtered.map((p: any) => (
                    <Card key={p.id} className={cn(
                        "border-none ring-1 ring-border shadow-sm rounded-xl overflow-hidden transition-all duration-500 hover:ring-primary/40 group relative",
                        p.survey2_completed ? 'bg-emerald-500/[0.02]' : 'bg-card/60 backdrop-blur-sm'
                    )}>
                        <div className={cn(
                            "absolute top-0 left-0 w-1.5 h-full transition-all",
                            p.resolved?.survey2_status === 'overdue' ? 'bg-rose-500 shadow-[2px_0_10px_rgba(244,63,94,0.3)]' : 
                            p.resolved?.survey2_status === 'due_now' ? 'bg-amber-500 shadow-[2px_0_10px_rgba(245,158,11,0.3)]' : 
                            'bg-primary'
                        )} />
                        
                        <CardContent className="p-4 flex items-center justify-between gap-4">
                            <Link href={`/anc/participants/${p.id}`} className="flex-1 min-w-0 pl-2">
                                <h3 className="font-black text-sm tracking-tight truncate group-hover:text-primary transition-colors mb-1.5">{p.name}</h3>
                                <div className="flex items-center gap-3 text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                    <span className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md"><Baby className="h-3 w-3 text-primary" /> {p.resolved?.current_ga?.weeks || '?'}w GA</span>
                                    <span className="flex items-center gap-1.5"><CalendarIcon className="h-3 w-3" /> EDD: {p.resolved?.edd ? format(p.resolved.edd, 'dd MMM') : '??'}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-2.5">
                                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
                                        <Phone className="h-3 w-3" />
                                    </div>
                                    <span className="text-[10px] font-mono font-black text-slate-600">{(Array.isArray(p.phoneNumber) ? p.phoneNumber[0] : p.phoneNumber) || 'No Phone'}</span>
                                </div>
                            </Link>
                            
                            <div className="flex flex-col items-end gap-2 shrink-0">
                                <Badge className={cn(
                                    "text-[7px] font-black border-none px-2 h-5 rounded-lg uppercase tracking-widest", 
                                    p.resolved?.survey2_status === 'overdue' ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20' : 
                                    p.resolved?.survey2_status === 'due_now' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 
                                    'bg-primary text-white shadow-lg shadow-primary/20'
                                )}>
                                    {p.resolved?.survey2_status.replace('_', ' ')}
                                </Badge>
                                {!p.survey2_completed ? (
                                    <Button size="sm" onClick={() => setCallDialog(p)} className="rounded-xl text-[8px] font-black uppercase tracking-[0.2em] h-8 px-4 bg-primary shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
                                        Log Protocol
                                    </Button>
                                ) : <CheckCircle2 className="h-5 w-5 text-emerald-500 drop-shadow-sm" />}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        )}
      </div>
      
      {callDialog && (
        <Dialog open={!!callDialog} onOpenChange={() => setCallDialog(null)}>
          <DialogContent className="sm:max-w-md rounded-xl border-none shadow-4xl p-0 overflow-hidden bg-background">
            <DialogHeader className="p-8 bg-primary/5 border-b">
                <div className="flex items-center gap-5">
                    <div className="h-12 w-12 bg-white rounded-xl shadow-2xl flex items-center justify-center ring-1 ring-black/[0.03]">
                        <Phone className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <DialogTitle className="font-black text-2xl tracking-tighter">Commit Outreach Effort</DialogTitle>
                        <DialogDescription className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 mt-1">{callDialog.name} • S2 Phase</DialogDescription>
                    </div>
                </div>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh]">
              <div className="p-8 space-y-8">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Effort Outcome *</Label>
                  <RadioGroup value={callOutcome} onValueChange={setCallOutcome} className="grid grid-cols-1 gap-3">
                    <div className={cn(
                        "flex items-center gap-4 p-4 rounded-xl ring-2 transition-all cursor-pointer group", 
                        callOutcome === 'contacted' ? "ring-primary bg-primary/5" : "ring-slate-100 hover:ring-slate-200"
                    )} onClick={() => setCallOutcome('contacted')}>
                      <RadioGroupItem value="contacted" id="contacted" />
                      <div className="flex-1">
                        <Label htmlFor="contacted" className="font-black text-xs cursor-pointer block uppercase tracking-widest">Protocol Executed</Label>
                        <p className="text-[8px] font-bold text-slate-400 mt-0.5 uppercase">Participant reached and data verified</p>
                      </div>
                    </div>
                    <div className={cn(
                        "flex items-center gap-4 p-4 rounded-xl ring-2 transition-all cursor-pointer group", 
                        callOutcome === 'no_answer' ? "ring-amber-500 bg-amber-50" : "ring-slate-100 hover:ring-slate-200"
                    )} onClick={() => setCallOutcome('no_answer')}>
                      <RadioGroupItem value="no_answer" id="no_answer" />
                      <div className="flex-1">
                        <Label htmlFor="no_answer" className="font-black text-xs cursor-pointer block uppercase tracking-widest text-amber-700">Unsuccessful</Label>
                        <p className="text-[8px] font-bold text-amber-600/60 mt-0.5 uppercase">No answer, busy, or unreachable</p>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                {callOutcome === 'contacted' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                    <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Clinical Outcome *</Label>
                    <div className="grid grid-cols-1 gap-2.5">
                      {[
                        { id: 'still_pregnant', label: '🤰 Still Pregnant', sub: 'Continuing ANC Journey' },
                        { id: 'live_birth', label: '👶 Live Birth', sub: 'Confirmed Delivery' },
                        { id: 'stillbirth', label: '🕊️ Stillbirth', sub: 'Recorded Loss' },
                        { id: 'abortion', label: '💔 Abortion', sub: 'Early Pregnancy Loss' }
                      ].map(status => (
                        <div key={status.id} className={cn(
                            "flex items-center gap-4 p-4 rounded-xl ring-2 transition-all cursor-pointer", 
                            deliveryStatus === status.id ? "ring-primary bg-primary/5" : "ring-slate-100 hover:ring-slate-200"
                        )} onClick={() => setDeliveryStatus(status.id)}>
                          <div className={cn(
                              "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all",
                              deliveryStatus === status.id ? "border-primary bg-primary" : "border-slate-300"
                          )}>
                              {deliveryStatus === status.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <div className="flex-1">
                            <Label htmlFor={status.id} className="font-black text-xs cursor-pointer block uppercase tracking-tighter leading-none">{status.label}</Label>
                            <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{status.sub}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2.5">
                  <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2"><MessageSquare className="h-3 w-3" /> Intelligence Notes</Label>
                  <Textarea 
                    value={callNotes} 
                    onChange={e => setCallNotes(e.target.value)} 
                    placeholder="Record qualitative clinical context for the research study..." 
                    className="rounded-xl border-slate-200 min-h-[100px] text-xs italic font-medium p-4 focus:ring-primary/20" 
                  />
                </div>
              </div>
            </ScrollArea>
            <DialogFooter className="p-6 bg-slate-50 border-t flex flex-col sm:flex-row gap-3">
              <Button variant="ghost" onClick={() => setCallDialog(null)} className="rounded-xl font-black uppercase tracking-[0.2em] text-[10px] h-11 flex-1">Discard</Button>
              <Button onClick={logCallOutcome} disabled={isLogging || !callOutcome || (callOutcome === 'contacted' && !deliveryStatus)} className="rounded-xl font-black uppercase tracking-[0.2em] text-[10px] h-11 flex-[2] bg-primary shadow-2xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all">
                {isLogging ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Commit Outreach Effort
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
