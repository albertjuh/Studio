
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
  Target
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

  const filtered = useMemo(() => {
    if (!participants) return [];
    if (!searchTerm) return participants;
    const lower = searchTerm.toLowerCase();
    return participants.filter((p: any) => 
      p.name?.toLowerCase().includes(lower) || 
      p.phone?.includes(lower)
    );
  }, [participants, searchTerm]);

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
    <div className="max-w-6xl mx-auto space-y-8 pb-24 pt-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-4 md:px-0">
        <div className="flex items-center gap-4">
          <Button variant="secondary" size="icon" asChild className="rounded-xl h-11 w-11">
            <Link href="/anc/activities"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-[9px] mb-1">
              <ShieldCheck className="h-4 w-4" /> Qualitative Sub-Study
            </div>
            <h1 className="text-4xl font-black tracking-tighter">IDI Registry</h1>
            <p className="text-sm font-medium text-muted-foreground">Tracking in-depth interviews across four clinical phases.</p>
          </div>
        </div>
        <Button onClick={() => { setEditingId(null); setIsRegisterOpen(true); }} className="h-12 px-8 rounded-xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 gap-2 bg-primary hover:bg-primary/90">
          <Plus className="h-5 w-5" /> Enroll IDI Mother
        </Button>
      </div>

      <div className="px-4 md:px-0 space-y-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search IDI registry by name or phone..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            className="pl-12 h-14 rounded-2xl border-none ring-1 ring-border shadow-sm focus:ring-primary/40 bg-white"
          />
        </div>

        <div className="space-y-4">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4 text-muted-foreground">
              <Clock className="h-8 w-8 animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-widest">Synchronizing Registry...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-32 text-center border-2 border-dashed rounded-[3rem] space-y-4">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/20" />
              <p className="text-sm font-bold text-muted-foreground italic">No IDI mothers enrolled matching your search.</p>
            </div>
          ) : (
            filtered.map((p: any) => {
              const currentGA = calculateCurrentGA(p);
              return (
                <Card key={p.id} className="border-none ring-1 ring-border shadow-none rounded-[2.5rem] overflow-hidden group hover:ring-primary/40 transition-all duration-300">
                  <CardContent className="p-0">
                    <div className="p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <h3 className="text-2xl font-black tracking-tight">{p.name}</h3>
                          <Badge className="bg-primary/5 text-primary border-none text-[10px] font-black">Age {p.age}</Badge>
                          <Badge variant="outline" className="border-primary/20 text-primary font-black text-[10px] gap-1.5 px-3">
                            <Baby className="h-3 w-3" /> Current GA: {currentGA.weeks}+{currentGA.days}w
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                          <span className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {p.phone}</span>
                          <span className="flex items-center gap-1.5"><LayoutGrid className="h-3 w-3" /> {p.facility}</span>
                          <span className="flex items-center gap-1.5"><Timer className="h-3 w-3" /> Enroll GA: {p.gestationalAge}w</span>
                          {p.nextOfKinName && (
                            <span className="flex items-center gap-1.5 text-primary/60"><Users className="h-3 w-3" /> KIN: {p.nextOfKinName} ({p.nextOfKinRelation || 'Relative'})</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 shrink-0">
                        {isAdmin && (
                          <div className="flex items-center gap-1 mr-2 px-2 border-r border-dashed">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(p)} className="h-10 w-10 rounded-xl text-slate-400 hover:text-primary hover:bg-primary/5">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="rounded-[2.5rem]">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="font-black text-2xl tracking-tight">Purge IDI Record?</AlertDialogTitle>
                                  <AlertDialogDescription className="font-medium">Permanently remove <span className="text-foreground font-extrabold">{p.name}</span> from the sub-study registry. This cannot be undone.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="rounded-xl font-bold">Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteParticipant(p.id)} className="bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700">Confirm Purge</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
                        <Button onClick={() => setSelectedParticipant(p)} variant="outline" className="h-12 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest border-2">
                          Track Interviews <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 border-t divide-x">
                      {[1, 2, 3, 4].map(num => {
                        const phaseData = p[`interview${num}`];
                        const status = getPhaseStatus(p, num);
                        const config = INTERVIEWS[num-1];
                        
                        const statusColors = {
                          completed: "bg-emerald-100 text-emerald-700",
                          overdue: "bg-rose-100 text-rose-700 animate-pulse",
                          due_now: "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20",
                          due_soon: "bg-blue-100 text-blue-700",
                          upcoming: "bg-muted text-muted-foreground"
                        };

                        return (
                          <div key={num} className={cn(
                            "p-6 space-y-2 transition-colors",
                            status === 'due_now' ? "bg-emerald-50/50" : status === 'overdue' ? "bg-rose-50/30" : "bg-transparent"
                          )}>
                            <div className="flex items-center gap-2">
                              {status === 'completed' ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : status === 'overdue' ? <AlertCircle className="h-4 w-4 text-rose-600" /> : <Clock className="h-4 w-4 text-muted-foreground/30" />}
                              <span className="text-[10px] font-black uppercase tracking-tighter">Phase {num}</span>
                            </div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter leading-none">{config.window}</p>
                            <Badge className={cn(
                              "text-[8px] font-black px-2 py-0.5 border-none shadow-none uppercase",
                              statusColors[status as keyof typeof statusColors]
                            )}>
                              {status.replace('_', ' ')}
                            </Badge>
                          </div>
                        );
                      })}
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
        <DialogContent className="sm:max-w-lg rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden">
          <DialogHeader className="p-8 bg-primary/5 border-b">
            <DialogTitle className="text-2xl font-black tracking-tight">{editingId ? 'Correct IDI Profile' : 'Enroll IDI Mother'}</DialogTitle>
            <DialogDescription className="text-[10px] font-bold uppercase tracking-widest">{editingId ? 'Updating clinical baseline' : 'In-Depth Interview Sub-Study Recruitment'}</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh]">
            <div className="p-8 space-y-6">
              <div className="p-5 bg-amber-50 rounded-2xl border border-amber-100 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Recruitment Criteria</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Checkbox id="age_check" checked={parseInt(form.age) >= 18} disabled />
                    <Label className="text-xs font-bold">Participant is 18 years or above</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Checkbox id="temeke" checked={form.residesInTemeke} onCheckedChange={v => setForm({...form, residesInTemeke: !!v})} />
                    <Label htmlFor="temeke" className="text-xs font-bold cursor-pointer">Resides within Temeke municipal area</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Checkbox id="consent" checked={form.consentGiven} onCheckedChange={v => setForm({...form, consentGiven: !!v})} />
                    <Label htmlFor="consent" className="text-xs font-bold cursor-pointer">Willing to provide written consent</Label>
                  </div>
                </div>
              </div>

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
                    <Label className="text-[10px] font-black uppercase tracking-widest">GA at Enrollment *</Label>
                    <Input type="number" value={form.gestationalAge} onChange={e => setForm({...form, gestationalAge: e.target.value})} placeholder="Weeks" className="h-12 rounded-xl border-2 font-medium" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest">Phone Number *</Label>
                  <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+255..." className="h-12 rounded-xl border-2 font-mono font-bold" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest">Next of Kin Name *</Label>
                    <Input value={form.nextOfKinName} onChange={e => setForm({...form, nextOfKinName: e.target.value})} placeholder="Full name" className="h-12 rounded-xl border-2 font-medium" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest">Relation to Kin *</Label>
                    <Input value={form.nextOfKinRelation} onChange={e => setForm({...form, nextOfKinRelation: e.target.value})} placeholder="e.g. Husband, Mother" className="h-12 rounded-xl border-2 font-medium" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest">Next of Kin Phone *</Label>
                  <Input value={form.nextOfKinPhone} onChange={e => setForm({...form, nextOfKinPhone: e.target.value})} placeholder="+255..." className="h-12 rounded-xl border-2 font-mono font-bold" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest">Facility *</Label>
                  <Select value={form.facility} onValueChange={v => setForm({...form, facility: v})}>
                    <SelectTrigger className="h-12 rounded-xl border-2 font-medium">
                      <SelectValue placeholder="Select facility" />
                    </SelectTrigger>
                    <SelectContent>
                      {IDI_FACILITIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest">Notes</Label>
                  <Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Recruitment context..." className="rounded-xl border-2 italic" rows={3} />
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="p-8 pt-0">
            <Button onClick={handleRegister} disabled={isSubmitting} className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20">
              {isSubmitting ? 'Processing...' : editingId ? 'Commit Profile Update' : 'Confirm IDI Enrollment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tracking / Detail Dialog */}
      {selectedParticipant && (
        <Dialog open={!!selectedParticipant} onOpenChange={() => setSelectedParticipant(null)}>
          <DialogContent className="sm:max-w-2xl rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden">
            <DialogHeader className="p-8 bg-primary/5 border-b">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-6">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Sub-Study Participant Profile</p>
                  <DialogTitle className="text-3xl font-black tracking-tight">{selectedParticipant.name}</DialogTitle>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <Badge variant="outline" className="bg-background font-bold text-[10px] uppercase border-2">{selectedParticipant.facility}</Badge>
                    <Badge className="bg-primary/10 text-primary border-none text-[10px] font-black">Age {selectedParticipant.age}</Badge>
                  </div>
                </div>
                {isAdmin && (
                  <Button variant="secondary" onClick={() => { const p = selectedParticipant; setSelectedParticipant(null); openEdit(p); }} className="rounded-xl font-bold gap-2">
                    <Pencil className="h-4 w-4" /> Edit Profile
                  </Button>
                )}
              </div>
            </DialogHeader>
            <ScrollArea className="max-h-[75vh]">
              <div className="p-8 space-y-8">
                {/* Detailed Bio Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest flex items-center gap-2"><Phone className="h-4 w-4 text-primary" /> Contact Intelligence</h4>
                    <div className="p-6 bg-emerald-50/50 rounded-3xl ring-1 ring-emerald-100/50">
                      <label className="text-[10px] font-black uppercase text-emerald-700 block mb-3">Primary Phone</label>
                      <span className="font-mono font-black text-2xl text-emerald-900">{selectedParticipant.phone}</span>
                    </div>
                    <div className="p-6 bg-slate-50/50 rounded-3xl ring-1 ring-slate-100">
                      <label className="text-[10px] font-black uppercase text-slate-500 block mb-3">Next of Kin: {selectedParticipant.nextOfKinName} ({selectedParticipant.nextOfKinRelation})</label>
                      <p className="font-mono font-bold text-slate-600 text-lg">{selectedParticipant.nextOfKinPhone}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> Study Context</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-4 bg-muted/20 rounded-2xl space-y-1">
                        <p className="text-[9px] font-black uppercase text-muted-foreground">Enroll GA</p>
                        <p className="font-extrabold text-sm">{selectedParticipant.gestationalAge} Weeks</p>
                      </div>
                      <div className="p-4 bg-muted/20 rounded-2xl space-y-1">
                        <p className="text-[9px] font-black uppercase text-muted-foreground">Current GA</p>
                        <p className="font-extrabold text-sm">{calculateCurrentGA(selectedParticipant).weeks}+{calculateCurrentGA(selectedParticipant).days}w</p>
                      </div>
                    </div>
                    <div className="p-5 bg-muted/20 rounded-2xl space-y-1">
                      <p className="text-[9px] font-black uppercase text-muted-foreground">Enrolled By</p>
                      <p className="font-extrabold text-primary flex items-center gap-2"><Users className="h-4 w-4" />{selectedParticipant.registered_by}</p>
                    </div>
                  </div>
                </div>

                <Separator className="border-dashed" />

                {/* Tracking Timeline */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-widest flex items-center gap-2"><LayoutGrid className="h-4 w-4 text-primary" /> Interview Series Tracking</h4>
                  {INTERVIEWS.map((phase) => {
                    const data = selectedParticipant[`interview${phase.num}`];
                    const status = getPhaseStatus(selectedParticipant, phase.num);
                    
                    return (
                      <div key={phase.num} className={cn(
                        "p-6 rounded-3xl ring-1 transition-all space-y-4",
                        data?.completed ? "ring-emerald-200 bg-emerald-50/30" : status === 'due_now' ? "ring-emerald-500 bg-emerald-50/50" : "ring-border"
                      )}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-black text-sm text-primary">Phase {phase.num}: {phase.label}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{phase.window}</p>
                          </div>
                          {data?.completed ? <CheckCircle2 className="h-6 w-6 text-emerald-600" /> : status === 'overdue' ? <AlertCircle className="h-6 w-6 text-rose-600" /> : <Clock className="h-6 w-6 text-muted-foreground/20" />}
                        </div>
                        
                        <div className="p-4 bg-muted/20 rounded-2xl border-2 border-dashed">
                          <p className="text-[10px] text-muted-foreground leading-relaxed font-medium italic">"{phase.topic}"</p>
                        </div>

                        {phase.special === 'audio_diary' && !data?.completed && (
                          <div className="flex items-center gap-2 text-violet-600 bg-violet-50 p-3 rounded-xl border border-violet-100">
                            <Mic className="h-4 w-4 shrink-0" />
                            <span className="text-[10px] font-black uppercase">Phase requires Audio Diary collection</span>
                          </div>
                        )}

                        {phase.special === 'photovoice' && !data?.completed && (
                          <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                            <Camera className="h-4 w-4 shrink-0" />
                            <span className="text-[10px] font-black uppercase">Phase requires Photovoice sharing</span>
                          </div>
                        )}

                        {!data?.completed && (
                          <Button 
                            onClick={() => markInterviewComplete(selectedParticipant.id, phase.num, {
                              ...(phase.special === 'audio_diary' ? { audio_diary_collected: true } : {}),
                              ...(phase.special === 'photovoice' ? { photovoice_collected: true } : {}),
                            })}
                            className={cn(
                              "w-full h-12 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all",
                              status === 'due_now' ? "bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20" : status === 'overdue' ? "bg-rose-600 hover:bg-rose-700" : "bg-primary"
                            )}
                          >
                            Complete Phase {phase.num} {status === 'overdue' ? '(Overdue)' : ''}
                          </Button>
                        )}

                        {data?.completed && (
                          <div className="flex justify-between items-center text-[10px] font-black text-emerald-700 uppercase">
                            <span>Recorded: {format(data.date?.toDate ? data.date.toDate() : new Date(data.date), 'PPP')}</span>
                            <span>RA: {data.recorded_by}</span>
                          </div>
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

function Separator({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-border", className)} />;
}
