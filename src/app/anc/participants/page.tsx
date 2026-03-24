
"use client";

import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, ChevronRight, Activity, Baby, ChevronDown, Phone } from 'lucide-react';
import { format } from 'date-fns';
import { type AncRegistration } from '@/types';
import Link from 'next/link';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { resolveParticipantStatuses } from '@/lib/timeline/formulas';
import { IdBadge } from '@/app/anc/components/id-badge';

export default function ParticipantTimelineList() {
  const firestore = useFirestore();
  const { user: fbUser } = useUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusStatusFilter] = useState('all');
  const [displayLimit, setDisplayLimit] = useState(10);

  // Queries are authentication-aware to prevent Internal Server Errors
  const participantsQuery = useMemoFirebase(() => {
    if (!firestore || !fbUser) return null;
    return collection(firestore, 'anc_registrations');
  }, [firestore, fbUser]);

  const { data: participants, isLoading } = useCollection<AncRegistration>(participantsQuery);

  const filteredParticipants = useMemo(() => {
    if (!participants) return { visible: [], total: 0 };
    
    const resolved = participants.map(p => resolveParticipantStatuses(p));

    const sorted = resolved.sort((a, b) => {
        const dateA = (a.createdAt as any)?.toDate ? ((a.createdAt as any).toDate()) : new Date(a.createdAt || 0);
        const dateB = (b.createdAt as any)?.toDate ? ((b.createdAt as any).toDate()) : new Date(b.createdAt || 0);
        return dateB.getTime() - dateA.getTime();
    });

    const filtered = sorted.filter(p => {
      const lower = searchTerm.toLowerCase();
      const matchesSearch = p.name?.toLowerCase()?.includes(lower) || 
                           p.participantId?.toLowerCase()?.includes(lower) ||
                           (Array.isArray(p.phoneNumber) 
                               ? p.phoneNumber.some((num: string) => num?.includes(searchTerm)) 
                               : (p.phoneNumber as string)?.includes(searchTerm));
      const matchesStatus = statusFilter === 'all' || p.overall_status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    return {
        visible: filtered.slice(0, displayLimit),
        total: filtered.length
    };
  }, [participants, searchTerm, statusFilter, displayLimit]);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'overdue': return { label: 'Overdue', color: 'bg-rose-500', text: 'text-rose-600', bg: 'bg-rose-50' };
      case 'action_needed': return { label: 'Due Now', color: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50' };
      case 'likely_delivered': return { label: 'Likely Delivered', color: 'bg-purple-500', text: 'text-purple-600', bg: 'bg-purple-50' };
      default: return { label: 'On Track', color: 'bg-blue-500', text: 'text-blue-600', bg: 'bg-blue-50' };
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-[10px] mb-1">
            <Baby className="h-4 w-4" /> Global Cohort Timeline
          </div>
          <div className="flex items-center gap-4">
            <h1 className="text-4xl font-black tracking-tighter">Participants</h1>
            {!isLoading && participants && (
              <Badge variant="outline" className="h-8 px-3 rounded-xl border-2 font-black text-sm bg-primary/5 text-primary border-primary/20">
                {participants.length} Total Enrolled
              </Badge>
            )}
          </div>
          <p className="text-sm font-medium text-muted-foreground">Monitor pregnancy progression and study windows across the entire cohort.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name, ID or phone..." 
              className="pl-10 h-12 rounded-2xl border-2"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon" className="h-12 w-12 rounded-2xl border-2">
            <Filter className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1 pt-4">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4">
            <Activity className="h-10 w-10 animate-spin text-primary" />
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Mapping Timeline...</p>
          </div>
        ) : filteredParticipants.visible.length === 0 ? (
          <div className="py-32 text-center text-muted-foreground border-2 border-dashed rounded-[3rem] font-bold italic">
            No participants found matching your criteria.
          </div>
        ) : (
          <>
            {filteredParticipants.visible.map((p) => {
              const status = getStatusConfig(p.overall_status || 'on_track');
              const ga = p.current_ga;
              const edd = p.edd;
              const progress = Math.min(100, (ga.weeks / 40) * 100);
              
              return (
                <Link key={p.id} href={`/anc/participants/${p.id}`} className="group">
                  <Card className="border-none ring-1 ring-border shadow-none rounded-[2rem] overflow-hidden transition-all duration-300 group-hover:ring-primary/40 group-hover:translate-x-1">
                    <CardContent className="p-0">
                      <div className="flex flex-col md:flex-row md:items-center p-6 gap-6">
                        <div className="flex-1 space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Badge className={cn("rounded-lg font-black text-[9px] uppercase tracking-widest px-2", status.text, status.bg)}>
                                {status.label}
                              </Badge>
                              <IdBadge id={p.participantId} hideLabel />
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">EDD: {format(edd, 'dd MMM yy')}</span>
                          </div>
                          
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-xl font-black tracking-tight">{p.name}</h3>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">RA: {p.registeredBy} • {p.healthFacility}</p>
                            </div>
                            <div className="bg-primary/5 px-4 py-2 rounded-xl flex items-center gap-2">
                                <Phone className="h-3.5 w-3.5 text-primary" />
                                <span className="font-mono text-xs font-black text-primary">
                                    {Array.isArray(p.phoneNumber) ? p.phoneNumber[0] : p.phoneNumber}
                                </span>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between items-end text-[10px] font-black uppercase tracking-widest">
                              <span className="text-primary">{ga.weeks}+{ga.days} Wks Gestation</span>
                              <span className="text-slate-400">Trimester {p.current_trimester}</span>
                            </div>
                            <Progress value={progress} className="h-2 rounded-full" />
                          </div>
                        </div>

                        <div className="flex items-center gap-4 md:pl-6 md:border-l border-dashed shrink-0">
                          <div className="grid grid-cols-4 gap-2">
                            {[1, 2, 3, 4].map(s => {
                              const isDone = s === 1 || (p as any)[`survey${s}_completed`];
                              return (
                                <div key={s} className="flex flex-col items-center gap-1">
                                  <div className={cn(
                                    "h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-black",
                                    isDone ? "bg-primary text-white" : "bg-slate-100 text-slate-400"
                                  )}>
                                    S{s}
                                  </div>
                                  <span className={cn("text-[8px] font-bold uppercase", isDone ? "text-primary" : "text-slate-300")}>
                                    {isDone ? 'Done' : '⏳'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                          <div className="p-3 bg-muted rounded-2xl group-hover:bg-primary group-hover:text-white transition-colors">
                            <ChevronRight className="h-5 w-5" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
            
            {filteredParticipants.total > displayLimit && (
                <div className="pt-8 flex justify-center">
                    <Button 
                        variant="secondary" 
                        onClick={() => setDisplayLimit(prev => prev + 10)}
                        className="font-black uppercase tracking-widest text-[10px] gap-2 hover:bg-primary/5 h-14 px-12 rounded-3xl border-2 border-dashed border-primary/20"
                    >
                        View More Participants ({filteredParticipants.total - displayLimit} remaining) <ChevronDown className="h-4 w-4" />
                    </Button>
                </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
