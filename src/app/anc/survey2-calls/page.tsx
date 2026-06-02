
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
  'Majid': { color: 'yellow', bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', icon: Home },
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
    <div className="space-y-4 max-w-7xl mx-auto pb-24 pt-2">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-3 md:px-0">
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="icon" asChild className="rounded-xl h-9 w-9 bg-background border-none shadow-sm">
            <Link href="/anc/activities"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
                <Badge className="bg-primary/10 text-primary border-none font-black uppercase text-[7px] tracking-widest px-2 h-4">Unit: Outreach</Badge>
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"><Timer className="h-2.5 w-2.5" /> Survey 2 Protocol</span>
            </div>
            <h1 className="text-2xl font-black tracking-tighter">Call Plan <span className="text-primary">Registry</span></h1>
          </div>
        </div>
        <Button 
            variant={showCalled ? "default" : "outline"} 
            onClick={() => setShowCalled(!showCalled)} 
            className={cn(
                "rounded-xl font-black uppercase tracking-widest text-[9px] h-9 px-6 border-2 transition-all", 
                showCalled ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" : "border-primary/20 bg-background"
            )}
        >
            {showCalled ? 'Showing All Effort' : 'Exclude Completed'}
        </Button>
      </div>

      <div className="grid gap-2 grid-cols-2 md:grid-cols-4 lg:grid-cols-4 px-3 md:px-0">
        {raStats.map((ra) => (
            <Card 
                key={ra.name} 
                className={cn(
                    "border-none ring-1 shadow-sm rounded-xl cursor-pointer transition-all hover:ring-primary/40",
                    filterRA === ra.name ? `ring-2 ring-${ra.config.color}-500 bg-${ra.config.color}-50` : "ring-border bg-card/60 backdrop-blur-sm"
                )}
                onClick={() => setFilterRA(filterRA === ra.name ? null : ra.name)}
            >
                <CardContent className="p-3 flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg", filterRA === ra.name ? `bg-${ra.config.color}-500 text-white` : `${ra.config.bg} ${ra.config.text}`)}>
                        <ra.config.icon className="h-4 w-4" />
                    </div>
                    <div>
                        <p className="text-[8px] font-black uppercase text-muted-foreground tracking-tighter">{ra.name}</p>
                        <p className="text-sm font-black tracking-tight">{ra.done} / {ra.total}</p>
                    </div>
                </CardContent>
            </Card>
        ))}
      </div>

      <div className="space-y-3 px-3 md:px-0">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-primary" />
          <Input 
            placeholder="Filter current workload..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            className="pl-11 h-11 rounded-xl border-none ring-1 ring-primary/10 bg-background font-bold text-xs shadow-md focus:ring-primary/30 transition-all" 
          />
        </div>

        {isLoading ? (
            <div className="py-20 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {filtered.map((p: any) => (
                    <Card key={p.id} className={cn(
                        "border-none ring-1 ring-border shadow-sm rounded-xl overflow-hidden transition-all hover:ring-primary/40 group",
                        p.survey2_completed ? 'bg-emerald-50/10' : 'bg-card/60 backdrop-blur-sm'
                    )}>
                        <CardContent className="p-3 flex items-center justify-between gap-4">
                            <Link href={`/anc/participants/${p.id}`} className="flex-1 min-w-0">
                                <h3 className="font-black text-xs tracking-tight truncate group-hover:text-primary transition-colors mb-1">{p.name}</h3>
                                <div className="flex items-center gap-2 text-[7px] font-black text-slate-400 uppercase tracking-widest">
                                    <span className="flex items-center gap-1"><Baby className="h-2.5 w-2.5" /> {p.resolved?.current_ga?.weeks || '?'}w</span>
                                    <span className="flex items-center gap-1"><CalendarIcon className="h-2.5 w-2.5" /> EDD: {p.resolved?.edd ? format(p.resolved.edd, 'dd MMM') : '??'}</span>
                                </div>
                                <div className="flex items-center gap-1.5 mt-1.5">
                                    <Phone className="h-2.5 w-2.5 text-emerald-600" />
                                    <span className="text-[8px] font-mono font-bold text-slate-500">{(Array.isArray(p.phoneNumber) ? p.phoneNumber[0] : p.phoneNumber) || 'No Phone'}</span>
                                </div>
                            </Link>
                            
                            <div className="flex flex-col items-end gap-1.5 shrink-0">
                                <Badge className={cn(
                                    "text-[6px] font-black border-none px-1.5 h-4 rounded-md uppercase", 
                                    p.resolved?.survey2_status === 'overdue' ? 'bg-rose-600 text-white' : 
                                    p.resolved?.survey2_status === 'due_now' ? 'bg-amber-100 text-amber-800' : 'bg-blue-50 text-blue-700'
                                )}>
                                    {p.resolved?.survey2_status.replace('_', ' ')}
                                </Badge>
                                {!p.survey2_completed ? (
                                    <Button size="sm" onClick={() => setCallDialog(p)} className="rounded-lg text-[7px] font-black uppercase tracking-widest h-6 px-3 bg-primary shadow-sm hover:scale-[1.05] transition-transform">
                                        Log Protocol
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
          <DialogContent className="sm:max-w-md rounded-[2.5rem] border-none shadow-4xl p-0 overflow-hidden bg-background">
            <DialogHeader className="p-6 bg-primary/5 border-b">
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-white rounded-xl shadow-xl flex items-center justify-center ring-1 ring-black/5">
                        <Phone className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <DialogTitle className="font-black text-lg tracking-tighter">Commit Outreach Effort</DialogTitle>
                        <DialogDescription className="text-[9px] font-bold uppercase tracking-[0.2em] text-primary/60">{callDialog.name} • Protocol S2</DialogDescription>
                    </div>
                </div>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh]">
              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Effort Outcome *</Label>
                  <RadioGroup value={callOutcome} onValueChange={setCallOutcome} className="grid grid-cols-1 gap-2">
                    <div className={cn("flex items-center gap-3 p-3 rounded-xl ring-2 transition-all cursor-pointer", callOutcome === 'contacted' ? "ring-primary bg-primary/5" : "ring-slate-100")} onClick={() => setCallOutcome('contacted')}>
                      <RadioGroupItem value="contacted" id="contacted" />
                      <Label htmlFor="contacted" className="font-black text-[10px] cursor-pointer flex-1">Protocol Successfully Executed</Label>
                    </div>
                    <div className={cn("flex items-center gap-3 p-3 rounded-xl ring-2 transition-all cursor-pointer", callOutcome === 'no_answer' ? "ring-amber-500 bg-amber-50" : "ring-slate-100")} onClick={() => setCallOutcome('no_answer')}>
                      <RadioGroupItem value="no_answer" id="no_answer" />
                      <Label htmlFor="no_answer" className="font-black text-[10px] cursor-pointer flex-1">Unsuccessful / Unreachable</Label>
                    </div>
                  </RadioGroup>
                </div>

                {callOutcome === 'contacted' && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-4 duration-500">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Clinical Outcome *</Label>
                    <RadioGroup value={deliveryStatus} onValueChange={setDeliveryStatus} className="grid grid-cols-1 gap-2">
                      {['still_pregnant', 'live_birth', 'stillbirth', 'abortion'].map(status => (
                        <div key={status} className={cn("flex items-center gap-3 p-3 rounded-xl ring-2 transition-all cursor-pointer", deliveryStatus === status ? "ring-primary bg-primary/5" : "ring-slate-100")} onClick={() => setDeliveryStatus(status)}>
                          <RadioGroupItem value={status} id={status} />
                          <Label htmlFor={status} className="font-black text-[10px] cursor-pointer flex-1 uppercase tracking-tighter">
                            {status === 'still_pregnant' && '🤰 Still Pregnant'}
                            {status === 'live_birth' && '👶 Live Birth Confirmed'}
                            {status === 'stillbirth' && '🕊️ Stillbirth Recorded'}
                            {status === 'abortion' && '💔 Abortion / Early Loss'}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><MessageSquare className="h-3 w-3" /> Intelligence Notes</Label>
                  <Textarea value={callNotes} onChange={e => setCallNotes(e.target.value)} placeholder="Record qualitative study context..." className="rounded-xl border-slate-100 min-h-[70px] text-[10px] italic font-medium p-3" />
                </div>
              </div>
            </ScrollArea>
            <DialogFooter className="p-4 bg-muted/20 border-t flex flex-col sm:flex-row gap-2">
              <Button variant="ghost" onClick={() => setCallDialog(null)} className="rounded-lg font-black uppercase text-[9px] h-9 flex-1">Discard</Button>
              <Button onClick={logCallOutcome} disabled={isLogging || !callOutcome || (callOutcome === 'contacted' && !deliveryStatus)} className="rounded-lg font-black uppercase text-[9px] h-9 flex-[2] bg-primary shadow-lg shadow-primary/20">
                {isLogging ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-2 h-3.5 w-3.5" />}
                Commit Outcome
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
