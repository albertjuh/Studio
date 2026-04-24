
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, addDoc, updateDoc, doc, serverTimestamp, Timestamp, deleteDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ChevronRight, 
  Users, 
  Plus, 
  Mic, 
  Camera, 
  Phone, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Search,
  LayoutGrid,
  ShieldCheck,
  Calendar,
  ArrowLeft,
  Baby,
  Timer,
  Pencil,
  Trash2,
  Eye,
  Target,
  FileText,
  MessageSquare,
  Sparkles,
  Filter
} from 'lucide-react';
import { format, differenceInDays, addDays, startOfDay } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Link from 'next/link';
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const IDI_FACILITIES = ['Buza Health Center', 'Temeke Regional Referral Hospital'];

const INTERVIEWS = [
  { 
    num: 1, 
    label: 'Phase 1: Expectations', 
    window: '18–20 weeks GA', 
    topic: 'Current pregnancy experiences & expectations at this phase.',
    ga_start: 18, 
    ga_end: 20, 
    special: null 
  },
  { 
    num: 2, 
    label: 'Phase 2: Climate & Urban', 
    window: '28–30 weeks GA', 
    topic: 'Pregnancy in urban settings influenced by climate change (Audio Diary).',
    ga_start: 28, 
    ga_end: 30, 
    special: 'audio_diary' 
  },
  { 
    num: 3, 
    label: 'Phase 3: ANC Experiences', 
    window: '36–38 weeks GA', 
    topic: 'Experiences with pregnancy and ANC (Photovoice requested).',
    ga_start: 36, 
    ga_end: 38, 
    special: 'photovoice' 
  },
  { 
    num: 4, 
    label: 'Phase 4: Concluding', 
    window: '2–4 weeks postpartum', 
    topic: 'Concluding postpartum follow-up interview.',
    ga_start: null, 
    ga_end: null, 
    special: null 
  },
];

export default function IDIRegistryPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [phaseFilter, setPhaseFilter] = useState('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [staffName, setStaffName] = useState('Study RA');
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('ancUser');
    if (userStr) {
      const u = JSON.parse(userStr);
      setStaffName(u.name);
      setUserRole(u.role);
    }
  }, []);

  const isAdmin = userRole === 'admin';

  const [form, setForm] = useState({
    name: '', 
    age: '', 
    phone: '', 
    facility: '', 
    gestationalAge: '', 
    residesInTemeke: false, 
    consentGiven: false, 
    notes: '',
    nextOfKinName: '',
    nextOfKinPhone: '',
    nextOfKinRelation: ''
  });

  const idiQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'idi_participants'), orderBy('created_at', 'desc'));
  }, [firestore]);

  const { data: participants, isLoading } = useCollection<any>(idiQuery);

  const calculateCurrentGA = (participant: any) => {
    const enrollDate = participant.created_at?.toDate ? participant.created_at.toDate() : new Date();
    const gaAtEnroll = Number(participant.gestationalAge) || 0;
    const daysSince = Math.max(0, differenceInDays(startOfDay(new Date()), startOfDay(enrollDate)));
    const totalDays = (gaAtEnroll * 7) + daysSince;
    return {
      weeks: Math.floor(totalDays / 7),
      days: totalDays % 7
    };
  };

  const getPhaseStatus = (participant: any, phaseNum: number) => {
    const phaseData = participant[`interview${phaseNum}`];
    if (phaseData?.completed) return 'completed';

    const currentGA = calculateCurrentGA(participant);
    const config = INTERVIEWS[phaseNum - 1];
    
    if (phaseNum < 4) {
      if (!config.ga_start || !config.ga_end) return 'upcoming';
      if (currentGA.weeks > config.ga_end) return 'overdue';
      if (currentGA.weeks >= config.ga_start && currentGA.weeks <= config.ga_end) return 'due_now';
      if (currentGA.weeks >= config.ga_start - 2) return 'due_soon';
      return 'upcoming';
    } 
    
    const enrollDate = participant.created_at?.toDate ? participant.created_at.toDate() : new Date();
    const gaAtEnroll = Number(participant.gestationalAge) || 0;
    const edd = addDays(enrollDate, (40 - gaAtEnroll) * 7);
    const daysPostpartum = differenceInDays(startOfDay(new Date()), startOfDay(edd));

    if (daysPostpartum > 28) return 'overdue';
    if (daysPostpartum >= 14 && daysPostpartum <= 28) return 'due_now';
    if (daysPostpartum >= 0 && daysPostpartum < 14) return 'due_soon';
    return 'upcoming';
  };

  const stats = useMemo(() => {
    if (!participants) return null;
    const counts = [0, 0, 0, 0];
    participants.forEach((p: any) => {
      for (let i = 4; i >= 1; i--) {
        if (p[`interview${i}`]?.completed) {
          counts[i-1]++;
          break;
        }
        if (i === 1 && !p.interview1?.completed) counts[0]++;
      }
    });
    return counts;
  }, [participants]);

  const filtered = useMemo(() => {
    if (!participants) return [];
    let result = participants;
    
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter((p: any) => 
        p.name?.toLowerCase().includes(lower) || 
        p.phone?.includes(lower)
      );
    }

    if (phaseFilter !== 'all') {
      const phaseNum = parseInt(phaseFilter);
      result = result.filter((p: any) => {
        // Find current active phase
        let currentActive = 1;
        for (let i = 1; i <= 4; i++) {
          if (!p[`interview${i}`]?.completed) {
            currentActive = i;
            break;
          }
        }
        return currentActive === phaseNum;
      });
    }

    return result;
  }, [participants, searchTerm, phaseFilter]);

  const handleRegister = async () => {
    if (!firestore) return;
    if (!form.name || !form.age || !form.phone || !form.facility || !form.gestationalAge || !form.nextOfKinName || !form.nextOfKinPhone || !form.nextOfKinRelation) {
      toast({ title: 'Missing Fields', description: 'Please fill all required fields.', variant: 'destructive' });
      return;
    }
    if (parseInt(form.age) < 18) {
      toast({ title: 'Eligibility Error', description: 'Participant must be 18 years or older.', variant: 'destructive' });
      return;
    }
    if (!form.residesInTemeke) {
      toast({ title: 'Eligibility Error', description: 'Participant must reside within Temeke municipal area.', variant: 'destructive' });
      return;
    }
    if (!form.consentGiven) {
      toast({ title: 'Consent Required', description: 'Written consent is mandatory for recruitment.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingId) {
        await updateDoc(doc(firestore, 'idi_participants', editingId), {
          ...form,
          age: parseInt(form.age),
          gestationalAge: parseInt(form.gestationalAge),
          updated_at: serverTimestamp()
        });
        toast({ title: 'Record Updated', description: `${form.name}'s data has been corrected.`, variant: "success" });
      } else {
        await addDoc(collection(firestore, 'idi_participants'), {
          ...form,
          age: parseInt(form.age),
          gestationalAge: parseInt(form.gestationalAge),
          registered_by: staffName,
          created_at: serverTimestamp(),
          interview1: { status: 'upcoming', completed: false },
          interview2: { status: 'upcoming', completed: false, audio_diary_collected: false },
          interview3: { status: 'upcoming', completed: false, photovoice_collected: false },
          interview4: { status: 'upcoming', completed: false },
        });
        toast({ title: 'Recruitment Successful', description: `${form.name} enrolled in IDI sub-study.`, variant: "success" });
      }
      setIsRegisterOpen(false);
      setEditingId(null);
      setForm({ name: '', age: '', phone: '', facility: '', gestationalAge: '', residesInTemeke: false, consentGiven: false, notes: '', nextOfKinName: '', nextOfKinPhone: '', nextOfKinRelation: '' });
    } catch (err: any) {
      toast({ title: 'Operation Failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const markInterviewComplete = async (participantId: string, interviewNum: number, extras: any = {}) => {
    if (!firestore) return;
    try {
      await updateDoc(doc(firestore, 'idi_participants', participantId), {
        [`interview${interviewNum}`]: {
          status: 'completed',
          date: Timestamp.now(),
          completed: true,
          recorded_by: staffName,
          ...extras
        }
      });
      toast({ title: `Phase ${interviewNum} Logged`, description: 'Interview series updated.', variant: "success" });
      setSelectedParticipant(null);
    } catch (err: any) {
      toast({ title: 'Update Failed', description: err.message, variant: 'destructive' });
    }
  };

  const deleteParticipant = async (id: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, 'idi_participants', id));
      toast({ title: 'Participant Purged', variant: "success" });
    } catch (err: any) {
      toast({ title: 'Purge Failed', description: err.message, variant: 'destructive' });
    }
  };

  const openEdit = (p: any) => {
    setEditingId(p.id);
    setForm({
      name: p.name || '',
      age: p.age?.toString() || '',
      phone: p.phone || '',
      facility: p.facility || '',
      gestationalAge: p.gestationalAge?.toString() || '',
      residesInTemeke: p.residesInTemeke || false,
      consentGiven: p.consentGiven || false,
      notes: p.notes || '',
      nextOfKinName: p.nextOfKinName || '',
      nextOfKinPhone: p.nextOfKinPhone || '',
      nextOfKinRelation: p.nextOfKinRelation || ''
    });
    setIsRegisterOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-24 pt-4">
      {/* Header & Stats Strip */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 px-4 md:px-0">
        <div className="flex items-center gap-6">
          <Button variant="secondary" size="icon" asChild className="rounded-2xl h-12 w-12 bg-violet-100 text-violet-600 hover:bg-violet-200">
            <Link href="/anc/activities"><ArrowLeft className="h-6 w-6" /></Link>
          </Button>
          <div>
            <div className="flex items-center gap-2 text-violet-600 font-black uppercase tracking-[0.2em] text-[10px] mb-1">
              <Sparkles className="h-4 w-4" /> Qualitative Research Terminal
            </div>
            <h1 className="text-5xl font-black tracking-tighter text-slate-900 dark:text-white">IDI Registry</h1>
            <p className="text-sm font-medium text-slate-500 max-w-md">Longitudinal in-depth interview sub-study monitoring Buza HC and Temeke RRH.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto">
            {stats && [1, 2, 3, 4].map(n => (
              <Card key={n} className="border-none bg-violet-50 dark:bg-violet-900/10 p-3 flex flex-col items-center justify-center text-center ring-1 ring-violet-100 dark:ring-violet-900/30">
                <span className="text-[8px] font-black text-violet-600 uppercase tracking-widest mb-1">Phase {n}</span>
                <span className="text-xl font-black text-slate-900 dark:text-white">{stats[n-1]}</span>
              </Card>
            ))}
        </div>
      </div>

      {/* Control Center */}
      <div className="px-4 md:px-0 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search by name or contact..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              className="pl-12 h-14 rounded-2xl border-none ring-1 ring-slate-200 focus:ring-violet-400 bg-white dark:bg-slate-900 shadow-sm"
            />
          </div>
          <Select value={phaseFilter} onValueChange={setPhaseFilter}>
            <SelectTrigger className="h-14 rounded-2xl border-none ring-1 ring-slate-200 bg-white dark:bg-slate-900 w-full sm:w-48 font-bold">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-violet-500" />
                <SelectValue placeholder="All Phases" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Phases</SelectItem>
              <SelectItem value="1">Phase 1: Expectations</SelectItem>
              <SelectItem value="2">Phase 2: Climate</SelectItem>
              <SelectItem value="3">Phase 3: ANC Exp.</SelectItem>
              <SelectItem value="4">Phase 4: Postpartum</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => { setEditingId(null); setIsRegisterOpen(true); }} className="w-full md:w-auto h-14 px-10 rounded-2xl font-black uppercase tracking-widest shadow-2xl shadow-violet-500/20 gap-3 bg-violet-600 hover:bg-violet-700 text-white border-none">
          <Plus className="h-5 w-5" /> Enroll IDI Mother
        </Button>
      </div>

      {/* Registry Feed */}
      <div className="px-4 md:px-0 space-y-6">
        {isLoading ? (
          <div className="py-32 flex flex-col items-center justify-center gap-6 text-slate-400">
            <Clock className="h-12 w-12 animate-spin text-violet-500" />
            <p className="text-xs font-black uppercase tracking-[0.3em]">Synchronizing Dossiers...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-40 text-center border-4 border-dashed rounded-[4rem] space-y-6 bg-slate-50/50 dark:bg-slate-900/20">
            <div className="p-8 bg-white dark:bg-slate-800 rounded-full w-fit mx-auto shadow-xl">
                <Users className="h-16 w-16 text-slate-200" />
            </div>
            <div className="space-y-2">
                <p className="text-xl font-black text-slate-400">No Dossiers Match Filters</p>
                <p className="text-sm text-slate-500 font-medium">Clear search or filters to see the full qualitative registry.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {filtered.map((p: any) => {
              const currentGA = calculateCurrentGA(p);
              const activePhase = [1, 2, 3, 4].find(n => !p[`interview${n}`]?.completed) || 4;
              
              return (
                <Card key={p.id} className="border-none ring-1 ring-slate-200 dark:ring-slate-800 shadow-none rounded-[3rem] overflow-hidden group hover:ring-violet-400 transition-all duration-500 bg-white dark:bg-slate-900/50">
                  <CardContent className="p-0">
                    <div className="p-8 space-y-8">
                      {/* Dossier Header */}
                      <div className="flex flex-col md:flex-row items-start justify-between gap-6">
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <h3 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">{p.name}</h3>
                            <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 border-none text-[10px] font-black px-3 py-1">Age {p.age}</Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-violet-500" /> {p.phone}</span>
                            <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg"><LayoutGrid className="h-3.5 w-3.5" /> {p.facility.split(' (')[0]}</span>
                            <span className="flex items-center gap-1.5 font-black text-violet-600"><Timer className="h-3.5 w-3.5" /> Current GA: {currentGA.weeks}+{currentGA.days}w</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 shrink-0">
                          {isAdmin && (
                            <div className="flex gap-1 mr-2 px-2 border-r border-slate-200 dark:border-slate-800">
                              <Button variant="ghost" size="icon" onClick={() => openEdit(p)} className="h-10 w-10 rounded-xl text-slate-400 hover:text-violet-600 hover:bg-violet-50">
                                <Pencil className="h-4.5 w-4.5" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50">
                                    <Trash2 className="h-4.5 w-4.5" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-[3rem] border-none shadow-2xl">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="font-black text-3xl tracking-tighter">Purge Dossier?</AlertDialogTitle>
                                    <AlertDialogDescription className="font-medium text-slate-600 leading-relaxed">
                                        Permanently remove <span className="text-slate-900 font-black">{p.name}</span> from the qualitative sub-study. All recorded interview phases will be lost.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter className="mt-6">
                                    <AlertDialogCancel className="rounded-2xl font-bold px-8">Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteParticipant(p.id)} className="bg-rose-600 text-white rounded-2xl font-black uppercase tracking-widest px-10 hover:bg-rose-700">Confirm Purge</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          )}
                          <Button onClick={() => setSelectedParticipant(p)} variant="outline" className="h-12 px-6 rounded-2xl font-black uppercase text-[10px] tracking-widest border-2 border-violet-100 hover:bg-violet-50 hover:text-violet-600 group-hover:border-violet-400 transition-all">
                            Track Dossier <ChevronRight className="ml-2 h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Qualitative Milestones Bar */}
                      <div className="grid grid-cols-4 gap-2 relative">
                        <div className="absolute top-5 left-8 right-8 h-1 bg-slate-100 dark:bg-slate-800 -z-0" />
                        {[1, 2, 3, 4].map(num => {
                          const status = getPhaseStatus(p, num);
                          const config = INTERVIEWS[num-1];
                          const isCompleted = status === 'completed';
                          const isCurrent = activePhase === num;

                          return (
                            <div key={num} className="relative z-10 flex flex-col items-center gap-3">
                              <div className={cn(
                                "h-10 w-10 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-sm",
                                isCompleted ? "bg-violet-600 text-white" : 
                                isCurrent ? "bg-white ring-2 ring-violet-500 text-violet-600 animate-pulse" : 
                                "bg-slate-100 dark:bg-slate-800 text-slate-400"
                              )}>
                                {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <span className="text-[10px] font-black">{num}</span>}
                              </div>
                              <div className="text-center space-y-1">
                                <p className={cn("text-[8px] font-black uppercase tracking-tighter", isCurrent ? "text-violet-600" : "text-slate-400")}>
                                    P{num}
                                </p>
                                {config.special && !isCompleted && (
                                    <div className="flex justify-center">
                                        {config.special === 'audio_diary' ? <Mic className="h-3 w-3 text-violet-400" /> : <Camera className="h-3 w-3 text-violet-400" />}
                                    </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Enrollment / Edit Dialog */}
      <Dialog open={isRegisterOpen} onOpenChange={(open) => { if (!open) { setIsRegisterOpen(false); setEditingId(null); setForm({ name: '', age: '', phone: '', facility: '', gestationalAge: '', residesInTemeke: false, consentGiven: false, notes: '', nextOfKinName: '', nextOfKinPhone: '', nextOfKinRelation: '' }); } }}>
        <DialogContent className="sm:max-w-2xl rounded-[3rem] border-none shadow-3xl p-0 overflow-hidden bg-white">
          <DialogHeader className="p-10 bg-violet-50/50 border-b border-violet-100">
            <div className="flex items-center gap-4 mb-2">
                <div className="p-3 bg-violet-600 rounded-2xl text-white">
                    <Users className="h-6 w-6" />
                </div>
                <div>
                    <DialogTitle className="text-3xl font-black tracking-tight text-slate-900">{editingId ? 'Correct Profile' : 'New Enrollment'}</DialogTitle>
                    <DialogDescription className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-600">Sub-Study Participant Registration</DialogDescription>
                </div>
            </div>
          </DialogHeader>
          <ScrollArea className="max-h-[75vh]">
            <div className="p-10 space-y-10">
              {/* Specialized Logic Container */}
              <div className="p-8 bg-violet-600 rounded-[2.5rem] text-white space-y-4 shadow-xl shadow-violet-500/20">
                <p className="text-[10px] font-black uppercase tracking-widest text-violet-200">Protocol Check-list</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 bg-white/10 p-4 rounded-2xl">
                    <Checkbox id="age_check" checked={parseInt(form.age) >= 18} disabled className="border-white data-[state=checked]:bg-white data-[state=checked]:text-violet-600" />
                    <Label className="text-xs font-bold leading-none">Age 18+</Label>
                  </div>
                  <div className="flex items-center gap-3 bg-white/10 p-4 rounded-2xl">
                    <Checkbox id="temeke" checked={form.residesInTemeke} onCheckedChange={v => setForm({...form, residesInTemeke: !!v})} className="border-white data-[state=checked]:bg-white data-[state=checked]:text-violet-600" />
                    <Label htmlFor="temeke" className="text-xs font-bold leading-none cursor-pointer">Temeke Resident</Label>
                  </div>
                  <div className="flex items-center gap-3 bg-white/10 p-4 rounded-2xl col-span-full">
                    <Checkbox id="consent" checked={form.consentGiven} onCheckedChange={v => setForm({...form, consentGiven: !!v})} className="border-white data-[state=checked]:bg-white data-[state=checked]:text-violet-600" />
                    <Label htmlFor="consent" className="text-xs font-bold leading-none cursor-pointer">Written Consent Obtained</Label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><User className="h-4 w-4" /> Personal Profile</h4>
                    <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest">Full Name *</Label>
                          <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Mother's full name" className="h-12 rounded-xl border-2 font-medium" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest">Age *</Label>
                            <Input type="number" value={form.age} onChange={e => setForm({...form, age: e.target.value})} placeholder="Years" className="h-12 rounded-xl border-2 font-medium" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest">Enroll GA *</Label>
                            <Input type="number" value={form.gestationalAge} onChange={e => setForm({...form, gestationalAge: e.target.value})} placeholder="Weeks" className="h-12 rounded-xl border-2 font-medium" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-violet-600">Primary Contact *</Label>
                          <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+255..." className="h-12 rounded-xl border-2 border-violet-100 font-mono font-black text-violet-700 bg-violet-50/30" />
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><Users className="h-4 w-4" /> Contact Dossier</h4>
                    <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest">Kin Name *</Label>
                          <Input value={form.nextOfKinName} onChange={e => setForm({...form, nextOfKinName: e.target.value})} placeholder="Emergency contact name" className="h-12 rounded-xl border-2 font-medium" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest">Kin Relation *</Label>
                          <Input value={form.nextOfKinRelation} onChange={e => setForm({...form, nextOfKinRelation: e.target.value})} placeholder="e.g. Husband, Sister" className="h-12 rounded-xl border-2 font-medium" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest">Kin Phone *</Label>
                          <Input value={form.nextOfKinPhone} onChange={e => setForm({...form, nextOfKinPhone: e.target.value})} placeholder="+255..." className="h-12 rounded-xl border-2 font-mono font-bold" />
                        </div>
                    </div>
                </div>
              </div>

              <div className="space-y-6 pt-4 border-t border-dashed">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest">Selected Clinical Facility *</Label>
                  <Select value={form.facility} onValueChange={v => setForm({...form, facility: v})}>
                    <SelectTrigger className="h-14 rounded-2xl border-2 font-black text-violet-700">
                      <SelectValue placeholder="Select high-volume facility" />
                    </SelectTrigger>
                    <SelectContent>
                      {IDI_FACILITIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Researcher Handover Notes</Label>
                  <Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Recruitment context, personality traits, or accessibility notes..." className="rounded-2xl border-2 italic min-h-[100px]" />
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="p-10 bg-slate-50 border-t">
            <Button onClick={handleRegister} disabled={isSubmitting} className="w-full h-16 rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs shadow-3xl shadow-violet-500/30 bg-violet-600 hover:bg-violet-700 text-white">
              {isSubmitting ? 'Processing...' : editingId ? 'Update Research Dossier' : 'Finalize Enrollment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dossier Tracking Dialog */}
      {selectedParticipant && (
        <Dialog open={!!selectedParticipant} onOpenChange={() => setSelectedParticipant(null)}>
          <DialogContent className="sm:max-w-3xl rounded-[4rem] border-none shadow-4xl p-0 overflow-hidden bg-white">
            <DialogHeader className="p-10 bg-violet-600 text-white border-b border-violet-700 relative">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-8 relative z-10">
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-violet-200">Sub-Study Research Dossier</p>
                  <DialogTitle className="text-5xl font-black tracking-tighter">{selectedParticipant.name}</DialogTitle>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Badge variant="outline" className="bg-white/10 text-white border-white/20 font-black text-[10px] uppercase px-4 py-1 rounded-xl">{selectedParticipant.facility}</Badge>
                    <Badge className="bg-white text-violet-600 border-none text-[10px] font-black px-4 py-1 rounded-xl">Age {selectedParticipant.age}</Badge>
                  </div>
                </div>
                {isAdmin && (
                  <Button variant="outline" onClick={() => { const p = selectedParticipant; setSelectedParticipant(null); openEdit(p); }} className="rounded-2xl font-black uppercase tracking-widest text-[10px] gap-2 border-white/40 text-white hover:bg-white hover:text-violet-600 h-12 px-6">
                    <Pencil className="h-4 w-4" /> Edit Profile
                  </Button>
                )}
              </div>
              <div className="absolute top-0 right-0 p-20 -mr-20 -mt-20 bg-white/5 rounded-full blur-3xl" />
            </DialogHeader>
            <ScrollArea className="max-h-[75vh]">
              <div className="p-10 space-y-12">
                {/* Contact Dossier Section */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                  <div className="lg:col-span-3 space-y-6">
                    <h4 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-violet-600"><Phone className="h-4 w-4" /> Contact Matrix</h4>
                    <div className="p-8 bg-slate-50 rounded-[3rem] ring-1 ring-slate-100 flex flex-col items-center text-center space-y-4">
                      <Label className="text-[10px] font-black uppercase text-slate-400">Primary Phone</Label>
                      <span className="font-mono font-black text-4xl text-slate-900 tracking-tighter">{selectedParticipant.phone}</span>
                      <Button variant="secondary" className="rounded-2xl font-bold bg-white shadow-sm gap-2 text-violet-600 border border-violet-100">
                        <MessageSquare className="h-4 w-4" /> Start WhatsApp
                      </Button>
                    </div>
                  </div>

                  <div className="lg:col-span-2 space-y-6">
                    <h4 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-slate-400"><Users className="h-4 w-4" /> Next of Kin</h4>
                    <div className="p-6 bg-violet-50 rounded-[2.5rem] border-2 border-dashed border-violet-100 space-y-4">
                      <div>
                        <Label className="text-[9px] font-black uppercase text-violet-400">Name / Relation</Label>
                        <p className="font-black text-slate-900">{selectedParticipant.nextOfKinName} <span className="font-medium text-violet-600 opacity-60">({selectedParticipant.nextOfKinRelation})</span></p>
                      </div>
                      <div>
                        <Label className="text-[9px] font-black uppercase text-violet-400">Phone</Label>
                        <p className="font-mono font-black text-lg text-slate-700">{selectedParticipant.nextOfKinPhone}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-6 bg-slate-50 rounded-[2rem] space-y-1 border border-slate-100">
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Enroll GA</p>
                        <p className="font-black text-xl text-slate-900">{selectedParticipant.gestationalAge}w</p>
                    </div>
                    <div className="p-6 bg-violet-50/50 rounded-[2rem] space-y-1 border border-violet-100">
                        <p className="text-[9px] font-black uppercase text-violet-600 tracking-widest">Current GA</p>
                        <p className="font-black text-xl text-violet-700">{calculateCurrentGA(selectedParticipant).weeks}+{calculateCurrentGA(selectedParticipant).days}w</p>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-[2rem] space-y-1 border border-slate-100">
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Enrolled By</p>
                        <p className="font-black text-xs text-slate-700 truncate">{selectedParticipant.registered_by}</p>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-[2rem] space-y-1 border border-slate-100">
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">ID Reference</p>
                        <p className="font-mono font-black text-[10px] text-slate-500 uppercase">{selectedParticipant.id.slice(0, 8)}</p>
                    </div>
                </div>

                {/* Qualitative Tracking Dossier */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-violet-600"><LayoutGrid className="h-4 w-4" /> Interview Timeline</h4>
                    <Badge className="bg-violet-600 text-white font-black text-[9px] uppercase tracking-widest px-3 py-1">Standard Protocol</Badge>
                  </div>

                  <div className="space-y-4">
                    {INTERVIEWS.map((phase) => {
                      const data = selectedParticipant[`interview${phase.num}`];
                      const status = getPhaseStatus(selectedParticipant, phase.num);
                      const isCompleted = data?.completed;
                      
                      return (
                        <div key={phase.num} className={cn(
                          "p-8 rounded-[3rem] ring-1 transition-all duration-500",
                          isCompleted ? "ring-violet-200 bg-violet-50/30" : status === 'due_now' ? "ring-violet-500 bg-violet-50 shadow-2xl shadow-violet-500/10" : "ring-slate-100 bg-white"
                        )}>
                          <div className="flex flex-col sm:flex-row items-start justify-between gap-6">
                            <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "h-8 w-8 rounded-xl flex items-center justify-center text-xs font-black",
                                        isCompleted ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-400"
                                    )}>
                                        {phase.num}
                                    </div>
                                    <div>
                                        <p className="font-black text-lg text-slate-900 leading-none">{phase.label}</p>
                                        <p className="text-[10px] font-bold text-violet-500 uppercase tracking-[0.2em] mt-1">{phase.window}</p>
                                    </div>
                                </div>
                                <div className="pt-2 pl-11">
                                    <p className="text-sm font-medium text-slate-500 italic leading-relaxed">"{phase.topic}"</p>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-3 shrink-0 self-center">
                                {isCompleted ? (
                                    <div className="text-right">
                                        <div className="flex items-center justify-end gap-2 text-violet-600 font-black uppercase text-[10px] mb-1">
                                            <CheckCircle2 className="h-4 w-4" /> Phase Complete
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Recorded by {data.recorded_by}</p>
                                        <p className="text-[10px] font-bold text-slate-400">{format(data.date?.toDate ? data.date.toDate() : new Date(), 'PPP')}</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-2 w-full sm:w-40">
                                        <Badge className={cn(
                                            "rounded-lg font-black text-[8px] uppercase tracking-widest justify-center py-1 border-none",
                                            status === 'overdue' ? "bg-rose-100 text-rose-700 animate-pulse" : 
                                            status === 'due_now' ? "bg-violet-100 text-violet-700" :
                                            "bg-slate-100 text-slate-400"
                                        )}>
                                            {status.replace('_', ' ')}
                                        </Badge>
                                        <Button 
                                            onClick={() => markInterviewComplete(selectedParticipant.id, phase.num, {
                                              ...(phase.special === 'audio_diary' ? { audio_diary_collected: true } : {}),
                                              ...(phase.special === 'photovoice' ? { photovoice_collected: true } : {}),
                                            })}
                                            className={cn(
                                              "h-10 rounded-xl font-black uppercase text-[9px] tracking-widest shadow-lg transition-all",
                                              status === 'due_now' ? "bg-violet-600 text-white shadow-violet-500/20" : "bg-slate-800 text-white"
                                            )}
                                        >
                                            Commit Phase {phase.num}
                                        </Button>
                                    </div>
                                )}
                            </div>
                          </div>

                          {phase.special === 'audio_diary' && !isCompleted && (
                            <div className="mt-6 flex items-center gap-4 bg-violet-100/50 p-5 rounded-2xl border-2 border-dashed border-violet-200">
                              <Mic className="h-6 w-6 text-violet-600 shrink-0" />
                              <div className="space-y-0.5">
                                <p className="text-xs font-black uppercase text-violet-700">Audio Diary Protocol</p>
                                <p className="text-[10px] font-medium text-violet-600 leading-tight">Must confirm transfer of the urban-climate talk recording to study server.</p>
                              </div>
                            </div>
                          )}

                          {phase.special === 'photovoice' && !isCompleted && (
                            <div className="mt-6 flex items-center gap-4 bg-violet-100/50 p-5 rounded-2xl border-2 border-dashed border-violet-200">
                              <Camera className="h-6 w-6 text-violet-600 shrink-0" />
                              <div className="space-y-0.5">
                                <p className="text-xs font-black uppercase text-violet-700">Photovoice Required</p>
                                <p className="text-[10px] font-medium text-violet-600 leading-tight">Request participant to share pregnancy/ANC photo stories.</p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function User({ className }: { className?: string }) {
  return <Users className={className} />;
}
