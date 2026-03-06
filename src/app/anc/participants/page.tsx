
"use client";

import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, Calendar, Users, ChevronRight, Activity, Baby } from 'lucide-react';
import { format } from 'date-fns';
import { type AncRegistration } from '@/types';
import Link from 'next/link';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export default function ParticipantTimelineList() {
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusStatusFilter] = useState('all');

  const participantsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'anc_registrations'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: participants, isLoading } = useCollection<AncRegistration>(participantsQuery);

  const filteredParticipants = useMemo(() => {
    if (!participants) return [];
    return participants.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           p.participantId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || p.overall_status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [participants, searchTerm, statusFilter]);

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
          <h1 className="text-4xl font-black tracking-tighter">Participants</h1>
          <p className="text-sm font-medium text-muted-foreground">Monitor pregnancy progression and study windows across the entire cohort.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name or ID..." 
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

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center gap-4">
            <Activity className="h-10 w-10 animate-spin text-primary" />
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Mapping Timeline...</p>
          </div>
        ) : filteredParticipants.length === 0 ? (
          <div className="py-32 text-center border-2 border-dashed rounded-[2.5rem] bg-muted/20 text-muted-foreground font-bold italic">
            No participants found matching your criteria.
          </div>
        ) : (
          filteredParticipants.map((p) => {
            const status = getStatusConfig(p.overall_status || 'on_track');
            const progress = Math.min(100, ((p.current_ga_weeks || 20) / 40) * 100);
            
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
                            <span className="font-mono text-[10px] text-slate-400 font-bold">{p.participantId}</span>
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">EDD: {p.edd?.toDate ? format(p.edd.toDate(), 'dd MMM yy') : 'N/A'}</span>
                        </div>
                        
                        <div>
                          <h3 className="text-xl font-black tracking-tight">{p.name}</h3>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">RA: {p.registeredBy} • {p.healthFacility}</p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between items-end text-[10px] font-black uppercase tracking-widest">
                            <span className="text-primary">{p.current_ga_weeks}+0 Wks Gestation</span>
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
          })
        )}
      </div>
    </div>
  );
}
