
"use client";

import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, orderBy, Timestamp, addDoc, serverTimestamp } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, 
  Baby, 
  Phone, 
  ClipboardList, 
  ShieldCheck, 
  Clock, 
  Activity,
  MapPin,
  User
} from 'lucide-react';
import { format } from 'date-fns';
import { type AncRegistration, type TimelineEvent } from '@/types';
import Link from 'next/link';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { calculateCurrentGA, getTrimester } from '@/lib/timeline/formulas';

export default function ParticipantTimelineDetail() {
  const { id } = useParams();
  const firestore = useFirestore();
  const { toast } = useToast();

  const docRef = useMemoFirebase(() => {
    if (!firestore || !id) return null;
    return doc(firestore, 'anc_registrations', id as string);
  }, [firestore, id]);

  const eventsQuery = useMemoFirebase(() => {
    if (!firestore || !id) return null;
    return query(collection(firestore, 'anc_registrations', id as string, 'timeline_events'), orderBy('created_at', 'desc'));
  }, [firestore, id]);

  const { data: p, isLoading } = useDoc<AncRegistration>(docRef);
  const { data: events } = useCollection<TimelineEvent>(eventsQuery);

  const logContact = async () => {
    if (!firestore || !id) return;
    try {
        await addDoc(collection(firestore, 'anc_registrations', id as string, 'timeline_events'), {
            event_type: 'phone_contact',
            event_date: Timestamp.now(),
            notes: 'Follow-up phone call logged by staff.',
            created_at: serverTimestamp()
        });
        toast({ title: "Contact Logged", description: "The outreach attempt has been recorded in the timeline.", variant: "success" });
    } catch (e) {
        toast({ title: "Error", variant: "destructive" });
    }
  };

  if (isLoading || !p) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Activity className="h-10 w-10 animate-spin text-primary" />
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Loading Timeline Intelligence...</p>
    </div>
  );

  const enrollDate = p.createdAt?.toDate ? p.createdAt.toDate() : new Date(p.createdAt || Date.now());
  const ga = calculateCurrentGA(enrollDate, p.gestationalAge || 20);
  const trimester = getTrimester(ga.weeks);
  const progress = Math.min(100, (ga.weeks / 40) * 100);

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-24">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="rounded-xl h-11 w-11">
            <Link href="/anc/participants"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div>
          <h1 className="text-3xl font-black tracking-tighter">{p.name}</h1>
          <div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            <span className="text-primary font-black">{p.participantId}</span>
            <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
            <span>{p.healthFacility}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Main Timeline Body */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="border-none ring-1 ring-border shadow-none rounded-[2.5rem] overflow-hidden">
            <CardHeader className="bg-primary/5 p-8 border-b">
                <div className="flex justify-between items-start mb-6">
                    <div className="space-y-1">
                        <CardTitle className="text-3xl font-black tracking-tighter">Pregnancy Journey</CardTitle>
                        <CardDescription className="font-bold text-[10px] uppercase tracking-widest">Automatic Clinical Tracking Engine</CardDescription>
                    </div>
                    <Badge className="bg-white text-primary border-primary/20 font-black px-4 py-1 rounded-xl text-xs">
                        {ga.weeks}+{ga.days} Wks • Trimester {trimester}
                    </Badge>
                </div>
                <div className="space-y-4">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <span>Enrolled ({p.gestationalAge}wk)</span>
                        <span className="text-primary">Current GA ({ga.weeks}wk)</span>
                        <span>Term (40wk)</span>
                    </div>
                    <div className="relative pt-4">
                        <Progress value={progress} className="h-4 rounded-full bg-slate-100" />
                        <div className="absolute top-0 left-[50%] -translate-x-1/2 flex flex-col items-center">
                            <div className="h-8 w-px bg-primary border-dashed" />
                            <Baby className="h-5 w-5 text-primary bg-white rounded-full p-0.5 ring-4 ring-primary/10" />
                        </div>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                        <div className="text-center">
                            <p className="text-[10px] font-black text-slate-400 uppercase">Enrollment</p>
                            <p className="text-xs font-bold">{p.createdAt ? format(enrollDate, 'dd MMM yy') : 'N/A'}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] font-black text-primary uppercase">Estimated EDD</p>
                            <p className="text-sm font-black text-primary">{p.edd?.toDate ? format(p.edd.toDate(), 'dd MMM yyyy') : 'N/A'}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] font-black text-slate-400 uppercase">Study Site</p>
                            <p className="text-xs font-bold truncate max-w-[120px]">{p.healthFacility}</p>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { num: 1, label: 'Enrollment', date: p.enrollment_date, done: true },
                        { num: 2, label: '28 Weeks', date: p.survey2_target_date, status: p.survey2_status, done: p.survey2_completed },
                        { num: 3, label: '36 Weeks', date: p.survey3_target_date, status: p.survey3_status, done: p.survey3_completed },
                        { num: 4, label: 'Postpartum', date: p.survey4_target_date, status: p.survey4_status, done: p.survey4_completed },
                    ].map((s) => (
                        <div key={s.num} className={cn(
                            "p-4 rounded-[1.5rem] border-2 transition-all",
                            s.done ? "border-primary/20 bg-primary/5" : "border-slate-100 bg-slate-50/50"
                        )}>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Survey {s.num}</span>
                                {s.done ? <Activity className="h-3 w-3 text-primary" /> : <Clock className="h-3 w-3 text-slate-300" />}
                            </div>
                            <p className="text-sm font-black tracking-tight">{s.label}</p>
                            <p className="text-[10px] font-bold text-slate-500 mt-1">
                                {s.date?.toDate ? format(s.date.toDate(), 'dd MMM yy') : 'Pending'}
                            </p>
                            {!s.done && s.status && (
                                <Badge className="mt-3 rounded-lg font-black text-[8px] uppercase tracking-tighter w-full justify-center bg-white text-slate-600 border-slate-200">
                                    {s.status.replace('_', ' ')}
                                </Badge>
                            )}
                        </div>
                    ))}
                </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Button onClick={logContact} variant="outline" className="h-16 rounded-[1.5rem] border-2 font-black uppercase tracking-widest text-xs gap-3">
                <Phone className="h-5 w-5 text-primary" /> Log Phone Contact
            </Button>
            <Button className="h-16 rounded-[1.5rem] font-black uppercase tracking-widest text-xs gap-3">
                <Baby className="h-5 w-5" /> Record Delivery
            </Button>
          </div>

          <Card className="border-none ring-1 ring-border shadow-none rounded-[2.5rem] overflow-hidden">
            <CardHeader className="bg-slate-50 border-b p-8">
                <CardTitle className="text-xl font-black tracking-tight">Timeline Events</CardTitle>
                <CardDescription className="font-bold text-[10px] uppercase tracking-widest">Chronological study activity feed</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <ScrollArea className="h-[400px]">
                    <div className="p-8 space-y-8">
                        {events?.map((e, i) => (
                            <div key={e.id} className="flex gap-6 relative">
                                {i < (events.length - 1) && <div className="absolute left-[19px] top-10 bottom-[-32px] w-0.5 bg-slate-100" />}
                                <div className={cn(
                                    "h-10 w-10 rounded-2xl shrink-0 flex items-center justify-center ring-4 ring-white relative z-10",
                                    e.event_type === 'enrolled' ? "bg-primary text-white" : 
                                    e.event_type === 'phone_contact' ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-400"
                                )}>
                                    {e.event_type === 'enrolled' ? <User className="h-5 w-5" /> : 
                                     e.event_type === 'phone_contact' ? <Phone className="h-5 w-5" /> : <ClipboardList className="h-5 w-5" />}
                                </div>
                                <div className="space-y-1 pt-1">
                                    <div className="flex items-center gap-3">
                                        <h4 className="text-sm font-black uppercase tracking-widest">{e.event_type.replace('_', ' ')}</h4>
                                        <span className="text-[10px] font-bold text-slate-400">
                                            {e.created_at?.toDate ? format(e.created_at.toDate(), 'PPP p') : 'N/A'}
                                        </span>
                                    </div>
                                    <p className="text-sm font-medium text-slate-600 leading-relaxed">{e.notes || `Activity recorded at week ${e.ga_weeks_at_event || ga.weeks}.`}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Sidebar Context */}
        <div className="lg:col-span-4 space-y-6">
            <Card className="border-none ring-1 ring-border shadow-none rounded-[2.5rem] bg-emerald-50/50">
                <CardContent className="p-8 space-y-6">
                    <div className="flex flex-col items-center text-center gap-4">
                        <div className="h-20 w-20 rounded-full bg-white shadow-xl flex items-center justify-center ring-4 ring-emerald-100">
                            <User className="h-10 w-10 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black tracking-tight">{p.name}</h3>
                            <Badge variant="outline" className="mt-1 bg-white border-emerald-200 text-emerald-700 font-black text-[9px] uppercase tracking-widest px-3">
                                Active Cohort
                            </Badge>
                        </div>
                    </div>
                    
                    <div className="space-y-4 pt-4 border-t border-emerald-100/50">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                                <Activity className="h-5 w-5 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Clinical Bio</p>
                                <p className="text-sm font-bold">{p.age} years • {p.maritalStatus}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                                <MapPin className="h-5 w-5 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Study Facility</p>
                                <p className="text-sm font-bold truncate max-w-[180px]">{p.healthFacility}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                                <Phone className="h-5 w-5 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Mobile Contact</p>
                                <p className="text-sm font-bold font-mono">{Array.isArray(p.phoneNumber) ? p.phoneNumber[0] : p.phoneNumber}</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-none ring-1 ring-border shadow-none rounded-[2.5rem] bg-primary">
                <CardContent className="p-8 text-white space-y-4">
                    <ShieldCheck className="h-8 w-8" />
                    <h4 className="text-xl font-black tracking-tight leading-tight">Timeline Integrity Active</h4>
                    <p className="text-sm font-medium opacity-80 leading-relaxed">
                        The PartoMa engine recalculates this participant's status based on their enrolled GA of {p.gestationalAge} weeks.
                    </p>
                    <Button variant="outline" className="w-full h-12 rounded-xl bg-white/10 border-white/20 text-white font-black hover:bg-white/20">
                        View Study Protocol
                    </Button>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
