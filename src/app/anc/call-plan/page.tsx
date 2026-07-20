
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  RotateCcw,
  LogOut,
  Plane,
  UserX,
  MapPin,
  AlertTriangle,
  Info
} from 'lucide-react';
import { format } from 'date-fns';
import { type AncRegistration } from '@/types';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { resolveParticipantStatuses } from '@/lib/timeline/formulas';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { motion } from 'framer-motion';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
  'Riki Mahamba (ID: riki_mahamba)': { color: 'emerald', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-600', icon: Building },
  'Lucy': { color: 'cyan', bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-600', icon: Building },
  'Lucy (ID: lucy_25)': { color: 'cyan', bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-600', icon: Building },
  'Katie': { color: 'pink', bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-600', icon: Home },
  'Katie (ID: katie123)': { color: 'pink', bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-600', icon: Home },
  'Majid': { color: 'amber', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600', icon: Home },
  'Majid (ID: majid_24)': { color: 'amber', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600', icon: Home },
  'shploghers': { color: 'amber', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600', icon: Home },
};

const DEFAULT_RA = { color: 'slate', bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-500', icon: Users };

const PRIMARY_OUTCOMES = [
  { id: 'contacted', label: 'Contacted', sub: 'Reached & interviewed', emoji: '✅', color: 'text-emerald-600' },
  { id: 'no_answer', label: 'No Answer', sub: 'Unreachable / Retrying', emoji: '📵', color: 'text-amber-600' },
  { id: 'declined', label: 'Declined', sub: 'Refused survey', emoji: '❌', color: 'text-rose-600' },
];

const PREGNANCY_STATUSES = [
  { id: 'still_pregnant', label: 'Still Pregnant', sub: 'Continue tracking', emoji: '🤰' },
  { id: 'delivered_live', label: 'Delivered Live', sub: 'Healthy baby born', emoji: '👶' },
  { id: 'delivered_stillbirth', label: 'Stillbirth', sub: 'Loss at birth', emoji: '🕊️' },
  { id: 'miscarriage', label: 'Miscarriage', sub: 'Early pregnancy loss', emoji: '💔' },
];

const SPECIAL_CIRCUMSTANCES = [
  { id: 'withdrew_self', label: 'Withdrew: Self', sub: 'Personal request', icon: LogOut, danger: true },
  { id: 'withdrew_partner', label: 'Withdrew: Partner', sub: 'Partner refused', icon: UserX, danger: true },
  { id: 'withdrew_family', label: 'Withdrew: Family', sub: 'Family pressure', icon: Users, danger: true },
  { id: 'relocated_outside_region', label: 'Relocated', sub: 'Moved outside region', icon: Plane, warning: true },
  { id: 'delivering_outside_region', label: 'Delivering Elsewhere', sub: 'Outside Temeke', icon: MapPin, warning: true },
  { id: 'lost_to_followup', label: 'Lost to Follow-up', sub: '3+ failed attempts', icon: AlertTriangle, danger: true },
  { id: 'other_protocol_deviation', label: 'Protocol Deviation', sub: 'Other issues', icon: Info },
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
        // CRITICAL: Filter out participants with terminal study statuses from the call plan workload
        if (['withdrawn', 'out_of_area', 'pregnancy_loss', 'lost_to_followup'].includes(p.study_status)) return;

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

  // LOGGING STATE
  const [logDialog, setLogDialog] = useState<any>(null);
  const [primaryOutcome, setPrimaryOutcome] = useState<string>('');
  const [pregStatus, setPregStatus] = useState<string>('');
  const [specialCirc, setSpecialCirc] = useState<string>('');
  const [showSpecialOptions, setShowSpecialOptions] = useState(false);
  
  const [eventDate, setEventDate] = useState<Date>(new Date());
  const [deliveryFacility, setDeliveryFacility] = useState('');
  const [babyCondition, setBabyCondition] = useState('');
  const [relocationLocation, setRelocationLocation] = useState('');
  const [dataRetention, setDataRetention] = useState<'keep' | 'delete'>('keep');
  const [notes, setNotes] = useState('');
  const [isLogging, setIsLogging] = useState(false);

  const resetLogState = () => {
    setPrimaryOutcome('');
    setPregStatus('');
    setSpecialCirc('');
    setShowSpecialOptions(false);
    setEventDate(new Date());
    setDeliveryFacility('');
    setBabyCondition('');
    setRelocationLocation('');
    setDataRetention('keep');
    setNotes('');
    setIsLogging(false);
  };

  const handleCommitLog = async () => {
    if (!firestore || !logDialog) return;
    setIsLogging(true);
    try {
      const pId = logDialog.id;
      const updates: any = { updatedAt: serverTimestamp() };
      let timelineType: any = 'phone_contact';
      let outcomeStr = '';

      if (activeTab === '2') {
        updates.survey2_call_attempted = true;
        updates.survey2_call_attempted_at = Timestamp.now();
        
        if (specialCirc && specialCirc.startsWith('withdrew')) {
            updates.study_status = 'withdrawn';
            updates.withdrawal_date = Timestamp.fromDate(eventDate);
            updates.withdrawal_reason = specialCirc;
            updates.withdrawal_notes = notes;
            updates.data_retention_preference = dataRetention;
            updates.requires_admin_review = dataRetention === 'delete';
            timelineType = specialCirc;
            outcomeStr = 'Study Withdrawal';
        } else if (specialCirc === 'relocated_outside_region' || specialCirc === 'delivering_outside_region') {
            updates.study_status = 'out_of_area';
            updates.relocation_date = Timestamp.fromDate(eventDate);
            updates.relocation_location = relocationLocation;
            timelineType = 'relocation';
            outcomeStr = `Relocated to ${relocationLocation}`;
        } else if (specialCirc === 'lost_to_followup') {
            updates.study_status = 'lost_to_followup';
            updates.last_contact_attempt = Timestamp.now();
            timelineType = 'lost_followup_attempt';
            outcomeStr = 'Confirmed Lost to Follow-up';
        } else if (primaryOutcome === 'contacted') {
            updates.survey2_completed = true;
            updates.survey2_completed_at = serverTimestamp();
            
            if (pregStatus === 'delivered_live' || pregStatus === 'delivered_stillbirth') {
                updates.study_status = 'delivered';
                updates.delivery_status = 'delivered';
                updates.delivery_date_confirmed = Timestamp.fromDate(eventDate);
                updates.delivery_facility = deliveryFacility;
                updates.baby_condition = babyCondition;
                updates.delivery_outcome = pregStatus === 'delivered_live' ? 'live_birth' : 'stillbirth';
                timelineType = 'delivery_recorded';
                outcomeStr = `Delivery recorded at ${deliveryFacility}`;
            } else if (pregStatus === 'miscarriage') {
                updates.study_status = 'pregnancy_loss';
                updates.delivery_outcome = 'miscarriage';
                timelineType = 'protocol_deviation';
                outcomeStr = 'Pregnancy Loss / Miscarriage';
            } else {
                updates.study_status = 'active';
                updates.delivery_status = 'pregnant';
                outcomeStr = 'Still Pregnant - Follow-up Ongoing';
            }
        } else if (primaryOutcome === 'no_answer') {
            updates.last_contact_attempt = Timestamp.now();
            updates.failed_contact_count = (logDialog.failed_contact_count || 0) + 1;
            outcomeStr = 'No Answer - Attempt Logged';
        } else if (primaryOutcome === 'declined') {
            updates.study_status = 'withdrawn';
            updates.withdrawal_reason = 'Participant declined S2';
            outcomeStr = 'Declined Interview';
        }
      } else {
        updates[`survey${activeTab}_completed`] = true;
        updates[`survey${activeTab}_completed_at`] = Timestamp.fromDate(eventDate);
        outcomeStr = `Milestone Survey ${activeTab} Verified`;
        timelineType = 'survey_completed';
      }

      await updateDoc(doc(firestore, 'anc_registrations', pId), updates);
      
      await addDoc(collection(firestore, `anc_registrations/${pId}/timeline_events`), {
        event_type: timelineType,
        survey_number: parseInt(activeTab),
        event_date: Timestamp.fromDate(eventDate),
        outcome: outcomeStr,
        notes: notes,
        logged_by: user?.name || 'RA',
        created_at: serverTimestamp()
      });

      toast({ title: "Outcome Committed", variant: "success" });
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
        const updates: any = {
            [`survey${activeTab}_completed`]: false,
            [`survey${activeTab}_completed_at`]: null,
            updatedAt: serverTimestamp()
        };

        if (activeTab === '2') {
            updates.survey2_call_attempted = false;
            updates.survey2_call_attempted_at = null;
        }

        await updateDoc(doc(firestore, 'anc_registrations', p.id), updates);
        
        await addDoc(collection(firestore, `anc_registrations/${p.id}/timeline_events`), {
            event_type: 'protocol_deviation',
            event_date: serverTimestamp(),
            outcome: `Milestone S${activeTab} was reverted by Administrator ${user.name} for protocol correction.`,
            logged_by: user.name,
            created_at: serverTimestamp()
        });

        toast({ title: "Milestone Reverted", variant: "success" });
    } catch (err: any) {
        toast({ title: "Reversion Failed", description: err.message, variant: "destructive" });
    }
  };

  if (!mounted) return null;

  const isWithdrawal = specialCirc && specialCirc.startsWith('withdrew');
  const isRelocation = specialCirc === 'relocated_outside_region' || specialCirc === 'delivering_outside_region';
  const isDelivery = pregStatus === 'delivered_live' || pregStatus === 'delivered_stillbirth';

  return (
    <div className="max-w-5xl mx-auto space-y-4 pb-12 px-2 md:px-0 pt-2">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="icon" asChild className="h-9 w-9 rounded-xl shadow-sm border-none bg-background">
            <Link href="/anc/activities"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="space-y-0">
            <div className="flex items-center gap-1.5 text-primary font-black uppercase text-[9px] md:text-[8px] tracking-[0.2em]">
                <Timer className="h-4 w-4 md:h-3.5 md:w-3.5" /> Study Outreach
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
        {raStats.map((ra) => (
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
        ))}
      </div>

      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 md:h-4 w-4 text-primary/40" />
                <Input 
                    placeholder="Search cohort..." 
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
                <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Syncing Tasks...</p>
            </div>
        ) : filtered.length === 0 ? (
            <div className="py-32 text-center border-2 border-dashed rounded-[2rem] bg-muted/20 flex flex-col items-center gap-4">
                <ClipboardCheck className="h-12 w-12 text-slate-300" />
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Task Queue Clear</p>
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
                                <Link href={`/anc/participants/${encodeURIComponent(p.id)}`} className="flex-1 min-w-0 pl-2 h-full flex flex-col justify-between">
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
                                            <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                                            {isAdmin && (
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="secondary" size="icon" className="h-8 w-8 rounded-lg hover:bg-amber-100 hover:text-amber-700 transition-all border shadow-sm">
                                                            <RotateCcw className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent className="rounded-[2rem]">
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle className="font-black text-xl">Revert Milestone S{activeTab}?</AlertDialogTitle>
                                                            <AlertDialogDescription className="text-sm font-medium">This will reset the completion status for <span className="font-bold text-foreground">{p.name}</span> and return them to the active outreach queue.</AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter className="gap-2">
                                                            <AlertDialogCancel className="h-11 rounded-xl font-bold uppercase text-[10px]">Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleRevertMilestone(p)} className="h-11 rounded-xl bg-amber-600 hover:bg-amber-700 font-bold uppercase text-[10px]">Confirm Reversion</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            )}
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
          <DialogContent className="sm:max-w-2xl rounded-[2.5rem] border-none shadow-3xl p-0 overflow-hidden bg-[#f9fafb]">
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

            <ScrollArea className="max-h-[75vh]">
              <div className="p-6 md:p-8 space-y-8">
                {activeTab === '2' ? (
                    <div className="space-y-8">
                        <div className="space-y-4">
                            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400">1. Phase 2 Contact Status *</Label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {PRIMARY_OUTCOMES.map(o => (
                                    <button 
                                        key={o.id}
                                        onClick={() => { 
                                            setPrimaryOutcome(o.id); 
                                            if(o.id !== 'contacted') {
                                                setPregStatus(''); 
                                                setShowSpecialOptions(false);
                                                setSpecialCirc('');
                                            }
                                        }}
                                        className={cn(
                                            "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all text-center gap-1 bg-white",
                                            primaryOutcome === o.id ? "border-emerald-500 ring-1 ring-emerald-500/20 shadow-md" : "border-transparent hover:border-emerald-100 shadow-sm"
                                        )}
                                    >
                                        <span className="text-2xl">{o.emoji}</span>
                                        <span className={cn("text-[10px] font-black uppercase leading-none mt-1", o.color)}>{o.label}</span>
                                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{o.sub}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {primaryOutcome === 'contacted' && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                                <div className="space-y-4">
                                    <Label className="text-[11px] font-black uppercase tracking-widest text-emerald-600">2. Current Clinical Status *</Label>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        {PREGNANCY_STATUSES.map(o => (
                                            <button 
                                                key={o.id}
                                                onClick={() => setPregStatus(o.id)}
                                                className={cn(
                                                    "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all text-center gap-1 bg-white",
                                                    pregStatus === o.id ? "border-emerald-500 ring-1 ring-emerald-500/20 shadow-md" : "border-transparent hover:border-emerald-100 shadow-sm"
                                                )}
                                            >
                                                <span className="text-xl">{o.emoji}</span>
                                                <span className="text-[9px] font-black uppercase leading-none">{o.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-2">
                                    {!showSpecialOptions ? (
                                        <Button 
                                            variant="outline" 
                                            onClick={() => setShowSpecialOptions(true)}
                                            className="w-full h-14 md:h-12 rounded-2xl border-2 border-dashed border-slate-200 text-slate-500 font-black uppercase text-[10px] md:text-[9px] tracking-widest hover:bg-slate-50 transition-all"
                                        >
                                            <AlertTriangle className="h-4 w-4 md:h-3.5 md:w-3.5 mr-2" /> Report Special Circumstance / Protocol Deviation
                                        </Button>
                                    ) : (
                                        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-[11px] font-black uppercase tracking-widest text-emerald-600">3. Special Circumstances & Deviations</Label>
                                                <button 
                                                    onClick={() => { setShowSpecialOptions(false); setSpecialCirc(''); }} 
                                                    className="text-[9px] font-black uppercase text-slate-400 hover:text-rose-600 flex items-center gap-1"
                                                >
                                                    <RotateCcw className="h-3 w-3" /> Reset & Hide
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                {SPECIAL_CIRCUMSTANCES.map(o => (
                                                    <button 
                                                        key={o.id}
                                                        onClick={() => setSpecialCirc(specialCirc === o.id ? '' : o.id)}
                                                        className={cn(
                                                            "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all text-center gap-1 bg-white min-h-[70px]",
                                                            specialCirc === o.id 
                                                                ? (o.danger ? "border-rose-500 bg-rose-50" : o.warning ? "border-amber-500 bg-amber-50" : "border-blue-500 bg-blue-50") 
                                                                : "border-transparent hover:bg-slate-50 shadow-sm"
                                                        )}
                                                    >
                                                        <o.icon className={cn("h-5 w-5 mb-1", specialCirc === o.id ? (o.danger ? "text-rose-600" : o.warning ? "text-amber-600" : "text-blue-600") : "text-slate-400")} />
                                                        <span className="text-[8px] font-black uppercase leading-tight">{o.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {isDelivery && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="p-5 bg-emerald-50 rounded-2xl border-2 border-dashed border-emerald-200 space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase">Delivery Date *</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" className="w-full h-11 rounded-xl bg-white text-sm font-bold">
                                                    {format(eventDate, 'PPP')}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-30" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0 border-none shadow-3xl">
                                                <Calendar mode="single" selected={eventDate} onSelect={(d) => d && setEventDate(d)} disabled={(d) => d > new Date()} />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase">Facility *</Label>
                                        <Input value={deliveryFacility} onChange={e => setDeliveryFacility(e.target.value)} placeholder="e.g. Temeke RRH" className="h-11 rounded-xl bg-white font-bold" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase">Baby's Condition at Discharge</Label>
                                    <Input value={babyCondition} onChange={e => setBabyCondition(e.target.value)} placeholder="e.g. Alive and healthy" className="h-11 rounded-xl bg-white font-bold" />
                                </div>
                            </motion.div>
                        )}

                        {isWithdrawal && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="p-6 bg-rose-50 rounded-2xl border-2 border-rose-200 space-y-6">
                                <div className="flex items-start gap-3 text-rose-800">
                                    <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                                    <p className="text-xs font-bold leading-relaxed">This will discontinue all future study activities. Please confirm ethical preferences with the participant.</p>
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black uppercase">Data Retention Preference *</Label>
                                    <RadioGroup value={dataRetention} onValueChange={(v: any) => setDataRetention(v)} className="flex gap-4">
                                        <div className="flex items-center space-x-2 bg-white px-4 py-3 rounded-xl ring-1 ring-slate-200">
                                            <RadioGroupItem value="keep" id="ret-keep" />
                                            <Label htmlFor="ret-keep" className="text-xs font-bold">Keep (Anonymized)</Label>
                                        </div>
                                        <div className="flex items-center space-x-2 bg-white px-4 py-3 rounded-xl ring-1 ring-rose-200">
                                            <RadioGroupItem value="delete" id="ret-del" className="text-rose-600" />
                                            <Label htmlFor="ret-del" className="text-xs font-bold text-rose-700">Delete Permanently</Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                            </motion.div>
                        )}

                        {isRelocation && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="p-5 bg-amber-50 rounded-2xl border-2 border-amber-200 space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase">New Location / Region *</Label>
                                    <Input value={relocationLocation} onChange={e => setRelocationLocation(e.target.value)} placeholder="e.g. Tanga Municipal" className="h-11 rounded-xl bg-white font-bold" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase">Move Date *</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className="w-full h-11 rounded-xl bg-white text-sm font-bold">
                                                {format(eventDate, 'PPP')}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-30" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 border-none shadow-3xl">
                                            <Calendar mode="single" selected={eventDate} onSelect={(d) => d && setEventDate(d)} disabled={(d) => d > new Date()} />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </motion.div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="p-6 rounded-3xl bg-primary/5 border-2 border-dashed border-primary/20 text-center space-y-3">
                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                                <CheckCircle2 className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <h4 className="font-black text-lg tracking-tight">Verify Milestone S{activeTab}</h4>
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Verification for {logDialog.name}</p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase text-slate-400">Verification Date *</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full h-12 rounded-2xl font-bold bg-white shadow-sm">
                                        {format(eventDate, 'PPP')}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-40" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 border-none shadow-4xl">
                                    <Calendar mode="single" selected={eventDate} onSelect={(d) => d && setEventDate(d)} disabled={(d) => d > new Date()} />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                )}

                <div className="space-y-3 pt-4 border-t border-dashed">
                  <div className="flex items-center gap-2 text-slate-400">
                      <MessageSquare className="h-4 w-4 md:h-3.5 md:w-3.5" />
                      <Label className="text-[11px] font-black uppercase tracking-widest">Clinical Context / Qualitative Quotes</Label>
                  </div>
                  <Textarea 
                    value={notes} 
                    onChange={e => setNotes(e.target.value)} 
                    className="rounded-2xl text-sm p-4 min-h-[120px] border-none shadow-inner bg-slate-100" 
                    placeholder="Enter observations, specific reasons, or direct quotes from the participant..." 
                  />
                </div>
              </div>
            </ScrollArea>

            <DialogFooter className="p-6 md:p-8 bg-white border-t flex flex-row items-center gap-4">
              <button onClick={() => setLogDialog(null)} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors px-4">Cancel</button>
              <Button 
                onClick={handleCommitLog} 
                disabled={isLogging || (activeTab === '2' && !primaryOutcome && !specialCirc)} 
                className={cn(
                    "flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl transition-all active:scale-95 gap-3",
                    isLogging ? "bg-slate-200 text-slate-400" : "bg-primary hover:bg-primary/90 shadow-primary/20 text-white"
                )}
              >
                {isLogging ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />} 
                Commit Study Outcome
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
