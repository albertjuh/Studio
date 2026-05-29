"use client";
import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, doc, updateDoc, Timestamp, addDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ChevronRight, Phone, Search, Download, Printer, CheckCircle2, AlertCircle, Building, Home, Users } from 'lucide-react';
import { format, startOfWeek, addDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { resolveParticipantStatuses } from '@/lib/timeline/formulas';

const RA_CONFIG: Record<string, { color: string; bg: string; border: string; text: string; location: string; icon: typeof Building }> = {
  'Riki Mahamba': { color: 'emerald', bg: 'bg-emerald-100', border: 'border-emerald-300', text: 'text-emerald-800', location: 'From Office', icon: Building },
  'Lucy': { color: 'cyan', bg: 'bg-cyan-100', border: 'border-cyan-300', text: 'text-cyan-800', location: 'From Office', icon: Building },
  'Katie': { color: 'pink', bg: 'bg-pink-100', border: 'border-pink-300', text: 'text-pink-800', location: 'From Home', icon: Home },
  'Majid': { color: 'yellow', bg: 'bg-yellow-100', border: 'border-yellow-300', text: 'text-yellow-800', location: 'From Home', icon: Home },
};

const DEFAULT_RA = { color: 'slate', bg: 'bg-slate-100', border: 'border-slate-300', text: 'text-slate-700', location: 'Unassigned', icon: Users };

const RAS = ['Riki Mahamba', 'Lucy', 'Katie', 'Majid'];

export default function Survey2CallsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [filterRA, setFilterRA] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCalled, setShowCalled] = useState(false);

  const partsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'anc_registrations'));
  }, [firestore]);

  const { data: participants, isLoading } = useCollection<any>(partsQuery);

  // Resolve statuses and filter to Survey 2 due
  const survey2Pending = useMemo(() => {
    if (!participants) return [];
    return participants
      .map((p: any) => ({ ...p, resolved: resolveParticipantStatuses(p) }))
      .filter((p: any) => p.resolved && (p.resolved.survey2_status === 'due_now' || p.resolved.survey2_status === 'due_soon'))
      .sort((a: any, b: any) => {
        const dA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const dB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return dA - dB;
      });
  }, [participants]);

  // Auto-assign RAs round-robin if not yet assigned
  const withAssignment = useMemo(() => {
    return survey2Pending.map((p: any, idx: number) => ({
      ...p,
      survey2_assigned_ra: p.survey2_assigned_ra || RAS[idx % RAS.length],
    }));
  }, [survey2Pending]);

  // Filtered list
  const filtered = useMemo(() => {
    let list = withAssignment;
    if (filterRA !== 'All') list = list.filter((p: any) => p.survey2_assigned_ra === filterRA);
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      list = list.filter((p: any) =>
        p.name?.toLowerCase().includes(s) ||
        p.participantId?.toLowerCase().includes(s) ||
        p.phoneNumber?.toString().includes(s)
      );
    }
    if (!showCalled) list = list.filter((p: any) => !p.survey2_completed);
    return list;
  }, [withAssignment, filterRA, searchTerm, showCalled]);

  // Group by RA
  const groupedByRA = useMemo(() => {
    const groups: Record<string, any[]> = {};
    RAS.forEach(ra => { groups[ra] = []; });
    filtered.forEach((p: any) => {
      const ra = p.survey2_assigned_ra || 'Unassigned';
      if (!groups[ra]) groups[ra] = [];
      groups[ra].push(p);
    });
    return groups;
  }, [filtered]);

  // Stats
  const stats = useMemo(() => {
    const total = withAssignment.length;
    const called = withAssignment.filter((p: any) => p.survey2_completed).length;
    const pending = total - called;
    return { total, called, pending };
  }, [withAssignment]);

  const [callDialog, setCallDialog] = useState<any>(null);
  const [callOutcome, setCallOutcome] = useState('contacted');
  const [deliveryStatus, setDeliveryStatus] = useState('still_pregnant');
  const [callNotes, setCallNotes] = useState('');
  const [isLogging, setIsLogging] = useState(false);

  const openCallDialog = (p: any) => {
    setCallDialog(p);
    setCallOutcome('contacted');
    setDeliveryStatus('still_pregnant');
    setCallNotes('');
  };

  const logCallOutcome = async () => {
    if (!firestore || !callDialog) return;
    setIsLogging(true);
    try {
      const participantId = callDialog.id;
      const updates: any = {
        survey2_completed: callOutcome === 'contacted',
        survey2_call_attempted: true,
        survey2_call_attempted_at: Timestamp.now(),
        survey2_call_outcome: callOutcome,
        survey2_call_notes: callNotes,
      };

      if (callOutcome === 'contacted') {
        updates.survey2_completed_at = Timestamp.now();
        updates.survey2_delivery_status = deliveryStatus;
        if (deliveryStatus === 'delivered_live' || deliveryStatus === 'delivered_stillbirth') {
          updates.delivery_date_confirmed = Timestamp.now();
          updates.delivery_outcome = deliveryStatus === 'delivered_stillbirth' ? 'stillbirth' : 'live_birth';
          updates.survey3_status = 'due_now';
        }
      }

      await updateDoc(doc(firestore, 'anc_registrations', participantId), updates);

      // Log to timeline events
      await addDoc(collection(firestore, `anc_registrations/${participantId}/timeline_events`), {
        event_type: 'phone_contact',
        timestamp: Timestamp.now(),
        notes: `Survey 2 call: ${callOutcome === 'contacted' ? 'Contacted' : 'No answer'}. ${deliveryStatus !== 'still_pregnant' ? 'Delivery: ' + deliveryStatus : ''}. ${callNotes}`,
        logged_by: 'Survey 2 Call Plan',
      });

      toast({ title: 'Call Logged', description: 'Outcome saved to participant timeline.' });
      setCallDialog(null);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsLogging(false);
    }
  };

  const exportCSV = (ra?: string) => {
    const list = ra ? groupedByRA[ra] : filtered;
    if (!list.length) return;
    const headers = ['ID', 'Name', 'Phone', 'GA', 'EDD', 'Assigned RA', 'Status', 'Called'];
    const rows = list.map((p: any) => [
      p.participantId || p.id,
      `"${p.name || ''}"`,
      Array.isArray(p.phoneNumber) ? p.phoneNumber.join(';') : p.phoneNumber || '',
      p.resolved?.currentGA || '',
      p.resolved?.edd ? format(p.resolved.edd, 'yyyy-MM-dd') : '',
      p.survey2_assigned_ra,
      p.resolved?.survey2_status,
      p.survey2_completed ? 'YES' : 'NO',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `survey2_calls_${ra || 'all'}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'MMMM d, yyyy');

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-24 lg:pb-12 px-4 md:px-0 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Link href="/anc/activities">
            <Button variant="ghost" size="icon" className="rounded-2xl"><ChevronRight className="h-4 w-4 rotate-180" /></Button>
          </Link>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Survey Operations</p>
            <h1 className="text-3xl font-black tracking-tight">Survey 2 Call Plan</h1>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">Week of {weekStart}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => window.print()} variant="outline" className="rounded-xl font-black uppercase tracking-widest text-xs gap-2 h-10"><Printer className="h-4 w-4" />Print</Button>
          <Button onClick={() => exportCSV()} className="rounded-xl font-black uppercase tracking-widest text-xs gap-2 h-10"><Download className="h-4 w-4" />Export</Button>
        </div>
      </div>

      {/* Mwana Plan Banner */}
      <Card className="border-none ring-1 ring-amber-200 bg-amber-50/50 shadow-none rounded-[2rem]">
        <CardContent className="p-5 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">This Week's Plan (from Mwana)</p>
          <p className="text-sm font-bold text-amber-900">📞 Recruitment paused — focus only on calling women for Survey 2</p>
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge className="bg-emerald-100 text-emerald-800 border-none shadow-none text-[10px] font-bold">🏢 Riki & Lucy: Office Calls</Badge>
            <Badge className="bg-pink-100 text-pink-800 border-none shadow-none text-[10px] font-bold">🏠 Katie & Majid: Home Calls</Badge>
            <Badge className="bg-amber-100 text-amber-800 border-none shadow-none text-[10px] font-bold">💳 Vouchers: Confirmed by Mwana before Monday</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-none shadow-none ring-1 ring-border rounded-[1.5rem]">
          <CardContent className="p-5">
            <p className="text-3xl font-black">{stats.total}</p>
            <p className="text-[10px] font-black uppercase tracking-widest mt-1 opacity-70">Total to Call</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-none ring-1 ring-border rounded-[1.5rem] bg-emerald-50/30">
          <CardContent className="p-5">
            <p className="text-3xl font-black text-emerald-600">{stats.called}</p>
            <p className="text-[10px] font-black uppercase tracking-widest mt-1 opacity-70">Already Called</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-none ring-1 ring-border rounded-[1.5rem] bg-amber-50/30">
          <CardContent className="p-5">
            <p className="text-3xl font-black text-amber-600">{stats.pending}</p>
            <p className="text-[10px] font-black uppercase tracking-widest mt-1 opacity-70">Pending</p>
          </CardContent>
        </Card>
      </div>

      {/* RA Workload Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {RAS.map(ra => {
          const config = RA_CONFIG[ra] || DEFAULT_RA;
          const Icon = config.icon;
          const count = groupedByRA[ra]?.length || 0;
          const calledCount = groupedByRA[ra]?.filter((p: any) => p.survey2_completed).length || 0;
          return (
            <button
              key={ra}
              onClick={() => setFilterRA(filterRA === ra ? 'All' : ra)}
              className={cn(
                "p-4 rounded-2xl text-left transition-all ring-2",
                filterRA === ra ? `${config.bg} ${config.border}` : `bg-background ${config.border}/30 hover:${config.bg}`
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <p className={cn("text-[10px] font-black uppercase tracking-widest", config.text)}>{ra.split(' ')[0]}</p>
                <Icon className={cn("h-3.5 w-3.5", config.text)} />
              </div>
              <p className={cn("text-2xl font-black", config.text)}>{count}</p>
              <p className="text-[9px] font-bold text-muted-foreground mt-1">calls · {config.location}</p>
              {calledCount > 0 && <p className="text-[9px] font-bold mt-1 text-emerald-600">✓ {calledCount} done</p>}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, ID, or phone..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-11 h-11 rounded-2xl border-none ring-1 ring-border" />
        </div>
        <Button variant={showCalled ? "default" : "outline"} onClick={() => setShowCalled(!showCalled)} className="rounded-xl font-black uppercase tracking-widest text-xs h-11">
          {showCalled ? 'Hide Called' : 'Show Called'}
        </Button>
        {filterRA !== 'All' && (
          <Button variant="outline" onClick={() => setFilterRA('All')} className="rounded-xl font-black uppercase tracking-widest text-xs h-11">Clear Filter</Button>
        )}
      </div>

      {/* Groups */}
      {isLoading ? (
        <p className="text-center py-12 font-bold text-sm text-muted-foreground">Loading participants...</p>
      ) : Object.entries(groupedByRA).every(([_, list]) => list.length === 0) ? (
        <Card className="border-none shadow-none ring-1 ring-border rounded-[2rem]">
          <CardContent className="p-16 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
            <p className="font-black text-lg">All Survey 2 calls completed!</p>
            <p className="text-sm text-muted-foreground mt-1">No pending calls this week</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {RAS.filter(ra => filterRA === 'All' || filterRA === ra).map(ra => {
            const list = groupedByRA[ra] || [];
            if (list.length === 0) return null;
            const config = RA_CONFIG[ra] || DEFAULT_RA;
            return (
              <Card key={ra} className={cn("border-none shadow-none ring-2 rounded-[2rem] overflow-hidden", config.border)}>
                <CardHeader className={cn("p-5 border-b", config.bg)}>
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <Phone className={cn("h-5 w-5", config.text)} />
                      <div>
                        <CardTitle className={cn("text-lg font-black", config.text)}>{ra}</CardTitle>
                        <CardDescription className={cn("text-[10px] font-bold uppercase tracking-widest", config.text, "opacity-70")}>
                          {list.length} calls · {config.location}
                        </CardDescription>
                      </div>
                    </div>
                    <Button onClick={() => exportCSV(ra)} variant="ghost" size="sm" className={cn("rounded-xl text-[10px] font-black uppercase tracking-widest", config.text)}>
                      <Download className="h-3 w-3 mr-1.5" />Export CSV
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {list.map((p: any, idx: number) => (
                    <div key={p.id} className={cn("p-4 flex items-center justify-between gap-4 flex-wrap", idx % 2 === 0 ? 'bg-background' : 'bg-muted/20', "border-l-4", config.border)}>
                      <Link href={`/anc/participants/${p.id}`} className="flex-1 min-w-[200px] space-y-0.5 hover:opacity-70 transition-opacity">
                        <p className="font-black text-sm">{p.name}</p>
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-[10px] font-mono font-bold text-muted-foreground">{p.participantId}</span>
                          <span className="text-[10px] font-bold text-muted-foreground">GA: {p.resolved?.currentGA || '?'}wk</span>
                          {p.resolved?.edd && <span className="text-[10px] font-bold text-muted-foreground">EDD: {format(p.resolved.edd, 'MMM d')}</span>}
                        </div>
                      </Link>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={cn("text-[9px] font-bold border-none shadow-none", p.resolved?.survey2_status === 'due_now' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700')}>
                          {p.resolved?.survey2_status === 'due_now' ? 'DUE NOW' : 'DUE SOON'}
                        </Badge>
                        <span className="text-xs font-bold font-mono text-muted-foreground">{Array.isArray(p.phoneNumber) ? p.phoneNumber[0] : p.phoneNumber}</span>
                        {p.survey2_completed ? (
                          <Badge className="bg-emerald-100 text-emerald-700 border-none shadow-none text-[9px] font-black"><CheckCircle2 className="h-2.5 w-2.5 mr-1" />Called</Badge>
                        ) : (
                          <Button size="sm" onClick={() => openCallDialog(p)} className="rounded-xl text-[10px] font-black uppercase tracking-widest h-8 px-3">Log Call</Button>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      {/* Call Outcome Dialog */}
      {callDialog && (
        <Dialog open={!!callDialog} onOpenChange={() => setCallDialog(null)}>
          <DialogContent className="sm:max-w-md rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden">
            <DialogHeader className="p-6 bg-primary/5 border-b">
              <DialogTitle className="font-black text-lg">Log Survey 2 Call</DialogTitle>
              <DialogDescription className="text-[10px] font-bold uppercase tracking-widest">{callDialog.name} · {callDialog.participantId}</DialogDescription>
            </DialogHeader>
            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest">Call Outcome *</Label>
                <RadioGroup value={callOutcome} onValueChange={setCallOutcome} className="space-y-2">
                  <div className="flex items-center gap-3 p-3 rounded-xl ring-1 ring-border cursor-pointer hover:bg-muted/30" onClick={() => setCallOutcome('contacted')}>
                    <RadioGroupItem value="contacted" id="contacted" />
                    <Label htmlFor="contacted" className="font-bold text-sm cursor-pointer flex-1">✅ Contacted — interview completed</Label>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl ring-1 ring-border cursor-pointer hover:bg-muted/30" onClick={() => setCallOutcome('no_answer')}>
                    <RadioGroupItem value="no_answer" id="no_answer" />
                    <Label htmlFor="no_answer" className="font-bold text-sm cursor-pointer flex-1">📵 No answer / unreachable</Label>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl ring-1 ring-border cursor-pointer hover:bg-muted/30" onClick={() => setCallOutcome('declined')}>
                    <RadioGroupItem value="declined" id="declined" />
                    <Label htmlFor="declined" className="font-bold text-sm cursor-pointer flex-1">❌ Declined to participate</Label>
                  </div>
                </RadioGroup>
              </div>

              {callOutcome === 'contacted' && (
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest">Pregnancy/Delivery Status *</Label>
                  <RadioGroup value={deliveryStatus} onValueChange={setDeliveryStatus} className="space-y-2">
                    <div className="flex items-center gap-3 p-3 rounded-xl ring-1 ring-border cursor-pointer hover:bg-muted/30" onClick={() => setDeliveryStatus('still_pregnant')}>
                      <RadioGroupItem value="still_pregnant" id="still_pregnant" />
                      <Label htmlFor="still_pregnant" className="font-bold text-sm cursor-pointer flex-1">🤰 Still pregnant</Label>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl ring-1 ring-emerald-200 bg-emerald-50/30 cursor-pointer hover:bg-emerald-50" onClick={() => setDeliveryStatus('delivered_live')}>
                      <RadioGroupItem value="delivered_live" id="delivered_live" />
                      <Label htmlFor="delivered_live" className="font-bold text-sm cursor-pointer flex-1">👶 Delivered — live birth</Label>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl ring-1 ring-red-200 bg-red-50/30 cursor-pointer hover:bg-red-50" onClick={() => setDeliveryStatus('delivered_stillbirth')}>
                      <RadioGroupItem value="delivered_stillbirth" id="delivered_stillbirth" />
                      <Label htmlFor="delivered_stillbirth" className="font-bold text-sm cursor-pointer flex-1">🕊️ Delivered — stillbirth</Label>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl ring-1 ring-border cursor-pointer hover:bg-muted/30" onClick={() => setDeliveryStatus('miscarriage')}>
                      <RadioGroupItem value="miscarriage" id="miscarriage" />
                      <Label htmlFor="miscarriage" className="font-bold text-sm cursor-pointer flex-1">💔 Miscarriage / pregnancy loss</Label>
                    </div>
                  </RadioGroup>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest">Notes</Label>
                <Textarea value={callNotes} onChange={e => setCallNotes(e.target.value)} placeholder="Any relevant details from the call..." className="rounded-xl" rows={3} />
              </div>
            </div>
            <DialogFooter className="p-6 pt-0 gap-2">
              <Button variant="ghost" onClick={() => setCallDialog(null)} className="rounded-xl font-bold">Cancel</Button>
              <Button onClick={logCallOutcome} disabled={isLogging} className="rounded-xl font-black uppercase tracking-widest text-xs px-6">
                {isLogging ? 'Saving...' : 'Log Outcome'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
