
"use client";

import { useMemo, useState, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, doc, updateDoc, Timestamp, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
  MessageSquare,
  ClipboardCheck,
  Smartphone,
  History,
  RotateCcw
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

export default function GlobalCallPlan() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('2');
  const [filterRA, setFilterRA] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDone, setShowDone] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);

  useEffect(() => {
    setMounted(true);
    const userStr = localStorage.getItem('ancUser');
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
  }, []);

  const isAdmin = user?.role === 'admin';

  const partsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'anc_registrations'));
  }, [firestore]);

  const { data: participants, isLoading } = useCollection<AncRegistration>(partsQuery);

  const workloadBySurvey = useMemo(() => {
    if (!participants) return { '2': [], '3': [], '4': [] };
    
    const results: Record<string, any[]> = { '2': [], '3': [], '4': [] };
    
    participants.forEach(p => {
        const resolved = resolveParticipantStatuses(p);
        if (!resolved || !resolved.isValid) return;

        ['2', '3', '4'].forEach(surveyNum => {
            const statusKey = `survey${surveyNum}_status`;
            const status = (resolved as any)[statusKey];
            if (status === 'due_now' || status === 'due_soon' || status === 'overdue' || status === 'completed') {
                results[surveyNum].push({ ...p, resolved });
            }
        });
    });

    return results;
  }, [participants]);

  const raStats = useMemo(() => {
    const stats: Record<string, { total: number; done: number }> = {};
    const currentList = workloadBySurvey[activeTab] || [];
    currentList.forEach(p => {
      const ra = p.registeredBy || 'Unknown';
      if (!stats[ra]) stats[ra] = { total: 0, done: 0 };
      stats[ra].total++;
      if ((p as any)[`survey${activeTab}_completed`]) stats[ra].done++;
    });
    return Object.entries(stats).map(([name, data]) => ({
      name,
      ...data,
      config: RA_CONFIG[name] || DEFAULT_RA
    })).sort((a, b) => b.total - a.total);
  }, [workloadBySurvey, activeTab]);

  const filtered = useMemo(() => {
    let list = workloadBySurvey[activeTab] || [];
    if (filterRA) list = list.filter((p: any) => (p.registeredBy || 'Unknown') === filterRA);
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      list = list.filter((p: any) =>
        p.name?.toLowerCase().includes(s) ||
        p.participantId?.toLowerCase().includes(s)
      );
    }
    if (!showDone) list = list.filter((p: any) => !(p as any)[`survey${activeTab}_completed`]);
    
    return list.sort((a: any, b: any) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
        return dateA - dateB;
    });
  }, [workloadBySurvey, activeTab, filterRA, searchTerm, showDone]);

  const [logDialog, setLogDialog] = useState<any>(null);
  const [callOutcome, setCallOutcome] = useState<'contacted' | 'no_answer' | ''>('');
  const [noAnswerReason, setNoAnswerReason] = useState('');
  const [deliveryStatus, setDeliveryStatus] = useState('');
  const [contactDate, setContactDate] = useState<Date>(new Date());
  const [eventDate, setEventDate] = useState<Date | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [isLogging, setIsLogging] = useState(false);

  const handleCommitLog = async () => {
    if (!firestore || !logDialog) return;
    setIsLogging(true);
    try {
      const participantId = logDialog.id;
      const surveyNum = activeTab;
      
      const updates: any = {
        updatedAt: serverTimestamp()
      };

      if (surveyNum === '2') {
        const isSuccess = callOutcome === 'contacted';
        updates.survey2_call_attempted = true;
        updates.survey2_completed = isSuccess;
        updates.survey2_call_attempted_at = Timestamp.now();
        updates.survey2_call_outcome = isSuccess ? 'contacted' : `no_answer_${noAnswerReason}`;
        updates.survey2_call_notes = notes;

        if (isSuccess) {
          updates.survey2_completed_at = Timestamp.fromDate(contactDate);
          updates.delivery_status = deliveryStatus === 'pregnant' ? 'pregnant' : 'delivered';
          if (deliveryStatus !== 'pregnant' && eventDate) {
              updates.delivery_date_confirmed = Timestamp.fromDate(eventDate);
              updates.delivery_outcome = deliveryStatus;
          }
        }
      } else {
        updates[`survey${surveyNum}_completed`] = true;
        updates[`survey${surveyNum}_completed_at`] = Timestamp.fromDate(contactDate);
      }

      await updateDoc(doc(firestore, 'anc_registrations', participantId), updates);
      
      await addDoc(collection(firestore, `anc_registrations/${participantId}/timeline_events`), {
        event_type: surveyNum === '2' ? 'phone_contact' : 'survey_completed',
        survey_number: parseInt(surveyNum),
        event_date: Timestamp.fromDate(contactDate),
        outcome: surveyNum === '2' ? (callOutcome === 'contacted' ? deliveryStatus : noAnswerReason) : 'milestone_verified',
        event_outcome_date: (surveyNum === '2' && callOutcome === 'contacted' && deliveryStatus !== 'pregnant' && eventDate) ? Timestamp.fromDate(eventDate) : null,
        notes: notes,
        logged_by: user?.name || 'RA',
        created_at: serverTimestamp()
      });

      toast({ title: `Milestone S${surveyNum} Logged`, variant: 'success' });
      setLogDialog(null);
      resetLogState();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsLogging(false);
    }
  };

  const handleRevertMilestone = async (p: any) => {
    if (!firestore || !isAdmin) return;
    try {
        const surveyNum = activeTab;
        const updates: any = {
            [`survey${surveyNum}_completed`]: false,
            [`survey${surveyNum}_completed_at`]: null,
            updatedAt: serverTimestamp()
        };

        if (surveyNum === '2') {
            updates.survey2_call_attempted = false;
            updates.survey2_call_outcome = null;
            updates.delivery_status = 'pregnant';
        }

        await updateDoc(doc(firestore, 'anc_registrations', p.id), updates);
        
        await addDoc(collection(firestore, `anc_registrations/${p.id}/timeline_events`), {
            event_type: 'reminder_set', // Use an existing type or generic
            notes: `Milestone S${surveyNum} was reverted by Administrator ${user?.name} for protocol correction.`,
            logged_by: user?.name,
            event_date: serverTimestamp(),
            created_at: serverTimestamp()
        });

        toast({ title: "Milestone Reverted", description: `Participant is now back in the S${surveyNum} queue.`, variant: "success" });
    } catch (err: any) {
        toast({ title: "Revert Failed", description: err.message, variant: "destructive" });
    }
  };

  const resetLogState = () => {
    setCallOutcome('');
    setNoAnswerReason('');
    setDeliveryStatus('');
    setEventDate(undefined);
    setNotes('');
    setContactDate(new Date());
  };

  const isSubmissionDisabled = isLogging || 
    (activeTab === '2' ? (
        !callOutcome || 
        (callOutcome === 'no_answer' && !noAnswerReason) || 
        (callOutcome === 'contacted' && (!deliveryStatus || (deliveryStatus !== 'pregnant' && !eventDate)))
    ) : false);

  if (!mounted) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-4 pb-12 px-2 md:px-0 pt-2">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="icon" asChild className="h-9 w-9 rounded-xl shadow-sm border-none bg-background">
            <Link href="/anc/activities"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="space-y-0">
            <div className="flex items-center gap-1.5 text-primary font-black uppercase text-[9px] md:text-[8px] tracking-[0.2em]">
                <Timer className="h-4 w-4 md:h-3.5 md:w-3.5" /> Registry Outreach
            </div>
            <h1 className="text-2xl font-black tracking-tighter">Call Plan</h1>
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setFilterRA(null); }} className="w-full md:w-auto">
            <TabsList className="bg-muted/50 p-1 h-11 md:h-10 rounded-xl w-full md:w-auto grid grid-cols-3">
                <TabsTrigger value="2" className="rounded-lg font-black uppercase text-[10px] md:text-[9px] tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white">S2 Outreach</TabsTrigger>
                <TabsTrigger value="3" className="rounded-lg font-black uppercase text-[10px] md:text-[9px] tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white">S3 Delivery</TabsTrigger>
                <TabsTrigger value="4" className="rounded-lg font-black uppercase text-[10px] md:text-[9px] tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white">S4 Follow-up</TabsTrigger>
            </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-1.5 grid-cols-2 md:grid-cols-4">
        {raStats.length === 0 ? (
            <div className="col-span-full py-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-muted/20 rounded-xl">No active RA assignments for S{activeTab}</div>
        ) : (
            raStats.map((ra) => (
                <Card 
                    key={ra.name} 
                    className={cn("border-none ring-1 shadow-sm rounded-xl cursor-pointer transition-all h-[64px] md:h-[52px]", filterRA === ra.name ? "ring-2 ring-primary bg-primary/5" : "ring-border bg-white dark:bg-card")}
                    onClick={() => setFilterRA(filterRA === ra.name ? null : ra.name)}
                >
                    <CardContent className="p-3 md:p-2 flex items-center gap-3 md:gap-2 h-full">
                        <div className={cn("p-2 md:p-1.5 rounded-lg", filterRA === ra.name ? "bg-primary text-white" : ra.config.bg + " " + ra.config.text)}>
                            <ra.config.icon className="h-5 w-5 md:h-4 md:w-4" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[9px] md:text-[7px] font-black uppercase tracking-widest leading-none mb-1 md:mb-0.5 truncate">{ra.name}</p>
                            <p className="text-base md:text-sm font-black tracking-tighter leading-none">{ra.done}/{ra.total}</p>
                        </div>
                    </CardContent>
                </Card>
            ))
        )}
      </div>

      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 md:h-4 md:w-4 text-primary/40" />
                <Input 
                    placeholder="Search registry..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    className="pl-10 h-12 md:h-10 rounded-xl border-none ring-1 ring-primary/10 bg-white dark:bg-card text-sm md:text-xs font-bold shadow-sm" 
                />
            </div>
            <Button 
                variant="outline" 
                onClick={() => setShowDone(!showDone)} 
                className={cn("h-12 md:h-10 px-6 rounded-xl font-black uppercase text-[10px] md:text-[9px] tracking-widest", showDone && "bg-primary text-white border-primary")}
            >
                {showDone ? 'Showing All' : 'Hide Completed'}
            </Button>
        </div>

        {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Syncing Workload...</p>
            </div>
        ) : filtered.length === 0 ? (
            <div className="py-32 text-center border-2 border-dashed rounded-[2rem] bg-muted/20 flex flex-col items-center gap-4">
                <ClipboardCheck className="h-12 w-12 text-slate-300" />
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Task Queue Clear for S{activeTab}</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {filtered.map((p: any) => {
                    const status = (p.resolved as any)[`survey${activeTab}_status`];
                    const isDone = (p as any)[`survey${activeTab}_completed`];
                    return (
                        <Card key={p.id} className={cn("border-none ring-1 ring-border/50 shadow-sm rounded-2xl overflow-hidden hover:ring-primary/40 group relative transition-all min-h-[100px] md:min-h-[85px]", isDone ? 'bg-emerald-50/20' : 'bg-white dark:bg-card')}>
                            <div className={cn("absolute top-0 left-0 w-1.5 md:w-1 h-full", status === 'overdue' ? 'bg-rose-500' : status === 'due_now' ? 'bg-amber-500' : 'bg-primary')} />
                            <CardContent className="p-4 md:p-2.5 flex items-center justify-between gap-4 h-full">
                                <Link href={`/anc/participants/${p.id}`} className="flex-1 min-w-0 pl-2 h-full flex flex-col justify-between">
                                    <div>
                                        <h3 className="font-bold text-sm md:text-xs truncate leading-none mb-2">{p.name}</h3>
                                        <div className="flex items-center gap-3 text-[10px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                            <span className="flex items-center gap-1"><Baby className="h-3.5 w-3.5" /> {p.resolved?.current_ga?.weeks}w</span>
                                            <span className="flex items-center gap-1"><CalendarIcon className="h-3.5 w-3.5" /> {p.resolved?.edd ? format(p.resolved.edd, 'dd MMM') : '--'}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 mt-3">
                                        <div className="p-1 rounded bg-emerald-50 text-emerald-600"><Smartphone className="h-3.5 w-3.5 md:h-3 md:w-3" /></div>
                                        <span className="text-xs md:text-[10px] font-mono font-bold">{(Array.isArray(p.phoneNumber) ? p.phoneNumber[0] : p.phoneNumber)}</span>
                                    </div>
                                </Link>
                                <div className="flex flex-col items-end gap-3 shrink-0 h-full justify-between">
                                    <Badge className={cn("text-[9px] md:text-[7px] font-black border-none px-2 h-5 rounded-md uppercase tracking-widest shadow-none", status === 'overdue' ? "bg-rose-100 text-rose-700" : status === 'due_now' ? "bg-amber-100 text-amber-700" : "bg-primary text-white")}>
                                        {status}
                                    </Badge>
                                    {!isDone ? (
                                        <Button size="sm" onClick={(e) => { e.preventDefault(); setLogDialog(p); }} className="rounded-xl text-[10px] md:text-[8px] font-black uppercase tracking-widest h-10 md:h-8 px-6 md:px-4 bg-primary shadow-lg shadow-primary/20 active:scale-95 transition-all">
                                            Log S{activeTab}
                                        </Button>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            {isAdmin && (
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg">
                                                            <RotateCcw className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl">
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle className="font-black text-xl tracking-tight uppercase">Revert Milestone S{activeTab}?</AlertDialogTitle>
                                                            <AlertDialogDescription className="text-sm font-medium">
                                                                This will mark <span className="font-bold text-foreground">{p.name}</span>'s Survey {activeTab} as incomplete and return them to the active call queue. This action will be audited.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter className="gap-2">
                                                            <AlertDialogCancel className="h-11 rounded-xl font-black uppercase text-[10px] tracking-widest">Cancel</AlertDialogCancel>
                                                            <AlertDialogAction 
                                                                onClick={() => handleRevertMilestone(p)}
                                                                className="h-11 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black uppercase text-[10px] tracking-widest border-none"
                                                            >
                                                                Revert Completion
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            )}
                                            <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        )}
      </div>
      
      {/* GLOBAL LOGGING DIALOG */}
      {logDialog && (
        <Dialog open={!!logDialog} onOpenChange={() => { setLogDialog(null); resetLogState(); }}>
          <DialogContent className="sm:max-w-lg rounded-[2.5rem] border-none shadow-3xl p-0 overflow-hidden bg-[#f9fafb]">
            <div className="absolute top-4 right-4 z-50">
                <DialogClose className="h-10 w-10 md:h-8 md:w-8 rounded-full bg-white shadow-sm border flex items-center justify-center opacity-60 hover:opacity-100">
                    <X className="h-5 w-5 md:h-4 md:w-4" />
                </DialogClose>
            </div>
            
            <DialogHeader className="p-6 md:p-8 pt-8 md:pt-10 flex flex-row items-center gap-4 text-left border-b bg-white">
                <div className="h-14 w-14 md:h-12 md:w-12 rounded-full bg-emerald-50 shadow-inner flex items-center justify-center border border-emerald-100 shrink-0">
                    {activeTab === '2' ? <PhoneCall className="h-7 w-7 md:h-6 md:w-6 text-emerald-600" /> : <ClipboardCheck className="h-7 w-7 md:h-6 md:w-6 text-emerald-600" />}
                </div>
                <div>
                    <DialogTitle className="text-xl md:text-lg font-black tracking-tight leading-none text-slate-900">Commit S{activeTab} Outcome</DialogTitle>
                    <DialogDescription className="text-[10px] md:text-[8px] font-black uppercase tracking-widest text-emerald-600 mt-2">
                        {logDialog.name} • {logDialog.participantId}
                    </DialogDescription>
                </div>
            </DialogHeader>

            <ScrollArea className="max-h-[70vh]">
              <div className="p-6 md:p-8 space-y-6 md:space-y-8">
                {activeTab === '2' ? (
                    <>
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
                                <span className="text-sm md:text-xs font-black text-slate-800">Success: Protocol Completed</span>
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
                                <span className="text-sm md:text-xs font-black text-slate-800">Partial: No Answer / Unreachable</span>
                            </button>
                        </div>
                        </div>

                        <AnimatePresence mode="wait">
                            {callOutcome === 'contacted' && (
                                <motion.div 
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="space-y-6 overflow-hidden"
                                >
                                    <div className="space-y-3">
                                        <Label className="text-[10px] md:text-[9px] font-black uppercase tracking-[0.1em] text-slate-400">Clinical Status *</Label>
                                        <div className="grid grid-cols-1 gap-2">
                                            {PREGNANCY_OUTCOMES.map(o => (
                                                <button 
                                                    key={o.id}
                                                    onClick={() => setDeliveryStatus(o.id)}
                                                    className={cn(
                                                        "w-full flex items-center justify-between p-3.5 md:p-2.5 rounded-2xl md:rounded-xl transition-all text-left",
                                                        deliveryStatus === o.id ? "bg-white shadow-md ring-1 ring-emerald-100 border-2 border-emerald-500" : "bg-white/50 border-2 border-transparent hover:border-emerald-100"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xl md:text-base">{o.emoji}</span>
                                                        <span className={cn("text-sm md:text-xs font-black", deliveryStatus === o.id ? "text-slate-900" : "text-slate-500")}>
                                                            {o.label}
                                                        </span>
                                                    </div>
                                                    {deliveryStatus === o.id && <Check className="h-4 w-4 text-emerald-600" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {deliveryStatus !== 'pregnant' && deliveryStatus !== '' && (
                                        <div className="p-4 bg-rose-50 rounded-2xl border-2 border-dashed border-rose-200">
                                            <Label className="text-[10px] md:text-[9px] font-black uppercase text-rose-600 mb-2 block">Mandatory Event Date *</Label>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="outline" className={cn("w-full h-12 rounded-xl font-bold bg-white border-none shadow-sm transition-all", eventDate ? "text-emerald-700" : "text-rose-700")}>
                                                        {eventDate ? format(eventDate, 'PPP') : "Select Event Date..."}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-40" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0 border-none shadow-4xl">
                                                    <Calendar mode="single" selected={eventDate} onSelect={setEventDate} disabled={(d) => d > new Date()} />
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {callOutcome === 'no_answer' && (
                                <motion.div 
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="space-y-3 overflow-hidden"
                                >
                                    <Label className="text-[10px] md:text-[9px] font-black uppercase tracking-[0.1em] text-slate-400">Disconnect Reason *</Label>
                                    <div className="space-y-2">
                                        {NO_ANSWER_REASONS.map(r => (
                                            <button 
                                                key={r.id}
                                                onClick={() => setNoAnswerReason(r.id)}
                                                className={cn(
                                                    "w-full flex items-center gap-3 p-3.5 md:p-3 rounded-2xl md:rounded-xl border-2 transition-all bg-white",
                                                    noAnswerReason === r.id ? "border-amber-500 shadow-sm ring-1 ring-amber-500/20" : "border-transparent hover:border-amber-100"
                                                )}
                                            >
                                                <span className="text-xl md:text-lg">{r.emoji}</span>
                                                <div className="text-left flex-1">
                                                    <p className="font-black text-sm md:text-xs text-slate-800 leading-none">{r.label}</p>
                                                    <p className="text-[10px] md:text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">{r.sub}</p>
                                                </div>
                                                {noAnswerReason === r.id && <Check className="h-4 w-4 text-amber-600" />}
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </>
                ) : (
                    /* S3 & S4 LOGGING */
                    <div className="space-y-6">
                        <div className="p-6 rounded-3xl bg-primary/5 border-2 border-dashed border-primary/20 text-center space-y-3">
                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                                <CheckCircle2 className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <h4 className="font-black text-lg tracking-tight">Verify Milestone S{activeTab}</h4>
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Recording completion for {logDialog.name}</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-[10px] md:text-[9px] font-black uppercase text-slate-400">Milestone Verification Date *</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full h-12 rounded-2xl font-bold bg-white shadow-sm">
                                        {format(contactDate, 'PPP')}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-40" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 border-none shadow-4xl">
                                    <Calendar mode="single" selected={contactDate} onSelect={(d) => d && setContactDate(d)} disabled={(d) => d > new Date()} />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-400">
                      <MessageSquare className="h-4 w-4 md:h-3.5 md:w-3.5" />
                      <Label className="text-[10px] md:text-[9px] font-black uppercase tracking-widest">Clinical Context</Label>
                  </div>
                  <Textarea 
                    value={notes} 
                    onChange={e => setNotes(e.target.value)} 
                    className="rounded-3xl md:rounded-2xl text-sm md:text-[11px] font-medium p-4 md:p-3 min-h-[120px] md:min-h-[100px] border-none shadow-inner bg-[#eef1f4] focus-visible:ring-emerald-500/30" 
                    placeholder="Enter any qualitative context or participant feedback..." 
                  />
                </div>
              </div>
            </ScrollArea>

            <DialogFooter className="p-6 md:p-8 bg-white border-t flex flex-row items-center gap-4">
              <button 
                onClick={() => setLogDialog(null)} 
                className="text-[10px] md:text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors px-4"
              >
                Cancel
              </button>
              <Button 
                onClick={handleCommitLog} 
                disabled={isSubmissionDisabled} 
                className={cn(
                    "flex-1 h-14 md:h-12 rounded-2xl font-black uppercase tracking-widest text-xs md:text-[10px] shadow-xl transition-all active:scale-95 gap-3",
                    isSubmissionDisabled ? "bg-slate-200 text-slate-400 shadow-none" : "bg-primary hover:bg-primary/90 shadow-primary/20 text-white"
                )}
              >
                {isLogging ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />} 
                Commit Outcome
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
