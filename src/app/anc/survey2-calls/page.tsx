"use client";

import { useMemo, useState, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc, Timestamp, addDoc, serverTimestamp } from 'firebase/firestore';
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
  ArrowLeft, 
  Phone, 
  CheckCircle2, 
  AlertCircle, 
  Building, 
  Home, 
  Users, 
  Loader2, 
  Baby, 
  MessageSquare,
  X 
} from 'lucide-react';
import { format } from 'date-fns';
import { type AncRegistration } from '@/types';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { resolveParticipantStatuses } from '@/lib/timeline/formulas';
import { IdBadge } from '@/app/anc/components/id-badge';

const RA_CONFIG: Record<string, { color: string; bg: string; border: string; text: string; location: string; icon: typeof Building }> = {
  'Riki Mahamba': { color: 'emerald', bg: 'bg-emerald-100', border: 'border-emerald-300', text: 'text-emerald-800', location: 'From Office', icon: Building },
  'Lucy': { color: 'cyan', bg: 'bg-cyan-100', border: 'border-cyan-300', text: 'text-cyan-800', location: 'From Office', icon: Building },
  'Katie': { color: 'pink', bg: 'bg-pink-100', border: 'border-pink-300', text: 'text-pink-800', location: 'From Home', icon: Home },
  'Majid': { color: 'yellow', bg: 'bg-yellow-100', border: 'border-yellow-300', text: 'text-yellow-800', location: 'From Home', icon: Home },
};

const DEFAULT_RA = { color: 'slate', bg: 'bg-slate-100', border: 'border-slate-300', text: 'text-slate-700', location: 'Unassigned', icon: Users };

export default function Survey2CallsPage() {
  const firestore = useFirestore();
  const { user: firebaseUser } = useUser();
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

  const withAssignment = useMemo(() => {
    return survey2Workload.map((p: any) => ({
      ...p,
      survey2_assigned_ra: p.registeredBy || 'Unknown',
    }));
  }, [survey2Workload]);

  const activeRAs = useMemo(() => {
    const found = Array.from(new Set(withAssignment.map((p: any) => p.survey2_assigned_ra)));
    const core = ['Riki Mahamba', 'Lucy', 'Katie', 'Majid'];
    const all = Array.from(new Set([...core, ...found])).filter(Boolean).sort();
    return all;
  }, [withAssignment]);

  const filtered = useMemo(() => {
    let list = withAssignment;
    if (filterRA !== 'All') list = list.filter((p: any) => p.survey2_assigned_ra === filterRA);
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
  }, [withAssignment, filterRA, searchTerm, showCalled]);

  const groupedByRA = useMemo(() => {
    const groups: Record<string, any[]> = {};
    activeRAs.forEach(ra => { groups[ra] = []; });
    filtered.forEach((p: any) => {
      const ra = p.survey2_assigned_ra || 'Unknown';
      if (!groups[ra]) groups[ra] = [];
      groups[ra].push(p);
    });
    return groups;
  }, [activeRAs, filtered]);

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
        survey2_completed: callOutcome === 'contacted',
        survey2_call_attempted: true,
        survey2_call_attempted_at: Timestamp.now(),
        survey2_call_outcome: callOutcome,
        survey2_call_notes: callNotes,
        updatedAt: serverTimestamp()
      };

      if (callOutcome === 'contacted') {
        updates.survey2_completed_at = Timestamp.now();
        updates.survey2_delivery_status = deliveryStatus;
        
        if (deliveryStatus !== 'still_pregnant') {
            updates.delivery_status = 'delivered';
            updates.delivery_date_confirmed = Timestamp.now();
            updates.current_trimester = 'postpartum';
            updates.delivery_outcome = 
                deliveryStatus === 'delivered_live' ? 'live_birth' : 
                deliveryStatus === 'delivered_stillbirth' ? 'stillbirth' : 'abortion';
            updates.survey3_status = 'due_now';
        }
      }

      await updateDoc(doc(firestore, 'anc_registrations', participantId), updates);

      await addDoc(collection(firestore, `anc_registrations/${participantId}/timeline_events`), {
        event_type: 'phone_contact',
        event_date: Timestamp.now(),
        notes: `Survey 2 call: ${callOutcome === 'contacted' ? 'Contacted' : (callOutcome === 'no_answer' ? 'No answer' : 'Declined')}. Status: ${deliveryStatus || 'Unspecified'}. ${callNotes}`,
        created_at: serverTimestamp(),
        outcome: callOutcome,
        pregnancy_status_at_contact: deliveryStatus
      });

      toast({ title: 'Call Logged', description: 'Outcome synchronized with global timeline.', variant: 'success' });
      setCallDialog(null);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-24 lg:pb-12 pt-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Link href="/anc/activities">
            <Button variant="ghost" size="icon" className="rounded-2xl h-10 w-10 hover:bg-primary/10 transition-all">
                <ChevronRight className="h-5 w-5 rotate-180" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Survey Operations</p>
                <div className="h-1 w-1 rounded-full bg-slate-300" />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Call Sheet</p>
            </div>
            <h1 className="text-4xl font-black tracking-tighter">Survey 2 Call Plan</h1>
          </div>
        </div>
      </div>

      <div className="flex gap-3 items-center flex-wrap bg-white/60 dark:bg-slate-900/20 p-3 rounded-2xl border border-white/20 backdrop-blur-xl shadow-sm">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
          <Input 
            placeholder="Search by name, ID, or phone..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            className="pl-11 h-12 rounded-xl border-none ring-1 ring-primary/20 bg-background font-bold text-xs shadow-inner" 
          />
        </div>
        <div className="flex items-center gap-2">
            <Button 
                variant={showCalled ? "default" : "outline"} 
                onClick={() => setShowCalled(!showCalled)} 
                className={cn("rounded-xl font-black uppercase tracking-widest text-[10px] h-12 px-6 border-2 transition-all", showCalled ? "bg-primary text-white border-primary" : "border-primary/20")}
            >
                {showCalled ? 'Showing Completed' : 'Hide Completed'}
            </Button>
            {filterRA !== 'All' && (
                <Button variant="ghost" onClick={() => setFilterRA('All')} className="rounded-xl font-black uppercase tracking-widest text-[10px] h-12 text-rose-600 hover:bg-rose-50">Clear Filter</Button>
            )}
        </div>
      </div>

      {isLoading ? (
        <div className="py-32 flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Calculating Workload...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {activeRAs.filter(ra => filterRA === 'All' || filterRA === ra).map(ra => {
            const list = groupedByRA[ra] || [];
            if (list.length === 0) return null;
            const config = RA_CONFIG[ra] || DEFAULT_RA;
            return (
              <Card key={ra} className={cn("border-none shadow-xl ring-1 rounded-[2.5rem] overflow-hidden transition-all", config.border.replace('border-', 'ring-'))}>
                <CardHeader className={cn("p-6 border-b flex flex-col sm:flex-row justify-between items-center gap-4", config.bg)}>
                  <div className="flex items-center gap-4">
                    <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center shadow-lg", config.bg, "bg-white")}>
                        <Phone className={cn("h-6 w-6", config.text)} />
                    </div>
                    <div>
                      <CardTitle className={cn("text-xl font-black tracking-tight", config.text)}>{ra}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={cn("font-black text-[8px] uppercase border-2", config.border, config.text)}>
                            {list.length} {showCalled ? 'Total' : 'Pending'} Calls
                        </Badge>
                        <div className="h-1 w-1 rounded-full bg-slate-400/40" />
                        <span className={cn("text-[9px] font-bold uppercase tracking-widest", config.text)}>{config.location}</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {list.map((p: any) => (
                        <div key={p.id} className={cn(
                            "p-5 flex items-center justify-between gap-4 flex-wrap group transition-all",
                            p.survey2_completed ? 'bg-emerald-50/20' : 'hover:bg-slate-50 dark:hover:bg-white/5'
                        )}>
                        <Link href={`/anc/participants/${p.id}`} className="flex-1 min-w-[240px] space-y-1.5">
                            <div className="flex items-center gap-3">
                                <p className="font-black text-base group-hover:text-primary transition-colors">{p.name}</p>
                                <IdBadge id={p.participantId} hideLabel className="scale-75 origin-left" />
                            </div>
                            <div className="flex items-center gap-4 flex-wrap text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                            <span className="flex items-center gap-1"><Baby className="h-3 w-3" /> GA: {p.resolved?.current_ga?.weeks || '?'}w</span>
                            <span className="flex items-center gap-1"><CalendarIcon className="h-3 w-3" /> EDD: {p.resolved?.edd ? format(p.resolved.edd, 'dd MMM') : 'Pending'}</span>
                            {p.survey2_completed_at && <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Done {format(p.survey2_completed_at.toDate(), 'dd/MM')}</span>}
                            </div>
                        </Link>
                        <div className="flex items-center gap-4 flex-wrap">
                            <div className="flex flex-col items-end gap-1">
                                <Badge className={cn(
                                    "text-[8px] font-black border-none shadow-none px-2 h-5 rounded-md", 
                                    p.resolved?.survey2_status === 'overdue' ? 'bg-rose-600 text-white' : 
                                    p.resolved?.survey2_status === 'due_now' ? 'bg-amber-100 text-amber-800' : 'bg-blue-50 text-blue-700'
                                )}>
                                {p.resolved?.survey2_status.replace('_', ' ').toUpperCase()}
                                </Badge>
                                <span className="text-xs font-mono font-black text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                    {Array.isArray(p.phoneNumber) ? p.phoneNumber[0] : p.phoneNumber}
                                </span>
                            </div>
                            {p.survey2_completed ? (
                                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl shadow-sm"><CheckCircle2 className="h-5 w-5" /></div>
                            ) : (
                                <Button size="sm" onClick={() => openCallDialog(p)} className="rounded-xl text-[10px] font-black uppercase tracking-widest h-10 px-6 bg-primary shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">Log Protocol</Button>
                            )}
                        </div>
                        </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      
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
                    <div className={cn("flex items-center gap-3 p-4 rounded-2xl ring-2 transition-all cursor-pointer", callOutcome === 'declined' ? "ring-rose-500 bg-rose-50/30" : "ring-slate-100 hover:ring-primary/20")} onClick={() => setCallOutcome('declined')}>
                      <RadioGroupItem value="declined" id="declined" />
                      <Label htmlFor="declined" className="font-black text-sm cursor-pointer flex-1 flex items-center gap-2"><X className="h-4 w-4 text-rose-500" /> Failed: Declined Participation</Label>
                    </div>
                  </RadioGroup>
                </div>

                {callOutcome === 'contacted' && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Pregnancy Status *</Label>
                    <RadioGroup value={deliveryStatus} onValueChange={setDeliveryStatus} className="grid grid-cols-1 gap-2">
                      <div className={cn("flex items-center gap-3 p-4 rounded-2xl ring-2 transition-all cursor-pointer", deliveryStatus === 'still_pregnant' ? "ring-primary bg-primary/5" : "ring-slate-100")} onClick={() => setDeliveryStatus('still_pregnant')}>
                        <RadioGroupItem value="still_pregnant" id="still_pregnant" />
                        <Label htmlFor="still_pregnant" className="font-black text-sm cursor-pointer flex-1 items-gap-2">🤰 Still Pregnant</Label>
                      </div>
                      <div className={cn("flex items-center gap-3 p-4 rounded-2xl ring-2 transition-all cursor-pointer", (deliveryStatus && deliveryStatus !== 'still_pregnant') ? "ring-emerald-500 bg-emerald-50" : "ring-slate-100")} onClick={() => setDeliveryStatus('delivered_live')}>
                        <div className="flex flex-col gap-1">
                            <Label className="font-black text-sm cursor-pointer">Confirmed Outcome</Label>
                            <p className="text-[10px] font-medium text-slate-500 leading-tight">If an outcome has occurred, please use the specialized "Outcome Registry" for full clinical documentation.</p>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>
                )}

                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><MessageSquare className="h-3 w-3" /> Qualitative Notes</Label>
                  <Textarea value={callNotes} onChange={e => setCallNotes(e.target.value)} placeholder="Record protocol context or important participant feedback..." className="rounded-[1.5rem] border-2 border-slate-100 min-h-[120px] text-xs italic font-medium p-4 focus:ring-primary/20" />
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

function exportCSVDownload(content: string, fileName: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
