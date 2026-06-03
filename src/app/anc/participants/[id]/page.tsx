
"use client";

import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, orderBy, deleteDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft, 
  Phone, 
  ShieldCheck, 
  CheckCircle2,
  User,
  Hospital,
  Timer,
  Loader2,
  History,
  Activity,
  MessageSquare,
  UserCheck,
  Smartphone,
  Clock,
  X,
  Heart,
  Pencil,
  Trash2,
  Target
} from 'lucide-react';
import { type AncRegistration, type TimelineEvent } from '@/types';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { resolveParticipantStatuses, safeFormatDate, safeParseDate } from '@/lib/timeline/formulas';
import { useEffect, useState, useMemo, use } from 'react';
import { IdBadge } from '@/app/anc/components/id-badge';
import { format } from 'date-fns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { AncRegistrationForm } from '../../components/registration-form';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";

const RA_STYLES: Record<string, { text: string; bg: string; ring: string }> = {
  'Riki Mahamba': { text: "text-emerald-600", bg: "bg-emerald-50", ring: "ring-emerald-200" },
  'Lucy': { text: "text-cyan-600", bg: "bg-cyan-50", ring: "ring-cyan-200" },
  'Katie': { text: "text-pink-600", bg: "bg-pink-50", ring: "ring-pink-200" },
  'Majid': { text: "text-amber-600", bg: "bg-amber-50", ring: "ring-amber-200" },
};

export default function ParticipantTimelineDetail({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [mounted, setMounted] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const docRef = useMemoFirebase(() => {
        if (!firestore || !id) return null;
        return doc(firestore, 'anc_registrations', decodeURIComponent(id));
    }, [firestore, id]);

    const { data: activeP, isLoading } = useDoc<AncRegistration>(docRef);

    const eventsQuery = useMemoFirebase(() => {
        if (!firestore || !id) return null;
        return query(collection(firestore, 'anc_registrations', decodeURIComponent(id), 'timeline_events'), orderBy('event_date', 'desc'));
    }, [firestore, id]);

    const { data: rawEvents } = useCollection<TimelineEvent>(eventsQuery);
    const [userRole, setUserRole] = useState<string | null>(null);
  
    useEffect(() => {
        const u = typeof window !== 'undefined' ? localStorage.getItem('ancUser') : null;
        if (u) try { setUserRole(JSON.parse(u).role); } catch {}
    }, []);
    
    const isAdmin = userRole === 'admin';

    const resolvedP = useMemo(() => activeP ? (resolveParticipantStatuses(activeP) ?? null) : null, [activeP]);

    const deleteMutation = useMutation({
        mutationFn: async () => {
            if (!firestore || !id) throw new Error("Service unavailable");
            const participantDoc = doc(firestore, 'anc_registrations', decodeURIComponent(id));
            await deleteDoc(participantDoc);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['anc_registrations'] });
            toast({ title: "Dossier Purged", description: "Participant record has been removed from the registry.", variant: "success" });
            router.push('/anc/participants');
        },
        onError: (err: any) => {
            toast({ title: "Purge Failed", description: err.message, variant: "destructive" });
        }
    });

    if (!mounted || isLoading || !activeP || !resolvedP) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }

    const progress_ = Math.min(100, (resolvedP.current_ga.weeks / 40) * 100);
    const raStyle = RA_STYLES[activeP.registeredBy || ''] || { text: "text-slate-600", bg: "bg-slate-50", ring: "ring-slate-200" };

    const rawSurveyItems = [
        { num: 1, label: 'Enrollment', done: true, date: activeP.createdAt, status: 'completed' },
        { num: 2, label: 'Outreach', done: !!activeP.survey2_completed, date: activeP.survey2_completed_at || resolvedP.survey2_target_date, status: resolvedP.survey2_status },
        { num: 3, label: 'Delivery', done: !!activeP.survey3_completed, date: activeP.survey3_completed_at || resolvedP.survey3_target_date, status: resolvedP.survey3_status },
        { num: 4, label: '6wk Follow', done: !!activeP.survey4_completed, date: activeP.survey4_completed_at || resolvedP.survey4_target_date, status: resolvedP.survey4_status },
    ];

    const focusIndex = rawSurveyItems.findIndex(s => !s.done);
    const surveyItems = rawSurveyItems.map((s, idx) => ({
        ...s,
        isFocus: idx === focusIndex
    }));

    const hasEvents = rawEvents && rawEvents.length > 0;

    return (
    <div className="max-w-5xl mx-auto space-y-3 pb-6 px-2 md:px-0">
      <div className="flex flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 md:gap-3">
            <Button variant="secondary" size="icon" asChild className="rounded-xl h-11 w-11 md:h-8 md:w-8 bg-white shadow-sm ring-1 ring-border/50">
                <Link href="/anc/participants"><ArrowLeft className="h-5 w-5 md:h-4 md:w-4" /></Link>
            </Button>
            <div className="space-y-0.5">
                <h1 className="text-xl md:text-lg font-black tracking-tighter leading-none">{activeP.name}</h1>
                <div className="flex items-center gap-2 mt-1.5 md:mt-0.5">
                    <IdBadge id={activeP.participantId} hideLabel className="scale-95 md:scale-75 origin-left" />
                    <Badge className={cn("rounded-md font-black px-2 py-0.5 uppercase text-[9px] md:text-[7px] tracking-widest border-none shadow-none ring-1", raStyle.bg, raStyle.text, raStyle.ring)}>
                        RA: {activeP.registeredBy}
                    </Badge>
                </div>
            </div>
        </div>
        
        <div className="flex items-center gap-2">
            {isAdmin && (
                <div className="flex items-center gap-1.5 mr-2">
                    <Button 
                        variant="secondary" 
                        size="icon" 
                        onClick={() => setIsEditing(true)}
                        className="h-11 w-11 md:h-8 md:w-8 rounded-xl hover:bg-primary/10 hover:text-primary transition-all border shadow-sm"
                    >
                        <Pencil className="h-5 w-5 md:h-4 md:w-4" />
                    </Button>
                    
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button 
                                variant="secondary" 
                                size="icon" 
                                className="h-11 w-11 md:h-8 md:w-8 rounded-xl hover:bg-rose-100 hover:text-rose-600 transition-all border shadow-sm"
                            >
                                <Trash2 className="h-5 w-5 md:h-4 md:w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl">
                            <AlertDialogHeader>
                                <AlertDialogTitle className="font-black text-xl tracking-tight uppercase">Purge Participant Record?</AlertDialogTitle>
                                <AlertDialogDescription className="text-sm font-medium">
                                    This will permanently remove <span className="font-bold text-foreground">{activeP.name}</span> from the ANC cohort dataset. This operation is non-reversible.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="gap-2">
                                <AlertDialogCancel className="h-11 md:h-9 rounded-xl font-black uppercase text-[10px] md:text-[8px] tracking-widest">Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                    onClick={() => deleteMutation.mutate()}
                                    className="h-11 md:h-9 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black uppercase text-[10px] md:text-[8px] tracking-widest border-none"
                                >
                                    Purge Dossier
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            )}
            <Badge className={cn("rounded-lg font-black px-4 py-2 md:py-1 uppercase text-[10px] md:text-[8px] tracking-widest border-none", resolvedP.overall_status === 'overdue' ? "bg-rose-600 text-white" : "bg-primary text-white shadow-lg shadow-primary/20")}>
                {resolvedP.overall_status}
            </Badge>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-12">
        <div className="lg:col-span-7 space-y-3 md:space-y-2">
          {/* Milestone Suite */}
          <Card className="border-none ring-1 ring-border/50 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="bg-primary/5 p-4 md:p-3 border-b">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-[10px] md:text-[8px] font-black tracking-widest uppercase text-primary/60 flex items-center gap-2">
                        <Timer className="h-4 w-4 md:h-3 md:w-3" /> Milestone Suite
                    </CardTitle>
                    <span className="text-primary font-black text-2xl md:text-base tabular-nums leading-none">{resolvedP.current_ga.weeks}+{resolvedP.current_ga.days} WKS</span>
                </div>
                <div className="space-y-2 md:space-y-1.5 mt-4 md:mt-3">
                    <div className="flex justify-between text-[9px] md:text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">
                        <span>GA Enroll: {activeP.gestationalAge}w</span>
                        <span>EDD: {safeFormatDate(resolvedP.edd, 'dd MMM')}</span>
                    </div>
                    <Progress value={progress_} className="h-2 rounded-full bg-primary/10" />
                </div>
            </CardHeader>
            <CardContent className="p-2 md:p-3 grid grid-cols-4 gap-1.5 md:gap-2">
                {surveyItems.map((s) => (
                    <div key={s.num} className={cn(
                        "p-2 md:p-2.5 rounded-xl border-2 flex flex-col justify-between min-h-[120px] md:min-h-[100px] transition-all duration-500 relative overflow-hidden",
                        s.done 
                          ? "bg-primary border-primary text-white shadow-md shadow-primary/20" 
                          : s.isFocus
                            ? "bg-primary/[0.08] border-primary/40 text-primary animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                            : "bg-primary/[0.02] border-primary/10 text-primary/30"
                    )}>
                        <div className="space-y-1">
                            <div className="flex justify-between items-start">
                                <p className={cn("text-[10px] md:text-[8px] font-black uppercase tracking-[0.2em]", s.done ? "text-white/80" : "text-primary/60")}>
                                    Survey {s.num}
                                </p>
                                {s.done && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                                {s.isFocus && <Badge className="bg-primary text-white text-[7px] font-black border-none h-4 px-1 absolute top-1 right-1">FOCUS</Badge>}
                            </div>
                            <h4 className={cn("text-[11px] md:text-[10px] font-black leading-tight tracking-tight uppercase", s.done ? "text-white" : "text-primary/80")}>
                                {s.label}
                            </h4>
                        </div>
                        <div className="space-y-0.5">
                            <p className={cn("text-[8px] md:text-[7px] font-bold uppercase tracking-widest leading-none", s.done ? "text-white/60" : "text-primary/40")}>
                                {s.done ? 'Recorded' : 'Target'}
                            </p>
                            <p className={cn("text-[12px] md:text-[10px] font-black tabular-nums leading-none", s.done ? "text-white" : "text-primary/70")}>
                                {s.date ? format(safeParseDate(s.date) || new Date(), 'dd MMM') : '--'}
                            </p>
                            {!s.done && s.status && (
                                <Badge variant="outline" className={cn(
                                    "text-[8px] md:text-[7px] px-1.5 h-5 border-none font-black uppercase w-fit mt-2", 
                                    s.status === 'overdue' ? "bg-rose-100 text-rose-700" : 
                                    s.status === 'due_now' ? "bg-amber-100 text-amber-700" : 
                                    "bg-blue-100 text-blue-700"
                                )}>
                                    {s.status}
                                </Badge>
                            )}
                        </div>
                    </div>
                ))}
            </CardContent>
          </Card>

          {/* Communication Suite */}
          <Card className="border-none ring-1 ring-border/50 shadow-sm rounded-xl overflow-hidden bg-white">
            <CardHeader className="bg-emerald-500/5 p-4 md:p-3 border-b border-emerald-500/10">
                <CardTitle className="text-[10px] md:text-[8px] font-black tracking-widest uppercase text-emerald-700 flex items-center gap-2">
                    <Phone className="h-4 w-4 md:h-3 md:w-3" /> Communication Suite
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="flex flex-row divide-x divide-emerald-500/10">
                    <div className="flex-1 p-3 md:p-4 bg-emerald-500/[0.01] min-w-0">
                        <p className="text-[9px] md:text-[8px] font-black uppercase text-emerald-600/40 mb-3 tracking-[0.2em] flex items-center gap-1.5">
                            <Smartphone className="h-3.5 w-3.5" /> Primary
                        </p>
                        <div className="flex flex-col gap-1">
                            <p className="text-sm md:text-base font-mono font-black tabular-nums text-slate-800 leading-none break-words">
                                {(Array.isArray(activeP.phoneNumber) ? activeP.phoneNumber.join(' / ') : activeP.phoneNumber)}
                            </p>
                            <span className="text-[8px] md:text-[7px] font-bold text-slate-400 uppercase tracking-widest leading-tight mt-1 text-center md:text-left">Clinical Access</span>
                        </div>
                    </div>
                    <div className="flex-1 p-3 md:p-4 bg-emerald-500/[0.03] min-w-0">
                        <p className="text-[9px] md:text-[8px] font-black uppercase text-emerald-600/40 mb-3 tracking-[0.2em] flex items-center gap-1.5">
                            <Heart className="h-3.5 w-3.5" /> Emergency
                        </p>
                        {activeP.nextOfKinName ? (
                            <div className="space-y-2">
                                <div className="flex flex-col gap-1">
                                    <p className="text-xs md:text-sm font-black truncate text-slate-800 leading-none">{activeP.nextOfKinName}</p>
                                    <p className="text-[8px] md:text-[9px] font-black text-emerald-600 uppercase tracking-widest">{activeP.nextOfKinRelation}</p>
                                </div>
                                <p className="text-sm md:text-base font-mono font-black text-slate-600 tabular-nums leading-none pt-1">
                                    {activeP.alternativeContact}
                                </p>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-slate-300 py-2">
                                <User className="h-4 w-4 opacity-40" />
                                <p className="text-[10px] italic font-bold">No record</p>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
          </Card>

          {/* Outreach Intel & Activity */}
          <Card className="border-none ring-1 ring-border/50 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="bg-slate-50 p-4 md:p-3 border-b">
                <CardTitle className="text-[10px] md:text-[8px] font-black tracking-widest uppercase text-slate-500 flex items-center gap-2">
                    <History className="h-4 w-4 md:h-3 md:w-3" /> Outreach Intel & Activity
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <ScrollArea className={cn(hasEvents ? "max-h-[500px] md:max-h-[400px]" : "h-auto")}>
                    <div className="p-4 md:p-3 space-y-6 md:space-y-3">
                        {!hasEvents ? (
                            <div className="py-14 text-center italic text-slate-300 text-sm md:text-[10px] font-bold">No activity logs recorded yet.</div>
                        ) : (
                            rawEvents.map((event, i) => (
                                <div key={i} className="flex gap-4 md:gap-3 relative pb-6 md:pb-3 last:pb-0">
                                    {i !== rawEvents.length - 1 && <div className="absolute left-[19px] md:left-[13px] top-10 md:top-7 bottom-0 w-px bg-slate-100" />}
                                    <div className={cn("h-10 w-10 md:h-7 md:w-7 rounded-full flex items-center justify-center shrink-0 z-10 border-2 border-white shadow-sm", event.event_type === 'phone_contact' ? "bg-emerald-500 text-white" : "bg-primary text-white")}>
                                        {event.event_type === 'phone_contact' ? <Phone className="h-4 w-4 md:h-3 md:w-3" /> : <UserCheck className="h-4 w-4 md:h-3 md:w-3" />}
                                    </div>
                                    <div className="flex-1 space-y-2 md:space-y-1 pt-1 md:pt-0.5">
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs md:text-[10px] font-black uppercase tracking-tight">{event.event_type === 'phone_contact' ? 'Outreach Activity' : event.event_type === 'survey_completed' ? `Survey ${event.survey_number} Conducted` : 'Study Event'}</p>
                                            <span className="text-[10px] md:text-[7px] font-black text-slate-400 uppercase">{event.event_date?.toDate ? format(event.event_date.toDate(), 'dd MMM yyyy') : '--'}</span>
                                        </div>
                                        <div className="bg-slate-50 p-4 md:p-2 rounded-lg border border-slate-100">
                                            <div className="flex flex-wrap gap-2 md:gap-1.5 mb-2.5 md:mb-1.5">
                                                {event.outcome && <Badge className="bg-white text-emerald-700 ring-1 ring-emerald-200 border-none font-black text-[10px] md:text-[7px] h-5 md:h-3.5 px-2 md:px-1 rounded-sm uppercase tracking-widest">{event.outcome.replace('_', ' ')}</Badge>}
                                                {(event as any).event_outcome_date && <Badge className="bg-amber-100 text-amber-700 border-none font-black text-[10px] md:text-[7px] h-5 md:h-3.5 px-2 md:px-1 rounded-sm uppercase tracking-widest">EVENT: {format(safeParseDate((event as any).event_outcome_date) || new Date(), 'dd MMM')}</Badge>}
                                            </div>
                                            {event.notes && <div className="flex gap-3 md:gap-2"><MessageSquare className="h-4 w-4 md:h-2.5 md:w-2.5 text-slate-300 shrink-0 mt-1 md:mt-0.5" /><p className="text-sm md:text-[10px] font-medium text-slate-500 italic leading-tight">"{event.notes}"</p></div>}
                                        </div>
                                        <p className="text-[10px] md:text-[7px] font-bold text-slate-400 uppercase tracking-widest pl-1">RA: {event.logged_by || 'System'}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-5 space-y-3 md:space-y-2">
            {/* Clinical Identity Header */}
            <Card className="border-none ring-1 ring-border/50 shadow-sm rounded-xl p-8 md:p-4 text-center space-y-6 md:space-y-4 bg-white">
                <div className="h-16 w-16 md:h-12 md:w-12 mx-auto rounded-xl bg-primary/10 flex items-center justify-center text-primary"><User className="h-8 w-8 md:h-6 md:w-6" /></div>
                <div className="space-y-1.5 md:space-y-0.5">
                    <h2 className="text-2xl md:text-base font-black tracking-tighter leading-none">{activeP.name}</h2>
                    <IdBadge id={activeP.participantId} hideLabel className="scale-110 md:scale-75 origin-center" />
                </div>
                <div className="pt-6 md:pt-3 border-t space-y-5 md:space-y-3 text-left">
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] md:text-[7px] font-black uppercase text-slate-400 tracking-[0.1em]">Biologicals</span>
                        <div className="flex gap-2 md:gap-1">
                            <Badge className="bg-slate-100 text-slate-700 border-none font-black text-[10px] md:text-[7px] h-6 md:h-4 px-2">{activeP.age}Y</Badge>
                            <Badge className="bg-slate-100 text-slate-700 border-none font-black text-[10px] md:text-[7px] h-6 md:h-4 px-2">{activeP.maritalStatus}</Badge>
                        </div>
                    </div>
                    <div className="space-y-2 md:space-y-1">
                        <span className="text-[10px] md:text-[7px] font-black uppercase text-slate-400 tracking-[0.1em]">Site Assignment</span>
                        <div className="flex items-start gap-3 md:gap-1.5 bg-primary/5 p-3 md:p-1.5 rounded-lg">
                            <Hospital className="h-5 w-5 md:h-3 md:w-3 text-primary shrink-0 mt-0.5" />
                            <p className="text-sm md:text-[8px] font-black text-primary uppercase leading-tight">{activeP.healthFacility}</p>
                        </div>
                    </div>
                </div>
            </Card>

            <div className="p-5 md:p-3 bg-slate-900 rounded-xl text-white space-y-3 md:space-y-2 shadow-lg">
                <div className="flex items-center gap-3 md:gap-1.5"><ShieldCheck className="h-5 w-5 md:h-3.5 md:w-3.5 text-emerald-400" /><p className="text-[11px] md:text-[8px] font-black uppercase tracking-widest">System Integrity</p></div>
                <p className="text-[10px] md:text-[7px] font-medium leading-relaxed uppercase tracking-widest opacity-80">Milestone updates are synchronized automatically from clinical modules. Direct logging is disabled in audit view.</p>
            </div>
            
            <div className="flex items-center justify-center p-12 md:p-8 opacity-20"><Activity className="h-8 w-8 md:h-6 md:w-6 text-primary animate-pulse" /></div>
        </div>
      </div>

      {/* Management Dialogs */}
      {isEditing && (
        <Dialog open={isEditing} onOpenChange={setIsEditing}>
            <DialogContent className="sm:max-w-xl rounded-[2.5rem] border-none shadow-2xl overflow-hidden p-0 bg-background">
                <DialogHeader className="p-6 bg-primary text-white border-b">
                    <DialogTitle className="text-xl font-black tracking-tight uppercase">Correct Dossier Entry</DialogTitle>
                    <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-primary-foreground/70">
                        Manual demographic or contact update for {activeP.name}
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[80vh] p-6">
                    <AncRegistrationForm 
                        editMode={true} 
                        initialData={activeP} 
                        onOpenChange={(open) => !open && setIsEditing(false)}
                    />
                </ScrollArea>
            </DialogContent>
        </Dialog>
      )}
    </div>
    );
}
