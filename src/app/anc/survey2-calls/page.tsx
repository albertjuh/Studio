"use client";

import { useMemo, useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, doc, updateDoc, Timestamp, addDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  X,
  ChevronRight,
  Calendar as CalendarIcon,
  ArrowLeft
} from 'lucide-react';
import { format } from 'date-fns';
import { type AncRegistration } from '@/types';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { resolveParticipantStatuses } from '@/lib/timeline/formulas';
import { IdBadge } from '@/app/anc/components/id-badge';
import { cn } from '@/lib/utils';

const RA_CONFIG: Record<string, { color: string; bg: string; border: string; text: string; location: string; icon: any }> = {
  'Riki Mahamba': { color: 'emerald', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', location: 'Office', icon: Building },
  'Lucy': { color: 'cyan', bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700', location: 'Office', icon: Building },
  'Katie': { color: 'pink', bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700', location: 'Home', icon: Home },
  'Majid': { color: 'yellow', bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', location: 'Home', icon: Home },
};

const DEFAULT_RA = { color: 'slate', bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', location: 'Field', icon: Users };

export default function Survey2CallsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [filterRA, setFilterRA] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCalled, setShowCalled] = useState(false);

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
        if (!p.resolved) return false;
        const s = p.resolved.survey2_status;
        return s === 'due_now' || s === 'due_soon' || s === 'overdue' || s === 'completed';
      })
      .sort((a: any, b: any) => {
        const dA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const dB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return dA - dB;
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
    if (filterRA !== 'All') list = list.filter((p: any) => (p.registeredBy || 'Unknown') === filterRA);
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      list = list.filter((p: any) =>
        p.name?.toLowerCase().includes(s) ||
        p.participantId?.toLowerCase().includes(s) ||
        (Array.isArray(p.phoneNumber) && p.phoneNumber.some((n: string) => n.includes(s)))
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

  const openCallDialog = (p: any) => {
    setCallDialog(p);
    setCallOutcome('');
    setDeliveryStatus('');
    setCallNotes('');
  };

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
            updates.delivery_date_confirmed = serverTimestamp();
            updates.current_trimester = 'postpartum';
            updates.delivery_outcome = deliveryStatus;
        }
      }

      await updateDoc(doc(firestore, 'anc_registrations', participantId), updates);

      await addDoc(collection(firestore, `anc_registrations/${participantId}/timeline_events`), {
        event_type: callOutcome === 'contacted' && deliveryStatus !== 'still_pregnant' ? 'delivery_recorded' : 'phone_contact',
        event_date: Timestamp.now(),
        notes: `Survey 2 call: ${callOutcome === 'contacted' ? 'Contacted' : 'Unsuccessful'}. Status: ${deliveryStatus}. ${callNotes}`,
        created_at: serverTimestamp(),
        outcome: callOutcome,
        pregnancy_status_at_contact: deliveryStatus
      });

      toast({ title: 'Call Outcome Logged', variant: 'success' });
      setCallDialog(null);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-24 lg:pb-12 pt-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-4 md:px-0">
        <div className="flex items-center gap-4">
          <Button variant="secondary" size="icon" asChild className="rounded-xl h-11 w-11 shadow-sm border-none bg-background">
            <Link href="/anc/activities"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
                <Badge className="bg-primary/10 text-primary border-none font-black uppercase text-[8px] tracking-[0.2em] px-2 py-0.5">Survey Operations</Badge>
                <div className="h-1 w-1 rounded-full bg-slate-300" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">34-38 Week Outreach</span>
            </div>
            <h1 className="text-4xl font-black tracking-tighter">Survey 2 <span className="text-primary">Call Plan</span></h1>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
            <Button 
                variant={showCalled ? "default" : "outline"} 
                onClick={() => setShowCalled(!showCalled)} 
                className={cn("rounded-xl font-black uppercase tracking-widest text-[9px] h-11 px-6 border-2 transition-all flex-1 md:flex-none", showCalled ? "bg-primary text-white border-primary" : "border-primary/20 bg-background")}
            >
                {showCalled ? 'Showing Completed' : 'Hide Completed'}
            </Button>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4 px-4 md:px-0">
        {raStats.map((ra) => (
            <Card 
                key={ra.name} 
                className={cn(
                    "border-none ring-1 shadow-sm rounded-2xl overflow-hidden cursor-pointer transition-all hover:scale-[1.03] group",
                    filterRA === ra.name ? `ring-primary bg-primary/5` : "ring-border bg-card/60 backdrop-blur-sm"
                )}
                onClick={() => setFilterRA(filterRA === ra.name ? 'All' : ra.name)}
            >
                <CardContent className="p-5 flex items-center gap-4 h-full relative">
                    <div className={cn("p-2.5 rounded-xl shadow-sm transition-colors", filterRA === ra.name ? "bg-primary text-white" : `${ra.config.bg} ${ra.config.text}`)}>
                        <ra.config.icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                        <p className={cn("text-[10px] font-black uppercase truncate", filterRA === ra.name ? "text-primary" : "text-muted-foreground")}>{ra.name}</p>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                            <span className={cn("text-2xl font-black tracking-tighter", filterRA === ra.name ? "text-primary" : "text-slate-900")}>{ra.done}/{ra.total}</span>
                            <span className="text-[8px] font-bold uppercase text-slate-400 tracking-widest">Calls</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        ))}
      </div>

      <div className="px-4 md:px-0">
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
          <Input 
            placeholder="Search by name, ID, or phone..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            className="pl-11 h-14 rounded-2xl border-none ring-1 ring-primary/20 bg-background font-bold text-sm shadow-xl" 
          />
        </div>

        {isLoading ? (
            <div className="py-32 flex flex-col items-center justify-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">Calculating Workload...</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filtered.map((p: any) => (
                    <Card key={p.id} className={cn(
                        "border-none ring-1 ring-border shadow-sm rounded-2xl overflow-hidden transition-all hover:ring-primary/30 group",
                        p.survey2_completed ? 'bg-emerald-50/10' : 'bg-card'
                    )}>
                        <CardContent className="p-3 md:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <Link href={`/anc/participants/${p.id}`} className="flex-1 space-y-2 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-base tracking-tight group-hover:text-primary transition-colors truncate">{p.name}</h3>
                                    <IdBadge id={p.participantId} hideLabel className="scale-[0.65] origin-left shrink-0" />
                                </div>
                                <div className="flex items-center gap-2.5 flex-wrap text-[9px] font-bold text-slate-500 uppercase tracking-tight">
                                    <span className="flex items-center gap-1 px-1.5 py-0.5 bg-muted rounded-md"><Baby className="h-2.5 w-2.5" /> {p.resolved?.current_ga?.weeks || '?'}w</span>
                                    <span className="flex items-center gap-1 px-1.5 py-0.5 bg-muted rounded-md"><CalendarIcon className="h-2.5 w-2.5" /> {p.resolved?.edd ? format(p.resolved.edd, 'dd MMM') : 'Pending'}</span>
                                    <span className="font-black text-primary truncate max-w-[120px]">{p.healthFacility.split(' (')[0]}</span>
                                </div>
                            </Link>
                            <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-3 shrink-0">
                                <div className="flex flex-col items-start sm:items-end gap-1">
                                    <Badge className={cn(
                                        "text-[8px] font-black border-none shadow-none px-2 h-5 rounded-lg", 
                                        p.resolved?.survey2_status === 'overdue' ? 'bg-rose-600 text-white' : 
                                        p.resolved?.survey2_status === 'due_now' ? 'bg-amber-100 text-amber-800' : 'bg-blue-50 text-blue-700'
                                    )}>
                                        {p.resolved?.survey2_status.replace('_', ' ').toUpperCase()}
                                    </Badge>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <div className="h-6 w-6 rounded-md bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                                            <Phone className="h-3 w-3" />
                                        </div>
                                        <span className="text-[11px] font-mono font-bold text-slate-600 bg-slate-50 px-2 py-0.5 rounded-lg border">
                                            {Array.isArray(p.phoneNumber) ? p.phoneNumber[0] : p.phoneNumber}
                                        </span>
                                    </div>
                                </div>
                                {!p.survey2_completed && (
                                    <Button size="sm" onClick={() => openCallDialog(p)} className="rounded-xl text-[9px] font-black uppercase tracking-widest h-8 px-4 bg-primary shadow-sm hover:scale-[1.02] active:scale-95 transition-all">
                                        Log Protocol
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        )}
      </div>
      
      {/* Call Outcome Dialog */}
      {callDialog && (
        <Dialog open={!!callDialog} onOpenChange={() => setCallDialog(null)}>
          <DialogContent className="sm:max-w-md rounded-[3rem] border-none shadow-4xl p-0 overflow-hidden bg-background">
            <DialogHeader className="p-8 bg-primary/5 border-b">
              <div className="flex items-center gap-4">
                  <div className="h-14 w-14 bg-white rounded-3xl shadow-xl flex items-center justify-center ring-1 ring-black/5">
                    <Phone className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <DialogTitle className="font-black text-2xl tracking-tighter">Commit Outcome</DialogTitle>
                    <DialogDescription className="text-[9px] font-bold uppercase tracking-[0.2em] text-primary/60 mt-1">{callDialog.name} • {callDialog.participantId}</DialogDescription>
                  </div>
              </div>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh]">
              <div className="p-8 space-y-6">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Phase 2 Contact Outcome *</Label>
                  <RadioGroup value={callOutcome} onValueChange={setCallOutcome} className="grid grid-cols-1 gap-2">
                    <div className={cn("flex items-center gap-3 p-4 rounded-2xl ring-2 transition-all cursor-pointer", callOutcome === 'contacted' ? "ring-primary bg-primary/5" : "ring-slate-100 hover:ring-primary/20")} onClick={() => setCallOutcome('contacted')}>
                      <RadioGroupItem value="contacted" id="contacted" />
                      <Label htmlFor="contacted" className="font-black text-sm cursor-pointer flex-1 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Success: Protocol Completed</Label>
                    </div>
                    <div className={cn("flex items-center gap-3 p-4 rounded-2xl ring-2 transition-all cursor-pointer", callOutcome === 'no_answer' ? "ring-amber-500 bg-amber-50/30" : "ring-slate-100 hover:ring-primary/20")} onClick={() => setCallOutcome('no_answer')}>
                      <RadioGroupItem value="no_answer" id="no_answer" />
                      <Label htmlFor="no_answer" className="font-black text-sm cursor-pointer flex-1 flex items-center gap-2"><AlertCircle className="h-4 w-4 text-amber-500" /> Partial: No Answer / Unreachable</Label>
                    </div>
                  </RadioGroup>
                </div>

                {callOutcome === 'contacted' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Clinical Outcome Category *</Label>
                    <RadioGroup value={deliveryStatus} onValueChange={setDeliveryStatus} className="grid grid-cols-1 gap-2">
                      <div className={cn("flex items-center gap-3 p-4 rounded-2xl ring-2 transition-all cursor-pointer", deliveryStatus === 'still_pregnant' ? "ring-primary bg-primary/5" : "ring-slate-100")} onClick={() => setDeliveryStatus('still_pregnant')}>
                        <RadioGroupItem value="still_pregnant" id="still_pregnant" />
                        <Label htmlFor="still_pregnant" className="font-black text-sm cursor-pointer flex-1">🤰 Still Pregnant</Label>
                      </div>
                      <div className={cn("flex items-center gap-3 p-4 rounded-2xl ring-2 transition-all cursor-pointer", deliveryStatus === 'live_birth' ? "ring-emerald-500 bg-emerald-50" : "ring-slate-100")} onClick={() => setDeliveryStatus('live_birth')}>
                        <RadioGroupItem value="live_birth" id="live_birth" />
                        <Label htmlFor="live_birth" className="font-black text-sm cursor-pointer flex-1">👶 Live Birth Confirmed</Label>
                      </div>
                      <div className={cn("flex items-center gap-3 p-4 rounded-2xl ring-2 transition-all cursor-pointer", deliveryStatus === 'stillbirth' ? "ring-rose-500 bg-rose-50" : "ring-slate-100")} onClick={() => setDeliveryStatus('stillbirth')}>
                        <RadioGroupItem value="stillbirth" id="stillbirth" />
                        <Label htmlFor="stillbirth" className="font-black text-sm cursor-pointer flex-1">🕊️ Stillbirth Recorded</Label>
                      </div>
                      <div className={cn("flex items-center gap-3 p-4 rounded-2xl ring-2 transition-all cursor-pointer", deliveryStatus === 'abortion' ? "ring-slate-800 bg-slate-50" : "ring-slate-100")} onClick={() => setDeliveryStatus('abortion')}>
                        <RadioGroupItem value="abortion" id="abortion" />
                        <Label htmlFor="abortion" className="font-black text-sm cursor-pointer flex-1">💔 Abortion / Early Loss</Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}

                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><MessageSquare className="h-3 w-3" /> Qualitative Notes</Label>
                  <Textarea value={callNotes} onChange={e => setCallNotes(e.target.value)} placeholder="Record protocol context or important participant feedback..." className="rounded-[1.5rem] border-2 border-slate-100 min-h-[100px] text-xs italic font-medium p-4 focus:ring-primary/20" />
                </div>
              </div>
            </ScrollArea>
            <DialogFooter className="p-8 bg-muted/20 border-t flex flex-col sm:flex-row gap-3">
              <Button variant="ghost" onClick={() => setCallDialog(null)} className="rounded-2xl font-black uppercase text-[10px] h-12 flex-1">Cancel</Button>
              <Button onClick={logCallOutcome} disabled={isLogging || !callOutcome || (callOutcome === 'contacted' && !deliveryStatus)} className="rounded-2xl font-black uppercase text-[10px] h-12 flex-[2] bg-primary shadow-xl shadow-primary/20 transition-all active:scale-95">
                {isLogging ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                {isLogging ? 'Saving Registry...' : 'Commit Call Outcome'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}