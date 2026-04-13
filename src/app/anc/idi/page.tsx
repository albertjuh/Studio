
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, addDoc, updateDoc, doc, serverTimestamp, Timestamp } from 'firebase/firestore';
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
  ArrowLeft
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Link from 'next/link';

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
  const [staffName, setStaffName] = useState('Study RA');

  useEffect(() => {
    const userStr = localStorage.getItem('ancUser');
    if (userStr) setStaffName(JSON.parse(userStr).name);
  }, []);

  // Form state
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
    nextOfKinPhone: ''
  });

  const idiQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'idi_participants'), orderBy('created_at', 'desc'));
  }, [firestore]);

  const { data: participants, isLoading } = useCollection<any>(idiQuery);

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
    if (!form.name || !form.age || !form.phone || !form.facility || !form.gestationalAge || !form.nextOfKinName || !form.nextOfKinPhone) {
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
      const ga = parseInt(form.gestationalAge);
      await addDoc(collection(firestore, 'idi_participants'), {
        ...form,
        age: parseInt(form.age),
        gestationalAge: ga,
        registered_by: staffName,
        created_at: serverTimestamp(),
        // Initialize interview tracking
        interview1: { status: ga >= 18 && ga <= 20 ? 'active' : 'upcoming', completed: false },
        interview2: { status: 'upcoming', completed: false, audio_diary_collected: false },
        interview3: { status: 'upcoming', completed: false, photovoice_collected: false },
        interview4: { status: 'upcoming', completed: false },
      });
      toast({ title: 'Recruitment Successful', description: `${form.name} enrolled in IDI sub-study.`, variant: "success" });
      setIsRegisterOpen(false);
      setForm({ name: '', age: '', phone: '', facility: '', gestationalAge: '', residesInTemeke: false, consentGiven: false, notes: '', nextOfKinName: '', nextOfKinPhone: '' });
    } catch (err: any) {
      toast({ title: 'Registration Failed', description: err.message, variant: 'destructive' });
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
        },
        // Open next phase if available
        ...(interviewNum < 4 ? { [`interview${interviewNum + 1}`]: { status: 'active', completed: false } } : {})
      });
      toast({ title: `Phase ${interviewNum} Logged`, description: 'Interview series updated.', variant: "success" });
      setSelectedParticipant(null);
    } catch (err: any) {
      toast({ title: 'Update Failed', description: err.message, variant: 'destructive' });
    }
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
        <Button onClick={() => setIsRegisterOpen(true)} className="h-12 px-8 rounded-xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 gap-2 bg-primary hover:bg-primary/90">
          <Plus className="h-5 w-5" /> Enroll IDI Mother
        </Button>
      </div>

      <div className="px-4 md:px-0 space-y-6">
        <Card className="border-none ring-1 ring-border shadow-none rounded-[2.5rem] bg-muted/20 overflow-hidden">
          <CardHeader className="bg-white/50 border-b p-8">
            <CardTitle className="text-sm font-black uppercase tracking-widest">Protocol Reference</CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase">Four encounters addressing pregnancy journey and climate context.</CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {INTERVIEWS.map((phase) => (
                <div key={phase.num} className="p-5 rounded-3xl bg-white ring-1 ring-black/5 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-[9px] font-black uppercase tracking-tighter">Phase {phase.num}</Badge>
                    {phase.special === 'audio_diary' && <Mic className="h-3.5 w-3.5 text-violet-500" />}
                    {phase.special === 'photovoice' && <Camera className="h-3.5 w-3.5 text-emerald-500" />}
                  </div>
                  <p className="text-xs font-black text-primary leading-tight">{phase.label}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{phase.window}</p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed italic line-clamp-2">"{phase.topic}"</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

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
            filtered.map((p: any) => (
              <Card key={p.id} className="border-none ring-1 ring-border shadow-none rounded-[2.5rem] overflow-hidden group hover:ring-primary/40 transition-all duration-300">
                <CardContent className="p-0">
                  <div className="p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="text-2xl font-black tracking-tight">{p.name}</h3>
                        <Badge className="bg-primary/5 text-primary border-none text-[10px] font-black">Age {p.age}</Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        <span className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {p.phone}</span>
                        <span className="flex items-center gap-1.5"><LayoutGrid className="h-3 w-3" /> {p.facility}</span>
                        <span className="flex items-center gap-1.5"><Calendar className="h-3 w-3" /> GA at enroll: {p.gestationalAge}w</span>
                        {p.nextOfKinName && (
                          <span className="flex items-center gap-1.5 text-primary/60"><Users className="h-3 w-3" /> KIN: {p.nextOfKinName}</span>
                        )}
                      </div>
                    </div>
                    <Button onClick={() => setSelectedParticipant(p)} variant="outline" className="h-12 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest border-2">
                      Track Interviews <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-4 border-t divide-x">
                    {[1, 2, 3, 4].map(num => {
                      const phase = p[`interview${num}`];
                      const config = INTERVIEWS[num-1];
                      return (
                        <div key={num} className={cn(
                          "p-6 space-y-2 transition-colors",
                          phase?.completed ? "bg-emerald-50/30" : phase?.status === 'active' ? "bg-primary/[0.02]" : "bg-muted/10"
                        )}>
                          <div className="flex items-center gap-2">
                            {phase?.completed ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : phase?.status === 'active' ? <Clock className="h-4 w-4 text-primary animate-pulse" /> : <AlertCircle className="h-4 w-4 text-muted-foreground/30" />}
                            <span className="text-[10px] font-black uppercase tracking-tighter">Phase {num}</span>
                          </div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter leading-none">{config.window}</p>
                          <Badge className={cn(
                            "text-[8px] font-black px-2 py-0 border-none shadow-none uppercase",
                            phase?.completed ? "bg-emerald-100 text-emerald-700" : phase?.status === 'active' ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                          )}>
                            {phase?.completed ? 'Done' : phase?.status === 'active' ? 'Due Now' : 'Upcoming'}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Enrollment Dialog */}
      <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
        <DialogContent className="sm:max-w-lg rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden">
          <DialogHeader className="p-8 bg-primary/5 border-b">
            <DialogTitle className="text-2xl font-black tracking-tight">Enroll IDI Mother</DialogTitle>
            <DialogDescription className="text-[10px] font-bold uppercase tracking-widest">In-Depth Interview Sub-Study Recruitment</DialogDescription>
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
                    <Label className="text-[10px] font-black uppercase tracking-widest">Next of Kin Phone *</Label>
                    <Input value={form.nextOfKinPhone} onChange={e => setForm({...form, nextOfKinPhone: e.target.value})} placeholder="+255..." className="h-12 rounded-xl border-2 font-mono font-bold" />
                  </div>
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
              {isSubmitting ? 'Registering...' : 'Confirm IDI Enrollment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tracking Dialog */}
      {selectedParticipant && (
        <Dialog open={!!selectedParticipant} onOpenChange={() => setSelectedParticipant(null)}>
          <DialogContent className="sm:max-w-lg rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden">
            <DialogHeader className="p-8 bg-primary/5 border-b">
              <DialogTitle className="text-2xl font-black tracking-tight">{selectedParticipant.name}</DialogTitle>
              <DialogDescription className="text-[10px] font-bold uppercase tracking-widest"> Series: {selectedParticipant.facility} · GA {selectedParticipant.gestationalAge}w at enroll</DialogDescription>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[9px] font-black uppercase text-muted-foreground">
                <span>Phone: {selectedParticipant.phone}</span>
                {selectedParticipant.nextOfKinName && (
                  <span className="text-primary">Next of Kin: {selectedParticipant.nextOfKinName} ({selectedParticipant.nextOfKinPhone})</span>
                )}
              </div>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh]">
              <div className="p-8 space-y-4">
                {INTERVIEWS.map((phase) => {
                  const data = selectedParticipant[`interview${phase.num}`];
                  return (
                    <div key={phase.num} className={cn(
                      "p-6 rounded-3xl ring-1 transition-all space-y-4",
                      data?.completed ? "ring-emerald-200 bg-emerald-50/30" : "ring-border"
                    )}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-black text-sm text-primary">Phase {phase.num}: {phase.label}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{phase.window}</p>
                        </div>
                        {data?.completed ? <CheckCircle2 className="h-6 w-6 text-emerald-600" /> : <Clock className="h-6 w-6 text-muted-foreground/20" />}
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
                          className="w-full h-12 rounded-xl font-black uppercase text-[10px] tracking-widest bg-primary"
                        >
                          Complete Phase {phase.num}
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
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
