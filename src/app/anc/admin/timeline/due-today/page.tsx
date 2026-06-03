
"use client";

import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, updateDoc, Timestamp, addDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Activity, 
  CheckCircle2, 
  AlertCircle, 
  Timer,
  Clock,
  Phone,
  ChevronRight,
  Hospital,
  Smartphone,
  PhoneCall,
  Calendar as CalendarIcon,
  Loader2,
  X,
  Check,
  MessageSquare
} from 'lucide-react';
import { type AncRegistration } from '@/types';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { resolveParticipantStatuses } from '@/lib/timeline/formulas';
import { useMemo, useEffect, useState } from 'react';
import { IdBadge } from '@/app/anc/components/id-badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';

const RA_STYLES: Record<string, { bg: string; text: string; ring: string }> = {
  'Riki Mahamba': { bg: "bg-emerald-500/10", text: "text-emerald-700", ring: "ring-emerald-500/20" },
  'Lucy': { bg: "bg-cyan-500/10", text: "text-cyan-700", ring: "ring-cyan-500/20" },
  'Katie': { bg: "bg-pink-500/10", text: "text-pink-700", ring: "ring-pink-500/20" },
  'Majid': { bg: "bg-amber-500/10", text: "text-amber-700", ring: "ring-amber-500/20" },
};

export default function ActionList() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [logDialog, setLogDialog] = useState<any>(null);
  const [isLogging, setIsLogging] = useState(false);
  const [eventDate, setEventDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  const registrationsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'anc_registrations');
  }, [firestore]);

  const { data: registrations, isLoading } = useCollection<AncRegistration>(registrationsQuery);

  const prioritizedList = useMemo(() => {
    if (!registrations) return { overdue: [], dueNow: [] };
    const resolved = registrations.map(p => resolveParticipantStatuses(p)).filter(p => p && p.isValid);
    const overdue = resolved.filter(p => p?.overall_status === 'overdue');
    const dueNow = resolved.filter(p => p?.overall_status === 'action_needed');
    return { overdue, dueNow };
  }, [registrations]);

  const handleLogMilestone = async () => {
    if (!firestore || !logDialog) return;
    setIsLogging(true);
    try {
        const p = logDialog.p;
        const surveyNum = logDialog.surveyNum;
        
        const updates: any = {
            [`survey${surveyNum}_completed`]: true,
            [`survey${surveyNum}_completed_at`]: Timestamp.fromDate(eventDate),
            updatedAt: serverTimestamp()
        };

        await updateDoc(doc(firestore, 'anc_registrations', p.id), updates);
        
        await addDoc(collection(firestore, `anc_registrations/${p.id}/timeline_events`), {
            event_type: 'survey_completed',
            survey_number: surveyNum,
            event_date: Timestamp.fromDate(eventDate),
            logged_by: localStorage.getItem('ancUser') ? JSON.parse(localStorage.getItem('ancUser')!).name : 'RA',
            notes: notes,
            created_at: serverTimestamp()
        });

        toast({ title: `Survey ${surveyNum} Logged`, variant: 'success' });
        setLogDialog(null);
        setNotes('');
        setEventDate(new Date());
    } catch (err: any) {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
        setIsLogging(false);
    }
  };

  if (!mounted || isLoading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Activity className="h-10 w-10 animate-spin text-primary" />
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60">Organizing Intel...</p>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-24 lg:pb-12 pt-4 px-4 md:px-0">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
            <Button variant="secondary" size="icon" asChild className="rounded-xl h-10 w-10 bg-white shadow-sm border-none hover:scale-105 transition-all">
                <Link href="/anc/activities"><ArrowLeft className="h-5 w-5" /></Link>
            </Button>
            <div className="space-y-1">
                <div className="flex items-center gap-2 text-primary font-black uppercase text-[8px] tracking-[0.3em]">
                    <Timer className="h-3.5 w-3.5" /> Study Outreach
                </div>
                <h1 className="text-3xl font-black tracking-tighter">Due Today</h1>
            </div>
        </div>
        <Button asChild className="h-11 px-8 rounded-xl font-black uppercase text-[10px] tracking-widest bg-gradient-to-r from-cyan-600 to-emerald-600 text-white shadow-xl shadow-cyan-500/20 gap-3 hover:scale-105 active:scale-95 transition-all">
            <Link href="/anc/call-plan">
                <Phone className="h-4 w-4" /> Call Plan Module <ChevronRight className="h-4 w-4" />
            </Link>
        </Button>
      </div>

      <div className="space-y-10">
        {prioritizedList.overdue.length > 0 && (
            <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-rose-600" />
                        <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-rose-600">Immediate Recovery</h2>
                    </div>
                    <Badge className="bg-rose-600 text-white border-none h-6 px-3 rounded-lg text-[10px] font-black shadow-lg shadow-rose-600/30">{prioritizedList.overdue.length}</Badge>
                </div>
                <div className="grid gap-3">
                    {prioritizedList.overdue.map((p: any) => p && (
                        <ActionCard key={p.id} participant={p} urgency="critical" onLog={(surveyNum) => setLogDialog({ p, surveyNum })} />
                    ))}
                </div>
            </div>
        )}

        <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-emerald-600" />
                    <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-emerald-600">Active Windows</h2>
                </div>
                <Badge className="bg-emerald-600 text-white border-none h-6 px-3 rounded-lg text-[10px] font-black shadow-lg shadow-emerald-600/30">{prioritizedList.dueNow.length}</Badge>
            </div>
            {prioritizedList.dueNow.length === 0 && prioritizedList.overdue.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 gap-6 grayscale opacity-60">
                    <CheckCircle2 className="h-14 w-14 text-emerald-500" />
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-center max-w-[200px] leading-relaxed">No pending clinical actions detected at this time</p>
                </div>
            ) : (
                <div className="grid gap-3">
                    {prioritizedList.dueNow.map((p: any) => p && (
                        <ActionCard key={p.id} participant={p} urgency="high" onLog={(surveyNum) => setLogDialog({ p, surveyNum })} />
                    ))}
                </div>
            )}
        </div>
      </div>

      {logDialog && (
        <Dialog open={!!logDialog} onOpenChange={() => setLogDialog(null)}>
            <DialogContent className="sm:max-w-lg rounded-2xl md:rounded-[2.5rem] border-none shadow-3xl p-0 overflow-hidden bg-[#f9fafb]">
                <div className="absolute top-4 right-4 z-50">
                    <DialogClose className="h-10 w-10 md:h-8 md:w-8 rounded-full bg-white shadow-sm border flex items-center justify-center opacity-60 hover:opacity-100">
                        <X className="h-5 w-5 md:h-4 md:w-4" />
                    </DialogClose>
                </div>
                <DialogHeader className="p-6 md:p-8 pt-8 md:pt-10 border-b bg-white">
                    <div className="flex items-center gap-4">
                        <div className="h-14 w-14 md:h-12 md:w-12 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-100 shrink-0">
                            <CheckCircle2 className="h-7 w-7 md:h-6 md:w-6 text-emerald-600" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl md:text-lg font-black tracking-tight text-slate-900">Log Survey {logDialog.surveyNum}</DialogTitle>
                            <DialogDescription className="text-[10px] md:text-[8px] font-black uppercase tracking-widest text-emerald-600 mt-2">
                                Participant: {logDialog.p.name}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>
                <div className="p-6 md:p-8 space-y-6">
                    <div className="space-y-3">
                        <Label className="text-[10px] md:text-[9px] font-black uppercase text-slate-400">Activity Date *</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full h-12 rounded-xl font-bold bg-white">
                                    {format(eventDate, 'PPP')}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 border-none shadow-3xl">
                                <Calendar mode="single" selected={eventDate} onSelect={(d) => d && setEventDate(d)} disabled={(d) => d > new Date()} />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-slate-400">
                            <MessageSquare className="h-4 w-4" />
                            <Label className="text-[10px] md:text-[9px] font-black uppercase">Field Notes</Label>
                        </div>
                        <Textarea 
                            value={notes} 
                            onChange={e => setNotes(e.target.value)} 
                            className="rounded-2xl text-sm min-h-[120px] border-none shadow-inner bg-[#eef1f4]"
                            placeholder="Add clinical context or verification notes..." 
                        />
                    </div>
                </div>
                <DialogFooter className="p-6 md:p-8 bg-white border-t flex flex-row items-center gap-4">
                    <button onClick={() => setLogDialog(null)} className="text-[10px] md:text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 px-4">Cancel</button>
                    <Button 
                        onClick={handleLogMilestone} 
                        disabled={isLogging} 
                        className="flex-1 h-14 md:h-12 rounded-2xl font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-500/20 text-white"
                    >
                        {isLogging ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5 mr-2" />} 
                        Confirm Milestone
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function ActionCard({ participant: p, urgency, onLog }: { participant: any, urgency: 'critical' | 'high', onLog: (surveyNum: number) => void }) {
    const raConfig = RA_STYLES[p.registeredBy] || { bg: "bg-slate-500/10", text: "text-slate-700", ring: "ring-slate-500/20" };
    
    // Determine which survey is due/overdue
    const activeSurveyNum = p.survey2_status === 'overdue' || p.survey2_status === 'due_now' ? 2 :
                          p.survey3_status === 'overdue' || p.survey3_status === 'due_now' ? 3 :
                          p.survey4_status === 'overdue' || p.survey4_status === 'due_now' ? 4 : 0;

    return (
        <Card className={cn(
            "border-none ring-1 shadow-sm rounded-xl overflow-hidden transition-all duration-300 hover:ring-primary/40",
            urgency === 'critical' ? "ring-rose-200 bg-rose-50/40 border-l-8 border-l-rose-600" : "ring-emerald-200 bg-emerald-50/40 border-l-8 border-l-emerald-600"
        )}>
            <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div className="flex-1 space-y-2.5">
                    <div className="flex items-center gap-3">
                        <h3 className="text-base font-black tracking-tight leading-none">{p.name}</h3>
                        <IdBadge id={p.participantId} className="scale-90 origin-left" hideLabel />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge className="bg-primary/10 text-primary text-[8px] font-black px-2 py-0.5 h-5 border-none shadow-none uppercase tracking-widest">
                            {p.current_ga.weeks}+{p.current_ga.days}w
                        </Badge>
                        <Badge className="bg-blue-500/10 text-blue-700 text-[8px] font-black px-2 py-0.5 h-5 border-none shadow-none uppercase tracking-widest flex items-center gap-1.5">
                            <Hospital className="h-2.5 w-2.5" /> {p.healthFacility.split(' (')[0]}
                        </Badge>
                        <Badge className={cn("text-[8px] font-black px-2 py-0.5 h-5 border-none shadow-none uppercase tracking-widest ring-1", raConfig.bg, raConfig.text, raConfig.ring)}>
                            RA: {p.registeredBy || 'Unknown'}
                        </Badge>
                    </div>
                </div>
                <div className="flex items-center justify-between md:justify-end gap-3 pt-4 md:pt-0 border-t md:border-t-0 border-dashed border-slate-200">
                    <div className="flex gap-1.5 mr-2">
                        {[1, 2, 3, 4].map(s => {
                            const isDone = s === 1 || p[`survey${s}_completed`];
                            const isAttempted = p[`survey${s}_call_attempted`];
                            const isUnfinishedBusiness = !isDone && isAttempted;
                            return (
                                <div key={s} className={cn(
                                    "h-7 px-2 min-w-[32px] rounded-lg flex flex-col items-center justify-center text-[8px] font-black transition-all border shadow-sm",
                                    isDone ? "bg-primary border-primary text-white" : 
                                    isUnfinishedBusiness ? "bg-amber-100 text-amber-700 border-amber-400 animate-pulse" :
                                    "bg-white text-slate-300 border-slate-100 opacity-40"
                                )}>
                                  {isUnfinishedBusiness ? "INC" : `S${s}`}
                                </div>
                            );
                        })}
                    </div>
                    
                    <div className="flex gap-2">
                        <Button size="sm" variant="secondary" className="h-9 px-4 rounded-xl font-black uppercase text-[10px] tracking-widest bg-white shadow-sm border border-slate-100 active:scale-95 transition-all" asChild>
                            <Link href={`/anc/call-plan`}>Go to Call Plan</Link>
                        </Button>
                        <Button size="sm" variant="secondary" className="h-9 px-4 rounded-xl font-black uppercase text-[10px] tracking-widest bg-white shadow-sm border border-slate-100 active:scale-95 transition-all" asChild>
                            <Link href={`/anc/participants/${p.id}`}>Profile</Link>
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
