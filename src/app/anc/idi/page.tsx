"use client";
import { useState, useMemo } from 'react';
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
import { ChevronRight, Users, Plus, Mic, Camera, Phone, CheckCircle2, Clock, AlertCircle, Search } from 'lucide-react';
import { format, addWeeks } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const IDI_FACILITIES = ['Buza Health Center', 'Temeke Regional Referral Hospital'];

const INTERVIEWS = [
  { num: 1, label: 'Interview 1', window: '18–20 weeks GA', topic: 'Current pregnancy experiences & expectations', ga_start: 18, ga_end: 20, special: null },
  { num: 2, label: 'Interview 2', window: '28–30 weeks GA', topic: 'Pregnancy in urban setting & climate change context', ga_start: 28, ga_end: 30, special: 'audio_diary' },
  { num: 3, label: 'Interview 3', window: '36–38 weeks GA', topic: 'Pregnancy & ANC experiences + Photovoice', ga_start: 36, ga_end: 38, special: 'photovoice' },
  { num: 4, label: 'Interview 4', window: '2–4 weeks postpartum', topic: 'Concluding postpartum follow-up', ga_start: null, ga_end: null, special: null },
];

export default function IDIPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: '', age: '', phone: '', facility: '', gestationalAge: '', residesInTemeke: false, consentGiven: false, notes: '', registeredBy: ''
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
    return participants.filter((p: any) => p.name?.toLowerCase().includes(lower) || p.phone?.includes(lower));
  }, [participants, searchTerm]);

  const getInterviewStatus = (participant: any, interviewNum: number) => {
    const key = `interview${interviewNum}`;
    return participant[key] || { status: 'pending', date: null, notes: '', audio_diary_collected: false, photovoice_collected: false };
  };

  const handleRegister = async () => {
    if (!firestore) return;
    if (!form.name || !form.age || !form.phone || !form.facility || !form.gestationalAge) {
      toast({ title: 'Missing Fields', description: 'Please fill all required fields.', variant: 'destructive' });
      return;
    }
    if (parseInt(form.age) < 18) {
      toast({ title: 'Not Eligible', description: 'Participant must be 18 years or above.', variant: 'destructive' });
      return;
    }
    if (!form.residesInTemeke) {
      toast({ title: 'Not Eligible', description: 'Participant must reside within Temeke municipal area.', variant: 'destructive' });
      return;
    }
    if (!form.consentGiven) {
      toast({ title: 'Consent Required', description: 'Written consent must be confirmed before registration.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      const ga = parseInt(form.gestationalAge);
      await addDoc(collection(firestore, 'idi_participants'), {
        name: form.name,
        age: parseInt(form.age),
        phone: form.phone,
        facility: form.facility,
        gestationalAge: ga,
        residesInTemeke: true,
        consentGiven: true,
        notes: form.notes,
        registeredBy: form.registeredBy || 'Unknown',
        created_at: serverTimestamp(),
        interview1: { status: ga >= 18 && ga <= 20 ? 'active' : ga < 18 ? 'upcoming' : 'overdue', date: null, notes: '', completed: false },
        interview2: { status: ga >= 28 && ga <= 30 ? 'active' : ga < 28 ? 'upcoming' : 'overdue', date: null, notes: '', audio_diary_collected: false, completed: false },
        interview3: { status: ga >= 36 && ga <= 38 ? 'active' : ga < 36 ? 'upcoming' : 'overdue', date: null, notes: '', photovoice_collected: false, completed: false },
        interview4: { status: 'upcoming', date: null, notes: '', completed: false },
      });
      toast({ title: 'IDI Participant Registered', description: `${form.name} enrolled successfully.` });
      setForm({ name: '', age: '', phone: '', facility: '', gestationalAge: '', residesInTemeke: false, consentGiven: false, notes: '', registeredBy: '' });
      setIsRegisterOpen(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
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
          ...extras
        },
        ...(interviewNum < 4 ? { [`interview${interviewNum + 1}`]: { status: 'upcoming', date: null, completed: false } } : {})
      });
      toast({ title: `Interview ${interviewNum} Completed`, description: 'Status updated successfully.' });
      setSelectedParticipant(null);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const stats = useMemo(() => {
    if (!participants) return { total: 0, i1: 0, i2: 0, i3: 0, i4: 0 };
    return {
      total: participants.length,
      i1: participants.filter((p: any) => p.interview1?.completed).length,
      i2: participants.filter((p: any) => p.interview2?.completed).length,
      i3: participants.filter((p: any) => p.interview3?.completed).length,
      i4: participants.filter((p: any) => p.interview4?.completed).length,
    };
  }, [participants]);

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-24 lg:pb-12 px-4 md:px-0 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Link href="/anc/activities">
            <Button variant="ghost" size="icon" className="rounded-2xl"><ChevronRight className="h-4 w-4 rotate-180" /></Button>
          </Link>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Qualitative Sub-Study</p>
            <h1 className="text-3xl font-black tracking-tight">IDI Registry</h1>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">In-Depth Interviews with Pregnant Women</p>
          </div>
        </div>
        <Button onClick={() => setIsRegisterOpen(true)} className="rounded-xl font-black uppercase tracking-widest text-xs gap-2 h-10">
          <Plus className="h-4 w-4" /> Enroll IDI Participant
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Enrolled', value: stats.total, color: 'bg-primary/10 text-primary' },
          { label: 'Interview 1 Done', value: stats.i1, color: 'bg-blue-50 text-blue-700' },
          { label: 'Interview 2 Done', value: stats.i2, color: 'bg-violet-50 text-violet-700' },
          { label: 'Interview 3 Done', value: stats.i3, color: 'bg-emerald-50 text-emerald-700' },
          { label: 'Interview 4 Done', value: stats.i4, color: 'bg-amber-50 text-amber-700' },
        ].map((s, i) => (
          <Card key={i} className="border-none shadow-none ring-1 ring-border rounded-[1.5rem]">
            <CardContent className={cn("p-4 rounded-[1.5rem]", s.color)}>
              <p className="text-3xl font-black">{s.value}</p>
              <p className="text-[10px] font-black uppercase tracking-widest mt-1 opacity-70">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Interview Guide */}
      <Card className="border-none shadow-none ring-1 ring-border rounded-[2rem]">
        <CardHeader className="p-6 border-b">
          <CardTitle className="text-sm font-black uppercase tracking-widest">Interview Schedule Guide</CardTitle>
          <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Four interviews across pregnancy journey</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {INTERVIEWS.map((interview) => (
              <div key={interview.num} className="p-4 rounded-2xl bg-muted/20 ring-1 ring-border space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-[9px] font-black uppercase">{interview.label}</Badge>
                  {interview.special === 'audio_diary' && <Mic className="h-3.5 w-3.5 text-violet-500" />}
                  {interview.special === 'photovoice' && <Camera className="h-3.5 w-3.5 text-emerald-500" />}
                </div>
                <p className="text-xs font-black text-primary">{interview.window}</p>
                <p className="text-[10px] text-muted-foreground font-medium leading-relaxed">{interview.topic}</p>
                {interview.special === 'audio_diary' && <Badge className="text-[8px] bg-violet-100 text-violet-700 border-none shadow-none">Audio Diary Required</Badge>}
                {interview.special === 'photovoice' && <Badge className="text-[8px] bg-emerald-100 text-emerald-700 border-none shadow-none">Photovoice Required</Badge>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by name or phone..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-11 h-12 rounded-2xl border-none ring-1 ring-border" />
      </div>

      {/* Participants */}
      <div className="space-y-4">
        {isLoading ? (
          <p className="text-center text-muted-foreground py-12 font-bold text-sm">Loading participants...</p>
        ) : filtered.length === 0 ? (
          <Card className="border-none shadow-none ring-1 ring-border rounded-[2rem]">
            <CardContent className="p-16 text-center">
              <Users className="h-12 w-12 opacity-10 mx-auto mb-4" />
              <p className="font-black text-lg">No IDI participants enrolled yet</p>
              <p className="text-sm text-muted-foreground mt-1">Click "Enroll IDI Participant" to register the first participant</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((p: any) => (
            <Card key={p.id} className="border-none shadow-none ring-1 ring-border rounded-[2rem] overflow-hidden">
              <CardContent className="p-0">
                <div className="p-6 flex items-start justify-between gap-4 flex-wrap">
                  <div className="space-y-1">
                    <p className="font-black text-lg">{p.name}</p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">{p.facility}</span>
                      <span className="text-[10px] font-bold text-muted-foreground">Age: {p.age}</span>
                      <span className="text-[10px] font-bold text-muted-foreground">GA at enrollment: {p.gestationalAge}wks</span>
                      <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{p.phone}</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setSelectedParticipant(p)} className="rounded-xl font-black text-[10px] uppercase tracking-widest h-9">
                    Manage Interviews
                  </Button>
                </div>
                {/* Interview progress */}
                <div className="grid grid-cols-4 border-t">
                  {INTERVIEWS.map((interview) => {
                    const status = getInterviewStatus(p, interview.num);
                    return (
                      <div key={interview.num} className={cn("p-4 border-r last:border-r-0 space-y-1", status.completed ? "bg-emerald-50/50" : status.status === 'active' ? "bg-primary/5" : "")}>
                        <div className="flex items-center gap-1.5">
                          {status.completed ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : status.status === 'active' ? <Clock className="h-3.5 w-3.5 text-primary" /> : <AlertCircle className="h-3.5 w-3.5 text-muted-foreground/40" />}
                          <span className="text-[9px] font-black uppercase tracking-widest">{interview.label}</span>
                        </div>
                        <p className="text-[9px] text-muted-foreground font-medium">{interview.window}</p>
                        <Badge className={cn("text-[8px] shadow-none border-none px-1.5",
                          status.completed ? "bg-emerald-100 text-emerald-700" :
                          status.status === 'active' ? "bg-primary/10 text-primary" :
                          status.status === 'overdue' ? "bg-red-100 text-red-700" :
                          "bg-muted text-muted-foreground"
                        )}>
                          {status.completed ? 'Done' : status.status === 'active' ? 'Due Now' : status.status === 'overdue' ? 'Overdue' : 'Upcoming'}
                        </Badge>
                        {interview.special === 'audio_diary' && status.completed && (
                          <p className="text-[8px] text-violet-600 font-bold">{status.audio_diary_collected ? '✓ Audio Diary' : '⚠ No Audio'}</p>
                        )}
                        {interview.special === 'photovoice' && status.completed && (
                          <p className="text-[8px] text-emerald-600 font-bold">{status.photovoice_collected ? '✓ Photovoice' : '⚠ No Photos'}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Register Dialog */}
      <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
        <DialogContent className="sm:max-w-lg rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden">
          <DialogHeader className="p-8 bg-primary/5 border-b">
            <DialogTitle className="font-black text-xl">Enroll IDI Participant</DialogTitle>
            <DialogDescription className="text-[10px] font-bold uppercase tracking-widest">In-Depth Interview Sub-Study Registration</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh]">
            <div className="p-8 space-y-5">
              {/* Eligibility notice */}
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 mb-2">Eligibility Criteria</p>
                <ul className="text-xs text-amber-800 space-y-1 font-medium">
                  <li>• Age 18 years or above</li>
                  <li>• Resides within Temeke municipal area</li>
                  <li>• Plans ANC & delivery at Buza HC or Temeke RRH</li>
                  <li>• Willing to provide written consent</li>
                </ul>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest">Full Name *</Label>
                <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Participant's full name" className="rounded-xl h-11" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest">Age *</Label>
                  <Input type="number" value={form.age} onChange={e => setForm({...form, age: e.target.value})} placeholder="Age in years" className="rounded-xl h-11" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest">GA at Enrollment (weeks) *</Label>
                  <Input type="number" value={form.gestationalAge} onChange={e => setForm({...form, gestationalAge: e.target.value})} placeholder="e.g. 18" className="rounded-xl h-11" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest">Phone Number *</Label>
                <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+255..." className="rounded-xl h-11" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest">Facility *</Label>
                <Select value={form.facility} onValueChange={v => setForm({...form, facility: v})}>
                  <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Select facility" /></SelectTrigger>
                  <SelectContent>
                    {IDI_FACILITIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest">Registered By</Label>
                <Input value={form.registeredBy} onChange={e => setForm({...form, registeredBy: e.target.value})} placeholder="RA name" className="rounded-xl h-11" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest">Notes</Label>
                <Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Any additional notes..." className="rounded-xl" rows={3} />
              </div>
              {/* Eligibility checkboxes */}
              <div className="space-y-3 p-4 bg-muted/20 rounded-2xl">
                <div className="flex items-center gap-3">
                  <Checkbox id="temeke" checked={form.residesInTemeke} onCheckedChange={v => setForm({...form, residesInTemeke: !!v})} />
                  <Label htmlFor="temeke" className="text-sm font-bold cursor-pointer">Participant resides within Temeke municipal area</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox id="consent" checked={form.consentGiven} onCheckedChange={v => setForm({...form, consentGiven: !!v})} />
                  <Label htmlFor="consent" className="text-sm font-bold cursor-pointer">Written consent has been obtained and signed</Label>
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="p-8 pt-0">
            <Button onClick={handleRegister} disabled={isSubmitting} className="w-full h-12 rounded-xl font-black uppercase tracking-widest text-xs">
              {isSubmitting ? 'Enrolling...' : 'Enroll in IDI Sub-Study'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Interviews Dialog */}
      {selectedParticipant && (
        <Dialog open={!!selectedParticipant} onOpenChange={() => setSelectedParticipant(null)}>
          <DialogContent className="sm:max-w-lg rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden">
            <DialogHeader className="p-8 bg-primary/5 border-b">
              <DialogTitle className="font-black text-xl">{selectedParticipant.name}</DialogTitle>
              <DialogDescription className="text-[10px] font-bold uppercase tracking-widest">{selectedParticipant.facility} · GA {selectedParticipant.gestationalAge}wks at enrollment</DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh]">
              <div className="p-8 space-y-4">
                {INTERVIEWS.map((interview) => {
                  const status = getInterviewStatus(selectedParticipant, interview.num);
                  return (
                    <div key={interview.num} className={cn("p-5 rounded-2xl ring-1 space-y-3", status.completed ? "ring-emerald-200 bg-emerald-50/30" : "ring-border")}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-black text-sm">{interview.label}</p>
                          <p className="text-[10px] text-muted-foreground font-bold">{interview.window} · {interview.topic}</p>
                        </div>
                        {status.completed ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <Clock className="h-5 w-5 text-muted-foreground/40" />}
                      </div>
                      {interview.special === 'audio_diary' && !status.completed && (
                        <p className="text-[10px] text-violet-600 font-black flex items-center gap-1"><Mic className="h-3 w-3" />Audio diary must be collected during this interview</p>
                      )}
                      {interview.special === 'photovoice' && !status.completed && (
                        <p className="text-[10px] text-emerald-600 font-black flex items-center gap-1"><Camera className="h-3 w-3" />Photovoice materials must be collected during this interview</p>
                      )}
                      {!status.completed && (
                        <Button size="sm" onClick={() => markInterviewComplete(selectedParticipant.id, interview.num, {
                          ...(interview.special === 'audio_diary' ? { audio_diary_collected: true } : {}),
                          ...(interview.special === 'photovoice' ? { photovoice_collected: true } : {}),
                        })} className="w-full rounded-xl font-black text-[10px] uppercase tracking-widest h-9">
                          Mark {interview.label} Complete
                        </Button>
                      )}
                      {status.completed && status.date && (
                        <p className="text-[10px] text-emerald-700 font-bold">Completed: {format(status.date.toDate ? status.date.toDate() : new Date(status.date), 'PPP')}</p>
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
