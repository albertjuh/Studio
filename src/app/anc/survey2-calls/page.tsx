"use client";

import { useMemo, useState, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, doc, updateDoc, Timestamp, addDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Calendar as CalendarIcon,
  X,
  Check,
  PhoneCall,
  AlertCircle,
  MessageSquare
} from 'lucide-react';
import { format } from 'date-fns';
import { type AncRegistration } from '@/types';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { resolveParticipantStatuses } from '@/lib/timeline/formulas';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { motion, AnimatePresence } from 'framer-motion';

const RA_CONFIG: Record<string, { color: string; bg: string; border: string; text: string; icon: any }> = {
  'Riki Mahamba': { color: 'emerald', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-600', icon: Building },
  'Lucy': { color: 'cyan', bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-600', icon: Building },
  'Katie': { color: 'pink', bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-600', icon: Home },
  'Majid': { color: 'amber', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600', icon: Home },
};

const DEFAULT_RA = { color: 'slate', bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-500', icon: Users };

const NO_ANSWER_REASONS = [
  { id: 'unreachable', label: 'Unreachable', sub: 'No signal / Off', emoji: '📵' },
  { id: 'no_pick', label: 'No Answer', sub: 'Rang but ignored', emoji: '📳' },
  { id: 'busy', label: 'Busy / Rejected', sub: 'Hung up / Busy', emoji: '🔇' },
  { id: 'callback', label: 'Call Later', sub: 'Requested time', emoji: '🗓️' },
];

const PREGNANCY_OUTCOMES = [
  { id: 'pregnant', label: 'Still Pregnant', sub: 'Continue follow-up', emoji: '🤰' },
  { id: 'live_birth', label: 'Live Birth Confirmed', sub: 'Baby born healthy', emoji: '👶' },
  { id: 'stillbirth', label: 'Stillbirth Recorded', sub: 'Loss at birth', emoji: '🕊️' },
  { id: 'abortion', label: 'Abortion / Early Loss', sub: 'Medical / Miscarriage', emoji: '💔' },
];

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
  const [callOutcome, setCallOutcome] = useState<'contacted' | 'no_answer' | ''>('');
  const [noAnswerReason, setNoAnswerReason] = useState('');
  const [deliveryStatus, setDeliveryStatus] = useState('');
  const [contactDate, setContactDate] = useState<Date>(new Date());
  const [eventDate, setEventDate] = useState<Date | undefined>(undefined);
  const [callNotes, setCallNotes] = useState('');
  const [isLogging, setIsLogging] = useState(false);

  const logCallOutcome = async () => {
    if (!firestore || !callDialog) return;
    setIsLogging(true);
    try {
      const participantId = callDialog.id;
      const isSuccess = callOutcome === 'contacted';
      
      const updates: any = {
        survey2_call_attempted: true,
        survey2_completed: isSuccess,
        survey2_call_attempted_at: Timestamp.now(),
        survey2_call_outcome: isSuccess ? 'contacted' : `no_answer_${noAnswerReason}`,
        survey2_call_notes: callNotes,
        updatedAt: serverTimestamp()
      };

      if (isSuccess) {
        updates.survey2_completed_at = Timestamp.fromDate(contactDate);
        updates.delivery_status = deliveryStatus === 'pregnant' ? 'pregnant' : 'delivered';
        if (deliveryStatus !== 'pregnant' && eventDate) {
            updates.delivery_date_confirmed = Timestamp.fromDate(eventDate);
            updates.delivery_outcome = deliveryStatus;
        }
      }

      await updateDoc(doc(firestore, 'anc_registrations', participantId), updates);
      
      await addDoc(collection(firestore, `anc_registrations/${participantId}/timeline_events`), {
        event_type: 'phone_contact',
        event_date: Timestamp.fromDate(contactDate),
        outcome: isSuccess ? deliveryStatus : noAnswerReason,
        event_outcome_date: (isSuccess && deliveryStatus !== 'pregnant' && eventDate) ? Timestamp.fromDate(eventDate) : null,
        notes: callNotes,
        logged_by: localStorage.getItem('ancUser') ? JSON.parse(localStorage.getItem('ancUser')!).name : 'RA',
        created_at: serverTimestamp()
      });

      toast({ title: 'Activity Logged', variant: 'success' });
      setCallDialog(null);
      setCallOutcome('');
      setNoAnswerReason('');
      setDeliveryStatus('');
      setEventDate(undefined);
      setCallNotes('');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsLogging(false);
    }
  };

  const isSubmissionDisabled = isLogging || 
    !callOutcome || 
    (callOutcome === 'no_answer' && !noAnswerReason) || 
    (callOutcome === 'contacted' && (!deliveryStatus || (deliveryStatus !== 'pregnant' && !eventDate)));

  if (!mounted) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-3 pb-6 px-2 md:px-0 pt-2">
      <div className="flex flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="icon" asChild className="h-11 md:h-8 md:w-8 rounded-lg shadow-sm border-none">
            <Link href="/anc/activities"><ArrowLeft className="h-5 w-5 md:h-4 md:w-4" /></Link>
          </Button>
          <div className="space-y-0">
            <div className="flex items-center gap-1.5 text-primary font-black uppercase text-[9px] md:text-[8px] tracking-widest">
                <Timer className="h-4 w-4 md:h-3 md:w-3" /> Registry S2
            </div>
            <h1 className="text-xl md:text-lg font-black tracking-tighter">Call Plan Dashboard</h1>
          </div>
        </div>
        <Button 
            variant="outline" 
            onClick={() => setShowCalled(!showCalled)} 
            size="sm"
            className={cn("h-11 md:h-8 px-4 rounded-lg font-black uppercase text-[10px] md:text-[9px] tracking-widest", showCalled && "bg-primary text-white border-primary")}
        >
            {showCalled ? 'Showing All' : 'Hide Done'}
        </Button>
      </div>

      <div className="grid gap-1.5 grid-cols-2 md:grid-cols-4">
        {raStats.map((ra) => (
            <Card 
                key={ra.name} 
                className={cn("border-none ring-1 shadow-sm rounded-xl cursor-pointer transition-all h-[64px] md:h-[48px]", filterRA === ra.name ? "ring-2 ring-primary bg-primary/5" : "ring-border bg-white dark:bg-card")}
                onClick={() => setFilterRA(filterRA === ra.name ? null : ra.name)}
            >
                <CardContent className="p-3 md:p-2 flex items-center gap-3 md:gap-2 h-full">
                    <div className={cn("p-2 md:p-1 rounded-lg", filterRA === ra.name ? "bg-primary text-white" : ra.config.bg + " " + ra.config.text)}>
                        <ra.config.icon className="h-5 w-5 md:h-4 md:w-4" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[9px] md:text-[7px] font-black uppercase tracking-widest leading-none mb-1 md:mb-0.5 truncate">{ra.name}</p>
                        <p className="text-base md:text-sm font-black tracking-tighter leading-none">{ra.done}/{ra.total}</p>
                    </div>
                </CardContent>
            </Card>
        ))}
      </div>

      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 md:h-4 md:w-4 text-primary/40" />
          <Input 
            placeholder="Search registry..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            className="pl-10 h-12 md:h-10 rounded-lg border-none ring-1 ring-primary/10 bg-white dark:bg-card text-sm md:text-xs font-bold shadow-sm" 
          />
        </div>

        {isLoading ? (
            <div className="py-20 text-center">
                <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
                <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mt-4">Loading Workload...</p>
            </div>
        ) : filtered.length === 0 ? (
            <div className="py-24 text-center border-2 border-dashed rounded-2xl bg-muted/20 text-[11px] font-black uppercase tracking-widest text-slate-400">Queue Clear</div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {filtered.map((p: any) => (
                    <Card key={p.id} className={cn("border-none ring-1 ring-border/50 shadow-sm rounded-xl overflow-hidden hover:ring-primary/40 group relative transition-all min-h-[96px] md:min-h-[80px]", p.survey2_completed ? 'bg-emerald-50/20' : 'bg-white dark:bg-card')}>
                        <div className={cn("absolute top-0 left-0 w-2 md:w-1 h-full", p.resolved?.survey2_status === 'overdue' ? 'bg-rose-500' : p.resolved?.survey2_status === 'due_now' ? 'bg-amber-500' : 'bg-primary')} />
                        <CardContent className="p-4 md:p-2 flex items-center justify-between gap-4 md:gap-2 h-full">
                            <Link href={`/anc/participants/${p.id}`} className="flex-1 min-w-0 pl-2 md:pl-1 h-full flex flex-col justify-between">
                                <div>
                                    <h3 className="font-bold text-sm md:text-xs truncate leading-none mb-2 md:mb-1">{p.name}</h3>
                                    <div className="flex items-center gap-3 md:gap-2 text-[10px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                        <span className="flex items-center gap-1"><Baby className="h-3.5 w-3.5 md:h-3 md:w-3" /> {p.resolved?.current_ga?.weeks}w</span>
                                        <span className="flex items-center gap-1"><CalendarIcon className="h-3.5 w-3.5 md:h-3 md:w-3" /> {p.resolved?.edd ? format(p.resolved.edd, 'dd MMM') : '--'}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 mt-3 md:mt-2">
                                    <div className="p-1 rounded bg-emerald-50 text-emerald-600"><Phone className="h-3.5 w-3.5 md:h-3 md:w-3" /></div>
                                    <span className="text-xs md:text-[10px] font-mono font-bold">{(Array.isArray(p.phoneNumber) ? p.phoneNumber[0] : p.phoneNumber)}</span>
                                </div>
                            </Link>
                            <div className="flex flex-col items-end gap-3 md:gap-1.5 shrink-0 h-full justify-between">
                                <Badge className={cn("text-[9px] md:text-[7px] font-black border-none px-2 md:px-1 h-5 md:h-4 rounded-sm uppercase tracking-widest", p.resolved?.survey2_status === 'overdue' ? "bg-rose-100 text-rose-700" : p.resolved?.survey2_status === 'due_now' ? "bg-amber-100 text-amber-700" : "bg-primary text-white")}>
                                    {p.resolved?.survey2_status}
                                </Badge>
                                {!p.survey2_completed ? (
                                    <Button size="sm" onClick={(e) => { e.preventDefault(); setCallDialog(p); }} className="rounded-lg text-[10px] md:text-[8px] font-black uppercase tracking-widest h-10 md:h-7 px-5 md:px-4 bg-primary shadow-sm active:scale-95 transition-all">
                                        Log
                                    </Button>
                                ) : <CheckCircle2 className="h-6 w-6 md:h-5 md:w-5 text-emerald-500" />}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        )}
      </div>
      
      {/* LOGGING DIALOG */}
      {callDialog && (
        <Dialog open={!!callDialog} onOpenChange={() => { setCallDialog(null); setCallOutcome(''); }}>
          <DialogContent className="sm:max-w-lg rounded-2xl md:rounded-[2.5rem] border-none shadow-3xl p-0 overflow-hidden bg-[#f9fafb]">
            <div className="absolute top-4 right-4 z-50">
                <DialogClose className="h-10 w-10 md:h-8 md:w-8 rounded-full bg-white shadow-sm border flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity">
                    <X className="h-5 w-5 md:h-4 md:w-4" />
                </DialogClose>
            </div>
            
            <DialogHeader className="p-6 md:p-8 pt-8 md:pt-10 flex flex-row items-center gap-4 text-left border-b bg-white">
                <div className="h-14 w-14 md:h-12 md:w-12 rounded-full bg-emerald-50 shadow-inner flex items-center justify-center border border-emerald-100 shrink-0">
                    <PhoneCall className="h-7 w-7 md:h-6 md:w-6 text-emerald-600" />
                </div>
                <div>
                    <DialogTitle className="text-xl md:text-lg font-black tracking-tight leading-none text-slate-900">Commit Outcome</DialogTitle>
                    <DialogDescription className="text-[10px] md:text-[8px] font-black uppercase tracking-widest text-emerald-600 mt-2">
                        {callDialog.name} • {callDialog.participantId}
                    </DialogDescription>
                </div>
            </DialogHeader>

            <ScrollArea className="max-h-[70vh]">
              <div className="p-6 md:p-8 space-y-6 md:space-y-8">
                {/* SECTION 1: CONTACT OUTCOME */}
                <div className="space-y-3">
                  <Label className="text-[10px] md:text-[9px] font-black uppercase tracking-[0.1em] text-slate-400">Phase 2 Contact Outcome *</Label>
                  <div className="space-y-2">
                    <button 
                        onClick={() => setCallOutcome('contacted')}
                        className={cn(
                            "w-full flex items-center gap-3 p-4 md:p-3 rounded-2xl md:rounded-xl border-2 transition-all text-left",
                            callOutcome === 'contacted' 
                                ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500/20 shadow-sm" 
                                : "border-transparent bg-white hover:border-emerald-200 shadow-sm"
                        )}
                    >
                        <div className={cn(
                            "h-5 w-5 md:h-4 md:w-4 rounded-full border-2 flex items-center justify-center transition-all",
                            callOutcome === 'contacted' ? "border-emerald-600 bg-emerald-600" : "border-slate-200"
                        )}>
                            <div className="h-2 w-2 rounded-full bg-white" />
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 md:h-7 md:w-7 rounded-full bg-emerald-100 flex items-center justify-center">
                                <Check className="h-4 w-4 md:h-3 md:w-3 text-emerald-700" />
                            </div>
                            <span className="text-sm md:text-xs font-black text-slate-800">Success: Protocol Completed</span>
                        </div>
                    </button>

                    <button 
                        onClick={() => setCallOutcome('no_answer')}
                        className={cn(
                            "w-full flex items-center gap-3 p-4 md:p-3 rounded-2xl md:rounded-xl border-2 transition-all text-left",
                            callOutcome === 'no_answer' 
                                ? "border-amber-500 bg-amber-50 ring-1 ring-amber-500/20 shadow-sm" 
                                : "border-transparent bg-white hover:border-amber-100 shadow-sm"
                        )}
                    >
                        <div className={cn(
                            "h-5 w-5 md:h-4 md:w-4 rounded-full border-2 flex items-center justify-center transition-all",
                            callOutcome === 'no_answer' ? "border-amber-600 bg-amber-600" : "border-slate-200"
                        )}>
                            <div className="h-2 w-2 rounded-full bg-white" />
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 md:h-7 md:w-7 rounded-full bg-amber-100 flex items-center justify-center">
                                <AlertCircle className="h-4 w-4 md:h-3 md:w-3 text-amber-700" />
                            </div>
                            <span className="text-sm md:text-xs font-black text-slate-800">Partial: No Answer / Unreachable</span>
                        </div>
                    </button>
                  </div>
                </div>

                {/* DYNAMIC SECTION: SUCCESS OUTCOMES */}
                <AnimatePresence mode="wait">
                    {callOutcome === 'contacted' && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-6 overflow-hidden"
                        >
                            <div className="space-y-3">
                                <Label className="text-[10px] md:text-[9px] font-black uppercase tracking-[0.1em] text-slate-400">Clinical Outcome Category *</Label>
                                <div className="space-y-2">
                                    {PREGNANCY_OUTCOMES.map(o => (
                                        <button 
                                            key={o.id}
                                            onClick={() => setDeliveryStatus(o.id)}
                                            className={cn(
                                                "w-full flex items-center justify-between p-3.5 md:p-2.5 rounded-2xl md:rounded-xl transition-all text-left group",
                                                deliveryStatus === o.id ? "bg-white shadow-md ring-1 ring-emerald-100" : "hover:bg-white/60"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "h-5 w-5 md:h-4 md:w-4 rounded-full border-2 flex items-center justify-center",
                                                    deliveryStatus === o.id ? "border-emerald-500" : "border-slate-200"
                                                )}>
                                                    {deliveryStatus === o.id && <div className="h-2.5 w-2.5 md:h-2 md:w-2 rounded-full bg-emerald-500" />}
                                                </div>
                                                <span className="text-xl md:text-base">{o.emoji}</span>
                                                <span className={cn("text-sm md:text-xs font-black", deliveryStatus === o.id ? "text-slate-900" : "text-slate-500")}>
                                                    {o.label}
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-[9px] md:text-[8px] font-black uppercase text-slate-400">Contact Date</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className="w-full h-11 md:h-10 rounded-xl md:rounded-lg font-bold text-sm md:text-xs bg-white border-none shadow-sm ring-1 ring-black/5">
                                                {format(contactDate, 'dd MMM')}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 rounded-2xl border-none shadow-3xl">
                                            <Calendar mode="single" selected={contactDate} onSelect={(d) => d && setContactDate(d)} disabled={(d) => d > new Date()} />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                {deliveryStatus !== 'pregnant' && deliveryStatus !== '' && (
                                    <div className="space-y-1.5">
                                        <Label className="text-[9px] md:text-[8px] font-black uppercase text-emerald-600">Event Date *</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" className={cn("w-full h-11 md:h-10 rounded-xl md:rounded-lg font-bold text-sm md:text-xs shadow-sm transition-all", eventDate ? "bg-emerald-50/50 border-emerald-100 text-emerald-700" : "bg-rose-50 border-rose-200 text-rose-700")}>
                                                    {eventDate ? format(eventDate, 'dd MMM') : "Select Date..."}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0 rounded-2xl border-none shadow-3xl">
                                                <Calendar mode="single" selected={eventDate} onSelect={setEventDate} disabled={(d) => d > new Date()} />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* DYNAMIC SECTION: NO ANSWER OPTIONS (LIST FORMAT) */}
                    {callOutcome === 'no_answer' && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-3 overflow-hidden"
                        >
                            <Label className="text-[10px] md:text-[9px] font-black uppercase tracking-[0.1em] text-slate-400">Specific Disconnect Reason *</Label>
                            <div className="space-y-2">
                                {NO_ANSWER_REASONS.map(r => (
                                    <button 
                                        key={r.id}
                                        onClick={() => setNoAnswerReason(r.id)}
                                        className={cn(
                                            "w-full flex items-center gap-3 p-3.5 md:p-2.5 rounded-2xl md:rounded-xl border-2 transition-all bg-white",
                                            noAnswerReason === r.id ? "border-amber-500 shadow-sm ring-1 ring-amber-500/20" : "border-transparent hover:border-amber-100 shadow-sm"
                                        )}
                                    >
                                        <div className={cn(
                                            "h-5 w-5 md:h-4 md:w-4 rounded-full border-2 flex items-center justify-center transition-all",
                                            noAnswerReason === r.id ? "border-amber-600 bg-amber-600" : "border-slate-200"
                                        )}>
                                            {noAnswerReason === r.id && <div className="h-2 w-2 md:h-1.5 md:w-1.5 rounded-full bg-white" />}
                                        </div>
                                        <span className="text-xl md:text-lg">{r.emoji}</span>
                                        <div className="text-left">
                                            <p className="font-black text-sm md:text-xs text-slate-800 leading-none">{r.label}</p>
                                            <p className="text-[10px] md:text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">{r.sub}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* QUALITATIVE NOTES */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-400">
                      <MessageSquare className="h-4 w-4 md:h-3.5 md:w-3.5" />
                      <Label className="text-[10px] md:text-[9px] font-black uppercase tracking-widest">Qualitative Notes</Label>
                  </div>
                  <Textarea 
                    value={callNotes} 
                    onChange={e => setCallNotes(e.target.value)} 
                    className="rounded-2xl md:rounded-xl text-sm md:text-[11px] font-medium p-4 md:p-3 min-h-[120px] md:min-h-[100px] border-none shadow-inner bg-[#eef1f4] focus-visible:ring-emerald-500/30" 
                    placeholder="Record protocol context or important participant feedback..." 
                  />
                </div>
              </div>
            </ScrollArea>

            <DialogFooter className="p-6 md:p-8 bg-white border-t flex flex-row items-center gap-4">
              <button 
                onClick={() => { setCallDialog(null); setCallOutcome(''); }} 
                className="text-[10px] md:text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors px-4 md:px-2"
              >
                Cancel
              </button>
              <Button 
                onClick={logCallOutcome} 
                disabled={isSubmissionDisabled} 
                className={cn(
                    "flex-1 h-14 md:h-12 rounded-2xl md:rounded-xl font-black uppercase tracking-widest text-xs md:text-[10px] shadow-xl transition-all active:scale-95 gap-3",
                    isSubmissionDisabled ? "bg-slate-200 text-slate-400 shadow-none" : "bg-[#10b981] hover:bg-[#059669] shadow-emerald-500/20 text-white"
                )}
              >
                {isLogging ? <Loader2 className="h-5 w-5 md:h-4 md:w-4 animate-spin" /> : <CheckCircle2 className="h-5 w-5 md:h-4 md:w-4" />} 
                Commit Outcome
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
