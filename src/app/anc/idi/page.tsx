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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
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
  Filter,
  GraduationCap,
  Briefcase,
  History,
  Activity,
  UserCheck,
  Loader2,
  Heart,
  ExternalLink
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

const IDI_FACILITIES = ['Buza Health Center', 'Temeke Regional Referral Hospital'];

const EDUCATION_LEVELS = [
  'No formal education',
  'Primary education',
  'Secondary education',
  'Higher education / University',
  'Other'
];

const INTERVIEWS = [
  { num: 1, label: 'Phase 1: Expectations', window: '18–20w GA', topic: 'Experiences & expectations.', ga_start: 18, ga_end: 20 },
  { num: 2, label: 'Phase 2: Climate & Urban', window: '28–30w GA', topic: 'Urban-climate talk (Audio Diary).', ga_start: 28, ga_end: 30, special: 'audio_diary' },
  { num: 3, label: 'Phase 3: ANC Experiences', window: '36–38w GA', topic: 'ANC stories (Photovoice).', ga_start: 36, ga_end: 38, special: 'photovoice' },
  { num: 4, label: 'Phase 4: Concluding', window: '2–4w PP', topic: 'Postpartum follow-up.', ga_start: null, ga_end: null },
];

export default function IDIRegistryPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [phaseFilter, setPhaseFilter] = useState('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
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
    name: '', age: '', phone: '', facility: '', gestationalAge: '', 
    gravidity: '', parity: '', miscarriage: '', educationLevel: '', occupation: '',
    residesInTemeke: false, consentGiven: false, notes: '',
    nextOfKinName: '', nextOfKinPhone: '', nextOfKinRelation: ''
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
    return { weeks: Math.floor(totalDays / 7), days: totalDays % 7 };
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
      return 'upcoming';
    } 
    return 'upcoming';
  };

  const filtered = useMemo(() => {
    if (!participants) return [];
    let result = participants;
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter((p: any) => p.name?.toLowerCase().includes(lower) || p.phone?.includes(lower));
    }
    if (phaseFilter !== 'all') {
      const phaseNum = parseInt(phaseFilter);
      result = result.filter((p: any) => {
        let currentActive = 1;
        for (let i = 1; i <= 4; i++) {
          if (!p[`interview${i}`]?.completed) { currentActive = i; break; }
        }
        return currentActive === phaseNum;
      });
    }
    return result;
  }, [participants, searchTerm, phaseFilter]);

  const handleRegister = async () => {
    if (!firestore) return;
    if (!form.name || !form.age || !form.phone || !form.facility || !form.gestationalAge || !form.gravidity || !form.parity) {
      toast({ title: 'Protocol Check Failed', description: 'Ensure all clinical metrics and contact data are entered.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      const dataToSave = {
        ...form,
        age: Number(form.age) || 0,
        gestationalAge: Number(form.gestationalAge) || 0,
        gravidity: Number(form.gravidity) || 0,
        parity: Number(form.parity) || 0,
        miscarriage: Number(form.miscarriage) || 0,
        updated_at: serverTimestamp()
      };

      if (editingId) {
        await updateDoc(doc(firestore, 'idi_participants', editingId), dataToSave);
        toast({ title: 'Dossier Synchronized', variant: "success" });
      } else {
        await addDoc(collection(firestore, 'idi_participants'), {
          ...dataToSave,
          registered_by: staffName,
          created_at: serverTimestamp(),
          interview1: { status: 'upcoming', completed: false },
          interview2: { status: 'upcoming', completed: false },
          interview3: { status: 'upcoming', completed: false },
          interview4: { status: 'upcoming', completed: false },
        });
        toast({ title: 'New Sub-Study Enrollment Successful', variant: "success" });
      }
      setIsRegisterOpen(false);
      setEditingId(null);
    } catch (err: any) {
      toast({ title: 'Cloud Sync Failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteParticipant = async (id: string) => {
    if (!firestore || !isAdmin) return;
    setIsDeletingId(id);
    try {
      await deleteDoc(doc(firestore, 'idi_participants', id));
      toast({ title: 'Dossier Purged', variant: "success" });
    } catch (err: any) {
      toast({ title: 'Deletion Failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsDeletingId(null);
    }
  };

  const markInterviewComplete = async (participantId: string, interviewNum: number) => {
    if (!firestore) return;
    try {
      await updateDoc(doc(firestore, 'idi_participants', participantId), {
        [`interview${interviewNum}`]: {
          status: 'completed',
          date: Timestamp.now(),
          completed: true,
          recorded_by: staffName,
        }
      });
      toast({ title: `Phase ${interviewNum} Logged`, variant: "success" });
    } catch (err: any) {
      toast({ title: 'Update Failed', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setForm({
      name: '', age: '', phone: '', facility: '', gestationalAge: '', 
      gravidity: '', parity: '', miscarriage: '', educationLevel: '', occupation: '',
      residesInTemeke: false, consentGiven: false, notes: '',
      nextOfKinName: '', nextOfKinPhone: '', nextOfKinRelation: ''
    });
    setEditingId(null);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4 pb-32 pt-2 px-2 md:px-0">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="icon" asChild className="rounded-xl h-8 w-8 bg-background shadow-sm border-none">
            <Link href="/anc/activities"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="space-y-0.5">
            <div className="text-violet-600 font-black uppercase text-[7px] tracking-widest flex items-center gap-1.5">
                <Mic className="h-2.5 w-2.5" /> Qualitative Suite
            </div>
            <h1 className="text-xl font-black tracking-tighter">IDI Registry</h1>
          </div>
        </div>
        <Button onClick={() => { resetForm(); setIsRegisterOpen(true); }} size="sm" className="h-9 px-6 rounded-xl font-black uppercase text-[9px] bg-violet-600 hover:bg-violet-700 w-full md:w-auto shadow-lg shadow-violet-500/20">
          <Plus className="h-3.5 w-3.5 mr-1.5" /> New Enrollment
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input 
            placeholder="Search Research Dossiers..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            className="pl-9 h-9 rounded-xl text-xs font-bold ring-1 ring-slate-200 border-none bg-background shadow-sm"
          />
        </div>
        <Select value={phaseFilter} onValueChange={setPhaseFilter}>
          <SelectTrigger className="h-9 rounded-xl text-[10px] font-black uppercase tracking-widest w-full sm:w-44 border-none ring-1 ring-slate-200 bg-background shadow-sm">
            <SelectValue placeholder="Protocol Phase" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Phases</SelectItem>
            {[1,2,3,4].map(n => <SelectItem key={n} value={n.toString()}>Active Phase {n}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-violet-500" />
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Mapping Qualitative Data...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center border-2 border-dashed rounded-[2rem] bg-muted/20">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Registry Entry Empty</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map((p: any) => {
              const ga = calculateCurrentGA(p);
              return (
                <Card key={p.id} className="border-none ring-1 ring-border shadow-sm rounded-2xl overflow-hidden hover:ring-violet-400 transition-all bg-card/60 backdrop-blur-sm">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-0.5">
                        <h3 className="text-sm font-black tracking-tight leading-none">{p.name}</h3>
                        <div className="flex items-center gap-2 text-[8px] font-bold text-slate-500 uppercase mt-1">
                          <Badge className="bg-violet-500/10 text-violet-700 dark:text-violet-400 h-4 px-1.5 text-[7px] font-black border-none">
                            {p.age}Y
                          </Badge>
                          <span className="truncate max-w-[120px]">{p.facility?.split(' (')[0] || 'Unknown Site'}</span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button onClick={() => setSelectedParticipant(p)} variant="secondary" size="sm" className="h-7 px-3 rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-violet-500/10">
                          Track Dossier
                        </Button>
                        <Button onClick={() => { setForm({ ...p, age: p.age?.toString(), gestationalAge: p.gestationalAge?.toString(), gravidity: p.gravidity?.toString(), parity: p.parity?.toString(), miscarriage: (p.miscarriage || 0).toString() }); setEditingId(p.id); setIsRegisterOpen(true); }} variant="secondary" size="icon" className="h-7 w-7 rounded-lg">
                          <Pencil className="h-3 w-3" />
                        </Button>
                        {isAdmin && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="secondary" size="icon" className="h-7 w-7 rounded-lg hover:bg-rose-100 hover:text-rose-600">
                                {isDeletingId === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-2xl">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="font-black text-lg">Purge Dossier?</AlertDialogTitle>
                                <AlertDialogDescription className="text-xs">
                                  Remove <span className="font-black text-foreground">{p.name}</span> from the sub-study registry? This action is permanent.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="rounded-xl text-xs h-9">Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteParticipant(p.id)} className="bg-rose-600 text-white rounded-xl text-xs h-9">
                                  Delete Permanently
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                      {[1,2,3,4].map(n => {
                        const status = getPhaseStatus(p, n);
                        return (
                          <div key={n} className={cn(
                            "h-5 rounded-md flex flex-col items-center justify-center text-[7px] font-black uppercase transition-colors",
                            status === 'completed' ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-muted text-muted-foreground/40"
                          )}>
                              <span>P{n}</span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Enrollment Dialog */}
      <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
        <DialogContent className="sm:max-w-2xl rounded-[3rem] border-none shadow-3xl p-0 overflow-hidden bg-background">
          <DialogHeader className="p-5 bg-violet-600 text-white border-b">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                    <Users className="h-5 w-5" />
                </div>
                <div>
                    <DialogTitle className="text-lg font-black tracking-tight">{editingId ? 'Edit Research Dossier' : 'New Enrollment'}</DialogTitle>
                    <DialogDescription className="text-[8px] font-bold uppercase tracking-[0.2em] text-violet-100">Sub-Study Participant Registration</DialogDescription>
                </div>
            </div>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh]">
            <div className="p-6 space-y-6">
              {/* Protocol Check-list */}
              <div className="p-4 bg-muted/20 rounded-2xl border-2 border-dashed border-muted space-y-3">
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                      <ShieldCheck className="h-3.5 w-3.5" /> Protocol Check-list
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="flex items-center space-x-2 bg-background p-2 rounded-lg shadow-sm border border-black/5">
                        <Checkbox id="age_check" checked={Number(form.age) >= 15} disabled />
                        <Label htmlFor="age_check" className="text-[9px] font-bold">Age 15+</Label>
                      </div>
                      <div className="flex items-center space-x-2 bg-background p-2 rounded-lg shadow-sm border border-black/5">
                        <Checkbox id="temeke" checked={form.residesInTemeke} onCheckedChange={v => setForm({...form, residesInTemeke: !!v})} />
                        <Label htmlFor="temeke" className="text-[9px] font-bold">Temeke Resident</Label>
                      </div>
                      <div className="flex items-center space-x-2 bg-background p-2 rounded-lg shadow-sm border border-black/5">
                        <Checkbox id="consent" checked={form.consentGiven} onCheckedChange={v => setForm({...form, consentGiven: !!v})} />
                        <Label htmlFor="consent" className="text-[9px] font-bold">Written Consent Obtained</Label>
                      </div>
                  </div>
              </div>

              {/* Personal Profile */}
              <div className="space-y-4">
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Personal Profile</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[8px] font-black uppercase">Full Name *</Label>
                      <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="h-9 text-xs rounded-lg font-bold bg-card" placeholder="Legal full name" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[8px] font-black uppercase">Age *</Label>
                          <Input type="number" value={form.age} onChange={e => setForm({...form, age: e.target.value})} className="h-9 text-xs rounded-lg font-bold bg-card" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[8px] font-black uppercase">Enroll GA *</Label>
                          <Input type="number" value={form.gestationalAge} onChange={e => setForm({...form, gestationalAge: e.target.value})} className="h-9 text-xs rounded-lg font-bold bg-card" />
                        </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[8px] font-black uppercase">Primary Contact *</Label>
                      <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="h-9 text-xs font-mono rounded-lg border-slate-200 bg-card" placeholder="e.g. 07..." />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-[8px] font-black uppercase">Facility *</Label>
                        <Select value={form.facility} onValueChange={v => setForm({...form, facility: v})}>
                        <SelectTrigger className="h-9 text-xs rounded-lg border-slate-200 font-bold bg-card"><SelectValue placeholder="Site" /></SelectTrigger>
                        <SelectContent>
                            {IDI_FACILITIES.map(f => <SelectItem key={f} value={f} className="text-xs">{f}</SelectItem>)}
                        </SelectContent>
                        </Select>
                    </div>
                  </div>
              </div>

              {/* Clinical & Social Identity */}
              <div className="space-y-4">
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Clinical & Social History</h4>
                  <div className="grid grid-cols-3 gap-3 p-4 bg-muted/20 rounded-2xl border-2 border-dashed border-muted shadow-[inset_0_0_15px_rgba(0,0,0,0.02)]">
                    <div className="space-y-1.5">
                      <Label className="text-[8px] font-black uppercase text-violet-600">Gravidity *</Label>
                      <Input type="number" value={form.gravidity} onChange={e => setForm({...form, gravidity: e.target.value})} className="h-8 text-xs rounded-lg bg-background text-center font-black" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[8px] font-black uppercase text-violet-600">Parity *</Label>
                      <Input type="number" value={form.parity} onChange={e => setForm({...form, parity: e.target.value})} className="h-8 text-xs rounded-lg bg-background text-center font-black" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[8px] font-black uppercase text-slate-400">Miscarriages</Label>
                      <Input type="number" value={form.miscarriage} onChange={e => setForm({...form, miscarriage: e.target.value})} className="h-8 text-xs rounded-lg bg-background text-center font-bold" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[8px] font-black uppercase">Education Level *</Label>
                      <Select value={form.educationLevel} onValueChange={lvl => setForm({...form, educationLevel: lvl})}>
                        <SelectTrigger className="h-9 text-xs rounded-lg border-slate-200 font-bold bg-card"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {EDUCATION_LEVELS.map(lvl => <SelectItem key={lvl} value={lvl} className="text-xs">{lvl}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[8px] font-black uppercase">Occupation</Label>
                      <Input value={form.occupation} onChange={e => setForm({...form, occupation: e.target.value})} className="h-9 text-xs rounded-lg font-bold bg-card" placeholder="e.g. Farmer" />
                    </div>
                  </div>
              </div>

              {/* Contact Dossier */}
              <div className="space-y-4">
                <h4 className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Next of Kin Dossier (Optional)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                        <Label className="text-[8px] font-black uppercase">Kin Name</Label>
                        <Input value={form.nextOfKinName} onChange={e => setForm({...form, nextOfKinName: e.target.value})} className="h-9 text-xs rounded-lg bg-card" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-[8px] font-black uppercase">Relation</Label>
                        <Input value={form.nextOfKinRelation} onChange={e => setForm({...form, nextOfKinRelation: e.target.value})} className="h-9 text-xs rounded-lg bg-card" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-[8px] font-black uppercase">Kin Phone</Label>
                        <Input value={form.nextOfKinPhone} onChange={e => setForm({...form, nextOfKinPhone: e.target.value})} className="h-9 text-xs font-mono rounded-lg bg-card" placeholder="07..." />
                    </div>
                </div>
              </div>

              <div className="space-y-1 pt-2">
                <Label className="text-[8px] font-black uppercase text-slate-400">Researcher Handover Notes</Label>
                <Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="rounded-xl border-slate-200 text-xs italic min-h-[80px] bg-card" placeholder="Specific clinical or qualitative handover context..." />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="p-5 bg-muted/20 border-t">
            <Button onClick={handleRegister} disabled={isSubmitting} className="w-full h-11 rounded-2xl font-black uppercase text-[10px] bg-violet-600 hover:bg-violet-700 shadow-xl shadow-violet-500/20">
              {isSubmitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Finalizing...</>
              ) : editingId ? 'Update Research Dossier' : 'Finalize Enrollment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dossier Dialog */}
      {selectedParticipant && (
        <Dialog open={!!selectedParticipant} onOpenChange={() => setSelectedParticipant(null)}>
          <DialogContent className="sm:max-w-4xl rounded-[4rem] border-none shadow-4xl p-0 overflow-hidden bg-background">
            <DialogHeader className="p-6 bg-violet-600 text-white border-b relative">
              <div className="flex justify-between items-start pr-8">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-3xl bg-white/20 flex items-center justify-center shadow-inner">
                        <Users className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <p className="text-[8px] font-black uppercase tracking-[0.4em] text-violet-100/70">Sub-Study Research Dossier</p>
                        <DialogTitle className="text-2xl font-black tracking-tighter leading-none my-1">{selectedParticipant.name}</DialogTitle>
                        <div className="flex items-center gap-2">
                            <Badge className="bg-white/20 text-white border-none font-black text-[9px] uppercase tracking-widest">{selectedParticipant.facility}</Badge>
                            <div className="h-1 w-1 rounded-full bg-white/40" />
                            <span className="text-[10px] font-bold text-violet-100">Age {selectedParticipant.age}</span>
                        </div>
                    </div>
                  </div>
                  <Button onClick={() => { setForm({ ...selectedParticipant, age: selectedParticipant.age?.toString(), gestationalAge: selectedParticipant.gestationalAge?.toString(), gravidity: selectedParticipant.gravidity?.toString(), parity: selectedParticipant.parity?.toString(), miscarriage: (selectedParticipant.miscarriage || 0).toString() }); setEditingId(selectedParticipant.id); setSelectedParticipant(null); setIsRegisterOpen(true); }} variant="outline" size="sm" className="h-8 px-4 rounded-xl font-black uppercase text-[8px] tracking-widest border-2 border-white/20 bg-white/10 text-white hover:bg-white/20">
                    <Pencil className="h-3 w-3 mr-1.5" /> Edit Profile
                  </Button>
              </div>
            </DialogHeader>
            <ScrollArea className="max-h-[75vh]">
              <div className="p-8 space-y-8">
                {/* Clinical Dashboard Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-4 rounded-[2rem] bg-violet-500/10 ring-1 ring-violet-500/20 flex flex-col items-center justify-center group hover:bg-violet-500/20 transition-all">
                        <Baby className="h-4 w-4 text-violet-600 mb-2 opacity-60" />
                        <p className="text-[8px] font-black uppercase text-violet-600 opacity-60 mb-1">Obstetric (G/P/M)</p>
                        <p className="text-lg font-black tracking-tighter">G{selectedParticipant.gravidity} P{selectedParticipant.parity} M{selectedParticipant.miscarriage || 0}</p>
                    </div>
                    <div className="p-4 rounded-[2rem] bg-emerald-500/5 ring-1 ring-emerald-500/20 flex flex-col items-center justify-center group hover:bg-emerald-500/10 transition-all">
                        <Timer className="h-4 w-4 text-emerald-600 mb-2 opacity-60" />
                        <p className="text-[8px] font-black uppercase text-emerald-600 opacity-60 mb-1">Current GA</p>
                        <p className="text-lg font-black tracking-tighter text-emerald-700">{calculateCurrentGA(selectedParticipant).weeks}+{calculateCurrentGA(selectedParticipant).days}w</p>
                    </div>
                    <div className="p-4 rounded-[2rem] bg-muted/30 ring-1 ring-border flex flex-col items-center justify-center group hover:bg-muted/50 transition-all">
                        <GraduationCap className="h-4 w-4 text-slate-400 mb-2" />
                        <p className="text-[8px] font-black uppercase text-slate-400 mb-1">Education</p>
                        <p className="text-[10px] font-black text-center leading-tight uppercase">{selectedParticipant.educationLevel}</p>
                    </div>
                    <div className="p-4 rounded-[2rem] bg-muted/30 ring-1 ring-border flex flex-col items-center justify-center group hover:bg-muted/50 transition-all">
                        <Briefcase className="h-4 w-4 text-slate-400 mb-2" />
                        <p className="text-[8px] font-black uppercase text-slate-400 mb-1">Occupation</p>
                        <p className="text-[10px] font-black text-center leading-tight uppercase">{selectedParticipant.occupation || 'Not Specified'}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-7 space-y-8">
                        {/* Integrated Contact Matrix */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-violet-600 flex items-center gap-2">
                                <Phone className="h-4 w-4" /> Contact Matrix
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="p-5 rounded-[2rem] border-2 border-dashed bg-card hover:bg-violet-500/[0.02] transition-colors relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                                        <Users className="h-10 w-10 text-violet-600" />
                                    </div>
                                    <p className="text-[8px] font-black uppercase text-slate-400 mb-1">Primary Phone</p>
                                    <p className="text-base font-mono font-black mb-4">{selectedParticipant.phone}</p>
                                    <Button size="sm" className="w-full h-8 rounded-xl text-[8px] font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700" asChild>
                                        <a href={`https://wa.me/${selectedParticipant.phone.replace(/\D/g, '')}`} target="_blank">
                                            Start WhatsApp <ExternalLink className="h-3 w-3 ml-2" />
                                        </a>
                                    </Button>
                                </div>
                                <div className="p-5 rounded-[2rem] border-2 border-dashed bg-card transition-colors relative overflow-hidden">
                                    <p className="text-[8px] font-black uppercase text-slate-400 mb-1">Next of Kin</p>
                                    {selectedParticipant.nextOfKinName ? (
                                        <div className="space-y-1">
                                            <p className="text-sm font-black truncate">{selectedParticipant.nextOfKinName}</p>
                                            <p className="text-[9px] font-bold text-violet-600 uppercase">{selectedParticipant.nextOfKinRelation}</p>
                                            <p className="text-xs font-mono font-bold mt-2">{selectedParticipant.nextOfKinPhone}</p>
                                        </div>
                                    ) : (
                                        <p className="text-[9px] font-bold text-slate-300 italic py-4">No next of kin data recorded.</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Interview Timeline */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-violet-600 flex items-center gap-2">
                                <History className="h-4 w-4" /> Interview Timeline
                            </h4>
                            <div className="space-y-3">
                                {INTERVIEWS.map(phase => {
                                    const status = getPhaseStatus(selectedParticipant, phase.num);
                                    const isDone = status === 'completed';
                                    const isOverdue = status === 'overdue';
                                    return (
                                        <div key={phase.num} className={cn(
                                            "p-5 rounded-[2rem] border-2 transition-all group relative overflow-hidden",
                                            isDone ? "border-emerald-500/20 bg-emerald-500/[0.03]" : isOverdue ? "border-rose-500/20 bg-rose-500/[0.03]" : "border-border/60 bg-muted/20"
                                        )}>
                                            <div className="flex justify-between items-center relative z-10">
                                                <div className="flex gap-4 items-center">
                                                    <div className={cn(
                                                        "h-10 w-10 rounded-2xl flex items-center justify-center text-xs font-black shadow-sm",
                                                        isDone ? "bg-emerald-500 text-white" : "bg-white text-slate-400"
                                                    )}>
                                                        {phase.num}
                                                    </div>
                                                    <div>
                                                        <h5 className="text-sm font-black tracking-tight">{phase.label}</h5>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{phase.window}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Badge className={cn(
                                                        "border-none font-black text-[8px] uppercase px-2 py-0.5 rounded-lg",
                                                        isDone ? "bg-emerald-100 text-emerald-700" : isOverdue ? "bg-rose-100 text-rose-700" : "bg-white text-slate-400"
                                                    )}>
                                                        {status}
                                                    </Badge>
                                                    {!isDone && (
                                                        <Button onClick={() => markInterviewComplete(selectedParticipant.id, phase.num)} size="sm" className="h-8 px-4 rounded-xl text-[8px] font-black uppercase tracking-widest bg-violet-600 shadow-md">
                                                            Commit Phase {phase.num}
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="mt-4 pl-14">
                                                <p className="text-[11px] font-medium italic text-slate-500 border-l-2 border-violet-500/20 pl-3">"{phase.topic}"</p>
                                                {phase.special === 'audio_diary' && !isDone && (
                                                    <div className="mt-3 p-3 bg-blue-50/50 rounded-xl border border-blue-100 flex items-start gap-3">
                                                        <Sparkles className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                                                        <p className="text-[10px] font-bold text-blue-800 leading-tight">Audio Diary Protocol: Must confirm transfer of the urban-climate talk recording to study server.</p>
                                                    </div>
                                                )}
                                                {phase.special === 'photovoice' && !isDone && (
                                                    <div className="mt-3 p-3 bg-amber-50/50 rounded-xl border border-amber-100 flex items-start gap-3">
                                                        <Camera className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                                                        <p className="text-[10px] font-bold text-amber-800 leading-tight">Photovoice Required: Request participant to share pregnancy/ANC photo stories.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-5 space-y-6">
                        {/* Registry Audit */}
                        <div className="p-6 rounded-[2.5rem] bg-muted/40 border ring-1 ring-border shadow-inner space-y-6">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 text-center">Registry Audit Trail</h4>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 bg-background rounded-2xl shadow-sm border border-black/5">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-primary/10 rounded-lg"><CheckCircle2 className="h-4 w-4 text-primary" /></div>
                                        <p className="text-[9px] font-black uppercase text-slate-400">Enroll GA</p>
                                    </div>
                                    <span className="text-sm font-black">{selectedParticipant.gestationalAge}w</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-background rounded-2xl shadow-sm border border-black/5">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-primary/10 rounded-lg"><UserCheck className="h-4 w-4 text-primary" /></div>
                                        <p className="text-[9px] font-black uppercase text-slate-400">Enrolled By</p>
                                    </div>
                                    <span className="text-sm font-black">{selectedParticipant.registered_by}</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-background rounded-2xl shadow-sm border border-black/5">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-primary/10 rounded-lg"><FileText className="h-4 w-4 text-primary" /></div>
                                        <p className="text-[9px] font-black uppercase text-slate-400">ID Reference</p>
                                    </div>
                                    <span className="text-[10px] font-mono font-bold text-slate-400">{selectedParticipant.id.slice(0, 8)}</span>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-dashed border-slate-200">
                                <div className="flex items-center gap-2 mb-3">
                                    <MessageSquare className="h-3.5 w-3.5 text-violet-600" />
                                    <span className="text-[9px] font-black uppercase tracking-widest">Handover Intelligence</span>
                                </div>
                                <div className="p-4 bg-background rounded-2xl text-[11px] font-medium text-slate-600 leading-relaxed italic border border-black/5">
                                    {selectedParticipant.notes ? `"${selectedParticipant.notes}"` : "No specific qualitative notes provided at time of enrollment."}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-center p-8 opacity-20 hover:opacity-100 transition-opacity">
                            <Activity className="h-6 w-6 text-violet-500 animate-pulse" />
                        </div>
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
