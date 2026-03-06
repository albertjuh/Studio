
"use client";

import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Calendar, 
  Activity, 
  Phone, 
  Baby, 
  AlertCircle,
  Clock,
  Download,
  Search,
  Filter,
  Hospital,
  ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import { type AncRegistration } from '@/types';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { useState, useMemo } from 'react';
import { calculateCurrentGA } from '@/lib/timeline/formulas';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

export default function DueTodayActionList() {
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');

  const participantsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'anc_registrations');
  }, [firestore]);

  const { data: participants, isLoading } = useCollection<AncRegistration>(participantsQuery);

  const prioritizedList = useMemo(() => {
    if (!participants) return { overdue: [], dueNow: [], likelyDelivered: [] };
    
    const overdue = participants.filter(p => p.overall_status === 'overdue');
    const dueNow = participants.filter(p => p.overall_status === 'action_needed');
    const likelyDelivered = participants.filter(p => p.delivery_status === 'likely_delivered' || p.delivery_status === 'overdue_pregnancy');

    return { overdue, dueNow, likelyDelivered };
  }, [participants]);

  const filteredItems = (list: AncRegistration[]) => {
    if (!searchTerm) return list;
    return list.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.participantId.toLowerCase().includes(searchTerm.toLowerCase()));
  };

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Activity className="h-10 w-10 animate-spin text-primary" />
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Organizing Daily Action List...</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild className="rounded-xl h-11 w-11">
                <Link href="/anc/admin/timeline"><ArrowLeft className="h-5 w-5" /></Link>
            </Button>
            <div>
                <h1 className="text-3xl font-black tracking-tighter">Daily Action List</h1>
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">{format(new Date(), 'EEEE, dd MMMM yyyy')}</p>
            </div>
        </div>
        <Button variant="outline" className="h-12 px-6 rounded-xl font-black uppercase tracking-widest border-2">
            <Download className="mr-2 h-5 w-5" /> Export for WhatsApp
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
                placeholder="Search action list..." 
                className="pl-10 h-12 rounded-2xl border-2 font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        <Button variant="outline" size="icon" className="h-12 w-12 rounded-2xl border-2">
            <Filter className="h-5 w-5" />
        </Button>
      </div>

      <ScrollArea className="h-[calc(100vh-250px)] rounded-[2.5rem] border-2 border-dashed border-muted/50 p-6">
        <div className="space-y-12">
          {/* Section: Overdue */}
          {prioritizedList.overdue.length > 0 && (
              <div className="space-y-6">
                  <div className="flex items-center gap-3">
                      <div className="h-8 w-8 bg-rose-100 rounded-lg flex items-center justify-center">
                          <AlertCircle className="h-5 w-5 text-rose-600" />
                      </div>
                      <h2 className="text-xl font-black tracking-tight uppercase tracking-widest">Immediate Priority (Overdue)</h2>
                  </div>
                  <div className="space-y-4">
                      {filteredItems(prioritizedList.overdue).map(p => (
                          <ActionCard key={p.id} participant={p} urgency="critical" />
                      ))}
                  </div>
              </div>
          )}

          {/* Section: Due Now */}
          <div className="space-y-6">
              <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <Clock className="h-5 w-5 text-emerald-600" />
                  </div>
                  <h2 className="text-xl font-black tracking-tight uppercase tracking-widest">Active Follow-up Windows</h2>
              </div>
              {filteredItems(prioritizedList.dueNow).length === 0 ? (
                  <div className="py-12 text-center bg-slate-50 border-2 border-dashed rounded-[2.5rem] text-slate-400 font-bold italic">
                      No active windows opening today.
                  </div>
              ) : (
                  <div className="space-y-4">
                      {filteredItems(prioritizedList.dueNow).map(p => (
                          <ActionCard key={p.id} participant={p} urgency="high" />
                      ))}
                  </div>
              )}
          </div>

          {/* Section: Likely Delivered */}
          {prioritizedList.likelyDelivered.length > 0 && (
              <div className="space-y-6">
                  <div className="flex items-center gap-3">
                      <div className="h-8 w-8 bg-purple-100 rounded-lg flex items-center justify-center">
                          <Baby className="h-5 w-5 text-purple-600" />
                      </div>
                      <h2 className="text-xl font-black tracking-tight uppercase tracking-widest">Postpartum Verification</h2>
                  </div>
                  <div className="space-y-4">
                      {filteredItems(prioritizedList.likelyDelivered).map(p => (
                          <ActionCard key={p.id} participant={p} urgency="medium" />
                      ))}
                  </div>
              </div>
          )}
        </div>
        <ScrollBar orientation="vertical" />
      </ScrollArea>
    </div>
  );
}

function ActionCard({ participant: p, urgency }: { participant: AncRegistration, urgency: 'critical' | 'high' | 'medium' }) {
    const enrollDate = p.createdAt?.toDate ? p.createdAt.toDate() : new Date(p.createdAt || Date.now());
    const ga = calculateCurrentGA(enrollDate, p.gestationalAge || 20);

    return (
        <Card className={cn(
            "border-none ring-1 ring-border shadow-none rounded-[2rem] overflow-hidden transition-all hover:ring-primary/40",
            urgency === 'critical' ? "bg-rose-50/30 ring-rose-100" : 
            urgency === 'high' ? "bg-emerald-50/30 ring-emerald-100" : "bg-purple-50/30 ring-purple-100"
        )}>
            <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center gap-6">
                <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-black tracking-tight">{p.name}</h3>
                        <Badge variant="outline" className="bg-white font-black text-[8px] uppercase tracking-widest px-2 border-2">
                            {p.participantId}
                        </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        <span className="flex items-center gap-1.5"><Calendar className="h-3 w-3" /> GA: {ga.weeks}+{ga.days} Wks</span>
                        <span className="flex items-center gap-1.5"><Hospital className="h-3 w-3" /> {p.healthFacility}</span>
                        <span className="flex items-center gap-1.5 font-black text-primary"><Phone className="h-3 w-3" /> RA: {p.registeredBy}</span>
                    </div>
                    <p className={cn(
                        "text-xs font-bold leading-relaxed",
                        urgency === 'critical' ? "text-rose-600" : 
                        urgency === 'high' ? "text-emerald-600" : "text-purple-600"
                    )}>
                        {urgency === 'critical' ? 'Survey window passed - immediate outreach required.' : 
                         urgency === 'high' ? 'Survey window is open - schedule contact today.' : 'EDD passed - verify delivery status & schedule S4.'}
                    </p>
                </div>
                <div className="flex gap-2 shrink-0">
                    <Button variant="outline" size="sm" className="h-10 rounded-xl font-bold border-2 bg-white" asChild>
                        <Link href={`/anc/participants/${p.id}`}><Activity className="mr-2 h-4 w-4" /> Profile</Link>
                    </Button>
                    <Button size="sm" className="h-10 rounded-xl font-bold shadow-none" asChild>
                        <Link href={`/anc/participants/${p.id}`}>Action Item <ChevronRight className="ml-2 h-4 w-4" /></Link>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
