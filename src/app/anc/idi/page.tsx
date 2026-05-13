
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
  Loader2
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
  { num: 2, label: 'Phase 2: Climate', window: '28–30w GA', topic: 'Urban-climate talk (Audio Diary).', ga_start: 28, ga_end: 30, special: 'audio_diary' },
  { num: 3, label: 'Phase 3: ANC Exp.', window: '36–38w GA', topic: 'ANC stories (Photovoice).', ga_start: 36, ga_end: 38, special: 'photovoice' },
  { num: 4, label: 'Phase 4: Conclude', window: '2–4w PP', topic: 'Postpartum follow-up.', ga_start: null, ga_end: null },
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
    if (!form.name || !form.age || !form.phone || !form.facility || !form.gestationalAge || !form.gravidity || !form.parity || !form.educationLevel) {
      toast({ title: 'Missing Fields', description: 'Fill required demographics.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      const dataToSave = {
        ...form,
        age: parseInt(form.age),
        gestationalAge: parseInt(form.gestationalAge),
        gravidity: parseInt(form.gravidity),
        parity: parseInt(form.parity),
        miscarriage: parseInt(form.miscarriage || '0'),
      };
      if (editingId) {
        await updateDoc(doc(firestore, 'idi_participants', editingId), { ...dataToSave, updated_at: serverTimestamp() });
        toast({ title: 'Profile Updated', variant: "success" });
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
        toast({ title: 'Enrolled Successfully', variant: "success" });
      }
      setIsRegisterOpen(false);
      setEditingId(null);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
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

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 pt-2 px-2 md:px-0">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="icon" asChild className="rounded-lg h-9 w-9">
            <Link href="/anc/activities"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="space-y-0.5">
            <div className="text-violet-600 font-black uppercase text-[7px] tracking-widest">Qualitative Suite</div>
            <h1 className="text-2xl font-black tracking-tight">IDI Registry</h1>
          </div>
        </div>
        <Button onClick={() => setIsRegisterOpen(true)} size="sm" className="h-9 px-6 rounded-xl font-black uppercase text-[9px] bg-violet-600 hover:bg-violet-700 w-full md:w-auto">
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Enroll Mother
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input 
            placeholder="Search Dossiers..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            className="pl-9 h-10 rounded-xl text-xs font-bold ring-1 ring-slate-200 border-none bg-background"
          />
        </div>
        <Select value={phaseFilter} onValueChange={setPhaseFilter}>
          <SelectTrigger className="h-10 rounded-xl text-xs font-bold w-full sm:w-40 border-none ring-1 ring-slate-200">
            <SelectValue placeholder="Phase Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Phases</SelectItem>
            {[1,2,3,4].map(n => <SelectItem key={n} value={n.toString()}>Phase {n}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="py-20 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-violet-500" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-center py-20 text-xs font-bold text-slate-400">No participants matching filters.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map((p: any) => {
              const ga = calculateCurrentGA(p);
              return (
                <Card key={p.id} className="border-none ring-1 ring-slate-200 shadow-sm rounded-2xl overflow-hidden hover:ring-violet-400 transition-all bg-background">
                  <CardContent className="p-4 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-0.5">
                        <h3 className="text-sm font-black tracking-tight">{p.name}</h3>
                        <div className="flex items-center gap-2 text-[8px] font-bold text-slate-500 uppercase">
                          <Badge className="bg-violet-500/10 text-violet-700 dark:text-violet-400 h-4 px-1 text-[7px] font-black border-none">
                            {p.age}y
                          </Badge>
                          <span>{p.facility?.split(' (')[0] || 'Unknown Site'}</span>
                        </div>
                      </div>
                      <Button onClick={() => setSelectedParticipant(p)} variant="outline" size="sm" className="h-7 px-3 rounded-lg text-[8px] font-black uppercase tracking-widest border-violet-100 hover:bg-violet-500/10">
                        View Dossier
                      </Button>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                      {[1,2,3,4].map(n => {
                        const status = getPhaseStatus(p, n);
                        return (
                          <div key={n} className={cn(
                            "h-6 rounded-md flex items-center justify-center text-[8px] font-black",
                            status === 'completed' ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-muted/30 text-muted-foreground"
                          )}>P{n}</div>
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

      {/* Enroll Dialog */}
      <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
        <DialogContent className="sm:max-w-xl rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden bg-background">
          <DialogHeader className="p-5 bg-violet-500/10 border-b">
            <DialogTitle className="text-lg font-black">{editingId ? 'Edit Profile' : 'New Enrollment'}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh]">
            <div className="p-5 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-black uppercase">Full Name *</Label>
                  <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="h-9 text-xs rounded-lg border-slate-200" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-black uppercase">Contact *</Label>
                  <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="h-9 text-xs font-mono rounded-lg border-slate-200" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-black uppercase">Gravidity *</Label>
                  <Input type="number" value={form.gravidity} onChange={e => setForm({...form, gravidity: e.target.value})} className="h-9 text-xs rounded-lg border-slate-200" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-black uppercase">Parity *</Label>
                  <Input type="number" value={form.parity} onChange={e => setForm({...form, parity: e.target.value})} className="h-9 text-xs rounded-lg border-slate-200" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-black uppercase">Miscarriage</Label>
                  <Input type="number" value={form.miscarriage} onChange={e => setForm({...form, miscarriage: e.target.value})} className="h-9 text-xs rounded-lg border-slate-200" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[9px] font-black uppercase">Education Level *</Label>
                <Select value={form.educationLevel} onValueChange={v => setForm({...form, educationLevel: v})}>
                  <SelectTrigger className="h-9 text-xs rounded-lg border-slate-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EDUCATION_LEVELS.map(lvl => <SelectItem key={lvl} value={lvl}>{lvl}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[9px] font-black uppercase">Facility *</Label>
                <Select value={form.facility} onValueChange={v => setForm({...form, facility: v})}>
                  <SelectTrigger className="h-9 text-xs rounded-lg border-slate-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {IDI_FACILITIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 border-t pt-4">
                <div className="flex items-center space-x-2">
                  <Checkbox id="temeke" checked={form.residesInTemeke} onCheckedChange={v => setForm({...form, residesInTemeke: !!v})} />
                  <Label htmlFor="temeke" className="text-[10px] font-bold">Resident of Temeke</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="consent" checked={form.consentGiven} onCheckedChange={v => setForm({...form, consentGiven: !!v})} />
                  <Label htmlFor="consent" className="text-[10px] font-bold">Written Consent Obtained</Label>
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="p-5 bg-muted/10 border-t">
            <Button onClick={handleRegister} disabled={isSubmitting} className="w-full h-10 rounded-xl font-black uppercase text-[10px] bg-violet-600 hover:bg-violet-700">
              {isSubmitting ? 'Syncing...' : 'Finalize Enrollment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dossier Dialog */}
      {selectedParticipant && (
        <Dialog open={!!selectedParticipant} onOpenChange={() => setSelectedParticipant(null)}>
          <DialogContent className="sm:max-w-2xl rounded-[3rem] border-none shadow-3xl p-0 overflow-hidden bg-background">
            <DialogHeader className="p-5 bg-violet-600 text-white border-b">
              <DialogTitle className="text-xl font-black">{selectedParticipant.name}</DialogTitle>
              <p className="text-[8px] font-bold uppercase tracking-widest text-violet-100">{selectedParticipant.facility}</p>
            </DialogHeader>
            <ScrollArea className="max-h-[75vh]">
              <div className="p-5 space-y-6">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-xl bg-violet-500/10 space-y-0.5 ring-1 ring-violet-500/20">
                    <p className="text-[8px] font-black uppercase text-violet-600 dark:text-violet-400">G/P/M</p>
                    <p className="text-sm font-black">{selectedParticipant.gravidity}/{selectedParticipant.parity}/{selectedParticipant.miscarriage}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/30 space-y-0.5 ring-1 ring-border">
                    <p className="text-[8px] font-black uppercase text-muted-foreground">Current GA</p>
                    <p className="text-sm font-black">{calculateCurrentGA(selectedParticipant).weeks}+{calculateCurrentGA(selectedParticipant).days}w</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase text-violet-600 dark:text-violet-400 border-b pb-1">Phase Tracking</h4>
                  {INTERVIEWS.map(phase => {
                    const status = getPhaseStatus(selectedParticipant, phase.num);
                    const isDone = status === 'completed';
                    return (
                      <div key={phase.num} className={cn(
                        "p-4 rounded-2xl border-2 flex justify-between items-center",
                        isDone ? "border-emerald-500/10 bg-emerald-500/5" : "border-border/50 bg-muted/10"
                      )}>
                        <div>
                          <p className="text-xs font-black">{phase.label}</p>
                          <p className="text-[9px] text-muted-foreground">{phase.window}</p>
                        </div>
                        {isDone ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : (
                          <Button onClick={() => markInterviewComplete(selectedParticipant.id, phase.num)} size="sm" className="h-8 text-[8px] font-black uppercase bg-violet-600">Commit P{phase.num}</Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
