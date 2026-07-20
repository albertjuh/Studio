
"use client";

import { useFirestore, useDoc, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { doc, collection, query, orderBy, deleteDoc, addDoc, serverTimestamp, Timestamp, updateDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
  Target,
  AlertTriangle,
  FileText,
  PlusCircle,
  BrainCircuit,
  Filter,
  Check,
  ExternalLink,
  Tag,
  RotateCcw
} from 'lucide-react';
import { type AncRegistration, type TimelineEvent, type ParticipantNote } from '@/types';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { resolveParticipantStatuses, safeFormatDate, safeParseDate } from '@/lib/timeline/formulas';
import { useEffect, useState, useMemo, use } from 'react';
import { IdBadge } from '@/app/anc/components/id-badge';
import { format, formatDistanceToNow } from 'date-fns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { AncRegistrationForm } from '../../components/registration-form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
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
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";

const RA_STYLES: Record<string, { text: string; bg: string; ring: string }> = {
  'Riki Mahamba': { text: "text-emerald-600", bg: "bg-emerald-50", ring: "ring-emerald-200" },
  'Riki Mahamba (ID: riki_mahamba)': { text: "text-emerald-600", bg: "bg-emerald-50", ring: "ring-emerald-200" },
  'Lucy': { text: "text-cyan-600", bg: "bg-cyan-50", ring: "ring-cyan-200" },
  'Lucy (ID: lucy_25)': { text: "text-cyan-600", bg: "bg-cyan-50", ring: "ring-cyan-200" },
  'Katie': { text: "text-pink-600", bg: "bg-pink-50", ring: "ring-pink-200" },
  'Katie (ID: katie123)': { text: "text-pink-600", bg: "bg-pink-50", ring: "ring-pink-200" },
  'Majid': { text: "text-amber-600", bg: "bg-amber-50", ring: "ring-amber-200" },
  'Majid (ID: majid_24)': { text: "text-amber-600", bg: "bg-amber-50", ring: "ring-amber-200" },
};

const NOTE_CATEGORIES = [
    "Clinical Observation", "Behavioral Pattern", "Social Context", "Family Dynamics", 
    "Financial Concern", "Cultural Factor", "Logistical Issue", "Compliance Note", 
    "Adverse Event", "Positive Outcome", "Other"
];

const IMPORTANCE_LEVELS = [
    { id: 'low', label: 'Low', color: 'bg-slate-100 text-slate-600' },
    { id: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-700' },
    { id: 'high', label: 'High', color: 'bg-amber-100 text-amber-700' },
    { id: 'critical', label: 'Critical', color: 'bg-rose-100 text-rose-700' },
];

export default function ParticipantTimelineDetail(props: { 
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const params = use(props.params);
    const id = params.id;
    
    const firestore = useFirestore();
    const { user: fbUser } = useUser();
    const router = useRouter();
    const { toast } = useToast();
    
    const [mounted, setMounted] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
    const [user, setUser] = useState<any>(null);

    // Note Form State
    const [noteForm, setNoteForm] = useState({
        title: '', content: '', category: 'Clinical Observation' as any, 
        importance: 'medium' as any, visibility: 'all_team' as any,
        tags: '', requiresFollowup: false
    });

    useEffect(() => {
        setMounted(true);
        const u = typeof window !== 'undefined' ? localStorage.getItem('ancUser') : null;
        if (u) try { setUser(JSON.parse(u)); } catch {}
    }, []);

    const docRef = useMemoFirebase(() => {
        if (!firestore || !id) return null;
        let finalId = id;
        try { if (id.includes('%')) finalId = decodeURIComponent(id); } catch (e) { finalId = id; }
        return doc(firestore, 'anc_registrations', finalId);
    }, [firestore, id]);

    const { data: activeP, isLoading } = useDoc<AncRegistration>(docRef);

    const eventsQuery = useMemoFirebase(() => {
        if (!firestore || !id) return null;
        let finalId = id;
        try { if (id.includes('%')) finalId = decodeURIComponent(id); } catch (e) { finalId = id; }
        return query(collection(firestore, 'anc_registrations', finalId, 'timeline_events'), orderBy('event_date', 'desc'));
    }, [firestore, id]);

    const notesQuery = useMemoFirebase(() => {
        if (!firestore || !id) return null;
        let finalId = id;
        try { if (id.includes('%')) finalId = decodeURIComponent(id); } catch (e) { finalId = id; }
        return query(collection(firestore, 'participant_notes'), orderBy('created_at', 'desc'));
    }, [firestore, id]);

    const { data: rawEvents } = useCollection<TimelineEvent>(eventsQuery);
    const { data: participantNotes, isLoading: isNotesLoading } = useCollection<ParticipantNote>(notesQuery);

    const filteredNotes = useMemo(() => {
        if (!participantNotes) return [];
        return participantNotes.filter(n => n.participant_id === id);
    }, [participantNotes, id]);

    const resolvedP = useMemo(() => activeP ? resolveParticipantStatuses(activeP) : null, [activeP]);
    const isAdmin = user?.role === 'admin';

    const handleSaveNote = async () => {
        if (!firestore || !fbUser || !user || !activeP) return;
        try {
            const tagsArray = noteForm.tags.split(',').map(t => t.trim()).filter(Boolean);
            const noteData = {
                participant_id: id,
                participant_name: activeP.name,
                participant_facility: activeP.healthFacility,
                author_id: fbUser.uid,
                author_name: user.name,
                author_role: user.role,
                category: noteForm.category,
                title: noteForm.title,
                content: noteForm.content,
                tags: tagsArray,
                importance: noteForm.importance,
                visibility: noteForm.visibility,
                requires_followup: noteForm.requiresFollowup,
                followup_date: noteForm.requiresFollowup ? Timestamp.fromDate(new Date()) : null,
                created_at: serverTimestamp(),
                updated_at: serverTimestamp(),
                edited: false
            };

            await addDoc(collection(firestore, 'participant_notes'), noteData);

            if (noteForm.importance === 'critical' || noteForm.category === 'Adverse Event') {
                await addDoc(collection(firestore, 'notifications'), {
                    title: `${noteForm.importance.toUpperCase()} NOTE: ${activeP.name}`,
                    body: `${user.name} logged a ${noteForm.category}: "${noteForm.title}"`,
                    criticality: noteForm.importance.toUpperCase(),
                    recipients: 'ADMINS_ONLY',
                    participant_id: id,
                    created_at: serverTimestamp(),
                    delivered_to: [],
                    read_by: [],
                    ai_generated: false
                });
            }

            toast({ title: "Note Recorded", variant: "success" });
            setIsAddNoteOpen(false);
            setNoteForm({ title: '', content: '', category: 'Clinical Observation', importance: 'medium', visibility: 'all_team', tags: '', requiresFollowup: false });
        } catch (err: any) {
            toast({ title: "Save Failed", description: err.message, variant: "destructive" });
        }
    };

    const handleRevertMilestone = async (surveyNum: number) => {
        if (!firestore || !isAdmin || !activeP) return;
        try {
            const updates: any = {
                [`survey${surveyNum}_completed`]: false,
                [`survey${surveyNum}_completed_at`]: null,
                updatedAt: serverTimestamp()
            };

            if (surveyNum === 2) {
                updates.survey2_call_attempted = false;
                updates.survey2_call_attempted_at = null;
            }

            await updateDoc(doc(firestore, 'anc_registrations', id), updates);
            
            await addDoc(collection(firestore, `anc_registrations/${id}/timeline_events`), {
                event_type: 'protocol_deviation',
                event_date: serverTimestamp(),
                outcome: `Milestone S${surveyNum} was reverted by Administrator ${user.name} via Profile Suite.`,
                logged_by: user.name,
                created_at: serverTimestamp()
            });

            toast({ title: `Milestone S${surveyNum} Reverted`, variant: "success" });
        } catch (err: any) {
            toast({ title: "Reversion Failed", description: err.message, variant: "destructive" });
        }
    };

    const handleRevertStudyStatus = async () => {
        if (!firestore || !isAdmin || !activeP) return;
        try {
            await updateDoc(doc(firestore, 'anc_registrations', id), {
                study_status: 'active',
                delivery_status: 'pregnant',
                withdrawal_reason: null,
                withdrawal_date: null,
                withdrawal_notes: null,
                relocation_date: null,
                relocation_location: null,
                updatedAt: serverTimestamp()
            });
            
            await addDoc(collection(firestore, `anc_registrations/${id}/timeline_events`), {
                event_type: 'protocol_deviation',
                event_date: serverTimestamp(),
                outcome: `Study Status was reverted to ACTIVE by Administrator ${user.name}. Previous state: ${activeP.study_status?.toUpperCase() || 'UNKNOWN'}.`,
                logged_by: user.name,
                created_at: serverTimestamp()
            });

            toast({ title: "Status Reverted to Active", variant: "success" });
        } catch (err: any) {
            toast({ title: "Reversion Failed", description: err.message, variant: "destructive" });
        }
    };

    if (!mounted || isLoading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
    if (!activeP) return <div className="flex flex-col items-center justify-center py-20 gap-4"><AlertTriangle className="h-12 w-12 text-amber-500" /><h2 className="text-xl font-black">Record Not Found</h2><Button asChild variant="outline"><Link href="/anc/participants">Back to Registry</Link></Button></div>;

    const progress_ = resolvedP ? Math.min(100, (resolvedP.current_ga.weeks / 40) * 100) : 0;
    const raStyle = RA_STYLES[activeP.registeredBy || ''] || { text: "text-slate-600", bg: "bg-slate-50", ring: "ring-slate-200" };

    const surveyItems = resolvedP ? [
        { num: 1, label: 'Enrollment', done: true, date: activeP.createdAt, status: 'completed' },
        { num: 2, label: 'Outreach', done: !!activeP.survey2_completed, date: activeP.survey2_completed_at || resolvedP.survey2_target_date, status: resolvedP.survey2_status },
        { num: 3, label: 'Delivery', done: !!activeP.survey3_completed, date: activeP.survey3_completed_at || resolvedP.survey3_target_date, status: resolvedP.survey3_status },
        { num: 4, label: '6wk Follow', done: !!activeP.survey4_completed, date: activeP.survey4_completed_at || resolvedP.survey4_target_date, status: resolvedP.survey4_status },
    ] : [];

    return (
    <div className="max-w-5xl mx-auto space-y-4 pb-12 px-4 md:px-0 pt-2">
      <div className="flex flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
            <Button variant="secondary" size="icon" asChild className="rounded-xl h-9 w-9 bg-white shadow-sm ring-1 ring-border/50">
                <Link href="/anc/participants"><ArrowLeft className="h-5 w-5" /></Link>
            </Button>
            <div className="space-y-0.5">
                <h1 className="text-xl font-black tracking-tighter leading-none">{activeP.name}</h1>
                <div className="flex items-center gap-2 mt-1.5 md:mt-0.5">
                    <IdBadge id={activeP.participantId} hideLabel className="scale-75 origin-left" />
                    <Badge className={cn("rounded-md font-black px-2 py-0.5 uppercase text-[7px] tracking-widest border-none shadow-none ring-1", raStyle.bg, raStyle.text, raStyle.ring)}>
                        RA: {activeP.registeredBy}
                    </Badge>
                </div>
            </div>
        </div>
        
        <div className="flex items-center gap-2">
            {isAdmin && (
                <div className="flex items-center gap-1.5 mr-2">
                    <Button variant="secondary" size="icon" onClick={() => setIsEditing(true)} className="h-9 w-9 rounded-xl hover:bg-primary/10 transition-all border shadow-sm">
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="secondary" size="icon" className="h-9 w-9 rounded-xl hover:bg-rose-100 transition-all border shadow-sm"><Trash2 className="h-4 w-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-[2rem]">
                            <AlertDialogHeader>
                                <AlertDialogTitle className="font-black text-xl uppercase">Purge Participant Record?</AlertDialogTitle>
                                <AlertDialogDescription className="text-sm font-medium">Permanent removal of <span className="font-bold text-foreground">{activeP.name}</span> from study dataset.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="gap-2">
                                <AlertDialogCancel className="h-11 rounded-xl font-black uppercase text-[10px] tracking-widest">Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={async () => { await deleteDoc(doc(firestore!, 'anc_registrations', id)); router.push('/anc/participants'); }} className="h-11 md:h-9 bg-rose-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest border-none">Purge Dossier</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            )}
            <div className="flex items-center gap-2">
                <Badge className={cn("rounded-lg font-black px-4 py-2 md:py-1 uppercase text-[10px] md:text-[8px] tracking-widest border-none", 
                    activeP.study_status === 'withdrawn' ? "bg-slate-700 text-white" :
                    activeP.study_status === 'out_of_area' ? "bg-amber-600 text-white" :
                    activeP.study_status === 'pregnancy_loss' ? "bg-rose-600 text-white" :
                    activeP.study_status === 'lost_to_followup' ? "bg-rose-500 text-white" :
                    "bg-primary text-white shadow-lg shadow-primary/20"
                )}>
                    {activeP.study_status?.toUpperCase() || resolvedP?.overall_status?.toUpperCase() || 'ACTIVE'}
                </Badge>
                {isAdmin && activeP.study_status && activeP.study_status !== 'active' && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="secondary" size="icon" className="h-8 w-8 rounded-lg hover:bg-amber-100 hover:text-amber-700 transition-all border shadow-sm">
                                <RotateCcw className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-[2rem]">
                            <AlertDialogHeader>
                                <AlertDialogTitle className="font-black text-xl uppercase">Revert Study Status?</AlertDialogTitle>
                                <AlertDialogDescription className="text-sm font-medium">
                                    This will reset the status for <span className="font-bold text-foreground">{activeP.name}</span> back to <span className="font-bold text-emerald-600">ACTIVE</span>. 
                                    Historical survey milestones will be preserved, and the participant will return to the outreach queue.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="gap-2">
                                <AlertDialogCancel className="h-11 rounded-xl font-black text-[10px] tracking-widest">Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleRevertStudyStatus} className="h-11 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-[10px] tracking-widest border-none">Confirm Reversion</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7 space-y-4">
          <Card className="border-none ring-1 ring-border/50 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="bg-primary/5 p-5 md:p-3 border-b">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-[10px] md:text-[8px] font-black tracking-widest uppercase text-primary/60 flex items-center gap-2">
                        <Timer className="h-4 w-4 md:h-3 md:w-3" /> Milestone Suite
                    </CardTitle>
                    <span className="text-primary font-black text-2xl md:text-base tabular-nums leading-none">
                        {resolvedP ? `${resolvedP.current_ga.weeks}+${resolvedP.current_ga.days} WKS` : '--'}
                    </span>
                </div>
                <div className="space-y-2 mt-4 md:mt-3">
                    <div className="flex justify-between text-[10px] md:text-[8px] font-black uppercase tracking-widest text-slate-400">
                        <span>GA Enroll: {activeP.gestationalAge}w</span>
                        <span>EDD: {resolvedP ? safeFormatDate(resolvedP.edd, 'dd MMM') : '--'}</span>
                    </div>
                    <Progress value={progress_} className="h-2 rounded-full bg-primary/10" />
                </div>
            </CardHeader>
            <CardContent className="p-3 grid grid-cols-4 gap-2">
                {surveyItems.map((s, idx) => (
                    <div key={s.num} className={cn(
                        "p-2 rounded-xl border-2 flex flex-col justify-between min-h-[130px] md:min-h-[100px] transition-all relative overflow-hidden group/milestone",
                        s.done 
                          ? "bg-primary border-primary text-white shadow-md shadow-primary/20" 
                          : s.status === 'discontinued'
                            ? "bg-slate-50 border-slate-100 text-slate-300 grayscale"
                            : resolvedP?.overall_status === 'action_needed' && s.num === 2 ? "bg-primary/[0.08] border-primary/40 text-primary animate-pulse"
                            : "bg-primary/[0.02] border-primary/10 text-primary/30"
                    )}>
                        <div className="space-y-1">
                            <div className="flex justify-between items-start">
                                <p className={cn("text-[9px] font-black uppercase tracking-widest", s.done ? "text-white/80" : "text-primary/60")}>S{s.num}</p>
                                {s.done && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                            </div>
                            <h4 className={cn("text-[10px] font-black leading-tight uppercase", s.done ? "text-white" : "text-primary/80")}>{s.label}</h4>
                        </div>
                        <div className="space-y-0.5 relative">
                            <p className={cn("text-[11px] font-black tabular-nums leading-none", s.done ? "text-white" : "text-primary/70")}>
                                {s.date ? format(safeParseDate(s.date) || new Date(), 'dd MMM') : '--'}
                            </p>
                            {!s.done && s.status && (
                                <Badge variant="outline" className={cn("text-[7px] px-1 h-4 border-none font-black uppercase mt-1.5", 
                                    s.status === 'overdue' ? "bg-rose-100 text-rose-700" : 
                                    s.status === 'due_now' ? "bg-amber-100 text-amber-700" : 
                                    s.status === 'discontinued' ? "bg-slate-200 text-slate-400" : "bg-blue-100 text-blue-700"
                                )}>
                                    {s.status}
                                </Badge>
                            )}
                            
                            {/* ADMIN ROLLBACK TRIGGER */}
                            {isAdmin && s.done && s.num > 1 && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <button className="absolute -right-1 -bottom-1 p-1 rounded-md bg-white/20 hover:bg-white/40 text-white opacity-0 group-hover/milestone:opacity-100 transition-all">
                                            <RotateCcw className="h-3 w-3" />
                                        </button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="rounded-[2rem]">
                                        <AlertDialogHeader>
                                            <AlertDialogTitle className="font-black text-xl">Revert S{s.num} Milestone?</AlertDialogTitle>
                                            <AlertDialogDescription className="text-sm font-medium">This will clear the completion record and return the participant to active monitoring. This is an administrative protocol correction.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter className="gap-2">
                                            <AlertDialogCancel className="h-11 rounded-xl font-black text-[10px]">Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleRevertMilestone(s.num)} className="h-11 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-[10px]">Confirm Rollback</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}
                        </div>
                    </div>
                ))}
            </CardContent>
          </Card>

          <Tabs defaultValue="timeline" className="w-full">
            <TabsList className="bg-slate-100 p-1 rounded-xl w-full grid grid-cols-2">
                <TabsTrigger value="timeline" className="rounded-lg font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary shadow-none">
                    <History className="h-3.5 w-3.5 mr-2" /> Activity
                </TabsTrigger>
                <TabsTrigger value="notes" className="rounded-lg font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary shadow-none">
                    <FileText className="h-3.5 w-3.5 mr-2" /> Study Notes
                </TabsTrigger>
            </TabsList>
            
            <TabsContent value="timeline" className="mt-4 space-y-4">
                <Card className="border-none ring-1 ring-border/50 shadow-sm rounded-xl overflow-hidden bg-white">
                    <CardContent className="p-0">
                        <ScrollArea className="max-h-[500px]">
                            <div className="p-4 space-y-6">
                                {!rawEvents || rawEvents.length === 0 ? (
                                    <div className="py-20 text-center italic text-slate-300 text-xs font-bold uppercase tracking-widest">No activity logs recorded yet.</div>
                                ) : (
                                    rawEvents.map((event, i) => (
                                        <div key={i} className="flex gap-4 relative pb-6 last:pb-0">
                                            {i !== rawEvents.length - 1 && <div className="absolute left-[19px] top-10 bottom-0 w-px bg-slate-100" />}
                                            <div className={cn("h-10 w-10 rounded-full flex items-center justify-center shrink-0 z-10 border-2 border-white shadow-sm", event.event_type === 'phone_contact' ? "bg-emerald-500 text-white" : "bg-primary text-white")}>
                                                {event.event_type === 'phone_contact' ? <Phone className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                                            </div>
                                            <div className="flex-1 space-y-2 pt-1">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-xs font-black uppercase tracking-tight">{event.event_type.replace(/_/g, ' ')}</p>
                                                    <span className="text-[10px] font-black text-slate-400 uppercase">{event.event_date?.toDate ? format(event.event_date.toDate(), 'dd MMM yyyy') : '--'}</span>
                                                </div>
                                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                                    {event.outcome && <Badge className="bg-white text-emerald-700 ring-1 ring-emerald-100 border-none font-black text-[9px] h-5 px-2 rounded-sm uppercase mb-2 block w-fit">{event.outcome}</Badge>}
                                                    {event.notes && <p className="text-[11px] font-medium text-slate-500 italic leading-tight">"{event.notes}"</p>}
                                                </div>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">RA: {event.logged_by || 'System'}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="notes" className="mt-4 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Qualitative Insights ({filteredNotes.length})</h3>
                    <Button onClick={() => setIsAddNoteOpen(true)} size="sm" className="h-9 px-4 rounded-xl font-black uppercase text-[10px] tracking-widest bg-violet-600 shadow-lg shadow-violet-500/20">
                        <PlusCircle className="h-4 w-4 mr-2" /> Add Study Note
                    </Button>
                </div>
                
                <div className="space-y-3">
                    {isNotesLoading ? <Loader2 className="h-8 w-8 animate-spin mx-auto text-violet-500" /> : filteredNotes.length === 0 ? (
                        <div className="py-20 text-center border-2 border-dashed rounded-3xl bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-300">No study notes captured for this participant.</div>
                    ) : filteredNotes.map(note => (
                        <Card key={note.id} className="border-none ring-1 ring-border/60 shadow-sm rounded-2xl overflow-hidden bg-white hover:ring-violet-400/50 transition-all">
                            <CardContent className="p-5 space-y-4">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-violet-50 flex items-center justify-center text-violet-600 ring-1 ring-violet-200">
                                            <User className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 leading-none">{note.author_name}</p>
                                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">{note.author_role} • {formatDistanceToNow(safeParseDate(note.created_at) || new Date(), { addSuffix: true })}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1.5">
                                        <Badge className={cn("rounded-md border-none font-black text-[8px] uppercase px-2 h-5 shadow-none", 
                                            IMPORTANCE_LEVELS.find(l => l.id === note.importance)?.color || 'bg-slate-100 text-slate-600'
                                        )}>
                                            {note.importance}
                                        </Badge>
                                        <Badge variant="outline" className="rounded-md font-black text-[8px] uppercase px-2 h-5 tracking-widest border-violet-200 text-violet-700 bg-violet-50/50">{note.category}</Badge>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <h4 className="font-black text-sm text-slate-900 leading-tight">{note.title}</h4>
                                    <p className="text-xs font-medium text-slate-600 leading-relaxed bg-slate-50/50 p-3 rounded-xl border border-slate-100 italic">"{note.content}"</p>
                                </div>
                                {note.tags?.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 pt-2">
                                        {note.tags.map(tag => (
                                            <span key={tag} className="text-[8px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 px-2 py-0.5 rounded flex items-center gap-1">
                                                <Tag className="h-2 w-2" /> {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                {note.requires_followup && (
                                    <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-100">
                                        <AlertTriangle className="h-3.5 w-3.5" />
                                        <span className="text-[9px] font-black uppercase tracking-widest">Follow-up Action Flagged</span>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="lg:col-span-5 space-y-4">
            <Card className="border-none ring-1 ring-border/50 shadow-sm rounded-xl p-6 text-center space-y-6 bg-white">
                <div className="h-16 w-16 mx-auto rounded-xl bg-primary/10 flex items-center justify-center text-primary"><User className="h-8 w-8" /></div>
                <div className="space-y-1">
                    <h2 className="text-2xl font-black tracking-tighter leading-none">{activeP.name}</h2>
                    <IdBadge id={activeP.participantId} hideLabel className="scale-110 origin-center" />
                </div>
                <div className="pt-6 border-t space-y-4 text-left">
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Profile</span>
                        <div className="flex gap-2">
                            <Badge className="bg-slate-100 text-slate-700 border-none font-black text-[10px] h-6 px-2">{activeP.age}Y</Badge>
                            <Badge className="bg-slate-100 text-slate-700 border-none font-black text-[10px] h-6 px-2">{activeP.maritalStatus}</Badge>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Primary Access</span>
                        <div className="flex items-center gap-3 bg-emerald-50/50 p-3 rounded-xl ring-1 ring-emerald-100/50">
                            <Smartphone className="h-4 w-4 text-emerald-600" />
                            <span className="text-sm font-mono font-black text-slate-800">{activeP.phoneNumber?.[0] || 'N/A'}</span>
                            <Button size="icon" variant="ghost" className="ml-auto h-7 w-7 rounded-lg text-emerald-600 hover:bg-emerald-100" asChild>
                                <a href={`tel:${activeP.phoneNumber?.[0]}`}><Phone className="h-3.5 w-3.5" /></a>
                            </Button>
                        </div>
                    </div>
                    {activeP.nextOfKinName && (
                        <div className="space-y-2">
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Clinical Access Emergency</span>
                            <div className="bg-rose-50/50 p-3 rounded-xl ring-1 ring-rose-100/50 space-y-1">
                                <div className="flex items-center gap-2">
                                    <Heart className="h-3.5 w-3.5 text-rose-500" />
                                    <span className="text-xs font-black text-slate-800">{activeP.nextOfKinName}</span>
                                    {activeP.nextOfKinRelation && (
                                        <Badge variant="outline" className="h-4 px-1 text-[7px] font-black uppercase border-rose-200 text-rose-600 bg-white">
                                            {activeP.nextOfKinRelation}
                                        </Badge>
                                    )}
                                </div>
                                {activeP.alternativeContact && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-mono font-bold text-rose-700">{activeP.alternativeContact}</span>
                                        <Button size="icon" variant="ghost" className="h-6 w-6 rounded-md text-rose-500 hover:bg-rose-100" asChild>
                                            <a href={`tel:${activeP.alternativeContact}`}><Phone className="h-3 w-3" /></a>
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    <div className="space-y-2">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Study Site</span>
                        <div className="flex items-start gap-3 bg-primary/5 p-3 rounded-xl ring-1 ring-primary/10">
                            <Hospital className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            <p className="text-[11px] font-black text-primary uppercase leading-tight">{activeP.healthFacility}</p>
                        </div>
                    </div>
                </div>
            </Card>

            <div className="p-5 bg-slate-900 rounded-2xl text-white space-y-3 shadow-xl">
                <div className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-emerald-400" /><p className="text-[11px] font-black uppercase tracking-widest">Protocol Intelligence</p></div>
                <p className="text-[10px] font-medium leading-relaxed uppercase tracking-widest opacity-80">Timeline and survey windows are derived from enrollment metadata. Modifications require administrative audit approval.</p>
            </div>
        </div>
      </div>

      {/* Add Note Dialog */}
      <Dialog open={isAddNoteOpen} onOpenChange={setIsAddNoteOpen}>
        <DialogContent className="rounded-[2.5rem] sm:max-w-xl border-none shadow-3xl p-0 overflow-hidden bg-[#f9fafb]">
          <DialogHeader className="p-6 md:p-8 bg-violet-600 text-white border-b">
              <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center shadow-inner">
                      <FileText className="h-6 w-6 text-white" />
                  </div>
                  <div>
                      <DialogTitle className="text-xl font-black tracking-tight leading-none">New Study Note</DialogTitle>
                      <DialogDescription className="text-[10px] font-black uppercase tracking-widest text-violet-100 mt-2">Dossier Log for {activeP.name}</DialogDescription>
                  </div>
              </div>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh]">
              <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-slate-400">Category *</Label>
                        <Select value={noteForm.category} onValueChange={(v: any) => setNoteForm({...noteForm, category: v})}>
                            <SelectTrigger className="h-11 rounded-xl bg-white font-bold border-none shadow-sm ring-1 ring-slate-200">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {NOTE_CATEGORIES.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-slate-400">Importance *</Label>
                        <Select value={noteForm.importance} onValueChange={(v: any) => setNoteForm({...noteForm, importance: v})}>
                            <SelectTrigger className="h-11 rounded-xl bg-white font-bold border-none shadow-sm ring-1 ring-slate-200">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {IMPORTANCE_LEVELS.map(l => <SelectItem key={l.id} value={l.id} className="text-xs">{l.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Note Title *</Label>
                    <Input value={noteForm.title} onChange={e => setNoteForm({...noteForm, title: e.target.value})} className="h-11 rounded-xl bg-white font-bold border-none shadow-sm ring-1 ring-slate-200" placeholder="Short descriptive title..." />
                </div>

                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Content / Observations *</Label>
                    <Textarea value={noteForm.content} onChange={e => setNoteForm({...noteForm, content: e.target.value})} className="rounded-2xl bg-white text-sm p-4 min-h-[150px] border-none shadow-inner ring-1 ring-slate-200" placeholder="Enter detailed clinical or social observations..." />
                </div>

                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Tags (comma separated)</Label>
                    <Input value={noteForm.tags} onChange={e => setNoteForm({...noteForm, tags: e.target.value})} className="h-11 rounded-xl bg-white font-bold border-none shadow-sm ring-1 ring-slate-200" placeholder="e.g. hypertension, finance, husband_support" />
                </div>

                <div className="flex items-center space-x-2 bg-white p-4 rounded-xl ring-1 ring-slate-200">
                    <input type="checkbox" id="followup" checked={noteForm.requiresFollowup} onChange={e => setNoteForm({...noteForm, requiresFollowup: e.target.checked})} className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                    <Label htmlFor="followup" className="text-xs font-bold text-slate-700">Flag for Follow-up Action</Label>
                </div>
              </div>
          </ScrollArea>
          <DialogFooter className="p-6 bg-white border-t flex gap-4">
              <button onClick={() => setIsAddNoteOpen(false)} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 px-4">Cancel</button>
              <Button onClick={handleSaveNote} disabled={!noteForm.title || !noteForm.content} className="flex-1 h-14 rounded-2xl font-black uppercase text-xs bg-violet-600 hover:bg-violet-700 shadow-xl shadow-violet-500/20 text-white">Record Study Note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isEditing && (
        <Dialog open={isEditing} onOpenChange={setIsEditing}>
            <DialogContent className="sm:max-w-xl rounded-[2.5rem] border-none shadow-2xl overflow-hidden p-0 bg-background">
                <DialogHeader className="p-6 bg-primary text-white border-b"><DialogTitle className="text-xl font-black tracking-tight uppercase">Correct Dossier Entry</DialogTitle></DialogHeader>
                <ScrollArea className="max-h-[80vh] p-6"><AncRegistrationForm editMode={true} initialData={activeP} onOpenChange={(open) => !open && setIsEditing(false)} /></ScrollArea>
            </DialogContent>
        </Dialog>
      )}
    </div>
    );
}
