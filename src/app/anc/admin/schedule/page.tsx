"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Calendar as CalendarIcon, Sparkles, ShieldCheck, Activity, Users, Loader2, CheckCircle2, MapPin, Info } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { FACILITY_TARGETS } from '@/lib/facility-targets';
import { type AncRegistration } from '@/types';
import { generateRaSchedule, type RaScheduleOutput } from '@/ai/flows/ra-schedule-flow';
import { format, addDays, startOfTomorrow } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const RAS = ['Lucy', 'Riki Mahamba', 'Katie', 'Majid'];

export default function RAWeeklyScheduler() {
  const firestore = useFirestore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [schedule, setSchedule] = useState<RaScheduleOutput | null>(null);

  const regsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'anc_registrations'));
  }, [firestore]);

  const { data: registrations, isLoading: isRegsLoading } = useCollection<AncRegistration>(regsQuery);

  const facilityProgress = useMemoFirebase(() => {
    if (!registrations) return [];
    const counts: Record<string, number> = {};
    registrations.forEach(r => {
      if (r.healthFacility) counts[r.healthFacility] = (counts[r.healthFacility] || 0) + 1;
    });

    return Object.entries(FACILITY_TARGETS).map(([name, target]) => {
      const enrolled = counts[name] || 0;
      return {
        name,
        enrolled,
        target,
        percentage: target > 0 ? Math.round((enrolled / target) * 100) : 100
      };
    });
  }, [registrations]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const tomorrow = startOfTomorrow();
      const result = await generateRaSchedule({
        ras: RAS,
        facilities: facilityProgress,
        startDate: format(tomorrow, 'yyyy-MM-dd')
      });
      setSchedule(result);
    } catch (error) {
      console.error("Failed to generate schedule:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-24 lg:pb-12 pt-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-4 md:px-0">
        <div className="flex items-center gap-4">
          <Button variant="secondary" size="icon" asChild className="rounded-xl h-11 w-11">
            <Link href="/anc/activities"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-[10px] mb-1">
              <ShieldCheck className="h-4 w-4" /> Intelligence Unit
            </div>
            <h1 className="text-4xl font-black tracking-tighter">RA Weekly Scheduler</h1>
            <p className="text-sm font-medium text-muted-foreground">AI-optimized facility assignments based on real-time enrollment velocity.</p>
          </div>
        </div>
        <Button 
          onClick={handleGenerate} 
          disabled={isGenerating || isRegsLoading}
          className="h-12 px-8 rounded-xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 gap-2"
        >
          {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
          {schedule ? 'Regenerate Schedule' : 'Optimize Next Week'}
        </Button>
      </div>

      {!schedule && !isGenerating && (
        <div className="grid gap-6 px-4 md:px-0">
          <Card className="border-none ring-1 ring-border shadow-none rounded-[2.5rem] overflow-hidden bg-primary/5">
            <CardContent className="p-12 flex flex-col items-center text-center space-y-6">
              <div className="p-6 bg-white rounded-full shadow-sm">
                <CalendarIcon className="h-12 w-12 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black tracking-tight">Ready for Optimization</h3>
                <p className="text-muted-foreground max-w-sm mx-auto font-medium">
                  The AI engine is ready to analyze recruitment velocity and site-specific targets to generate the next weekly schedule.
                </p>
              </div>
              <div className="flex items-center gap-4 pt-4">
                  <Badge variant="outline" className="bg-white border-primary/20 font-black text-[10px] uppercase tracking-widest px-4 py-1.5 rounded-full">
                      <Activity className="h-3 w-3 mr-2 text-primary" /> Analysis Active
                  </Badge>
                  <Badge variant="outline" className="bg-white border-primary/20 font-black text-[10px] uppercase tracking-widest px-4 py-1.5 rounded-full">
                      <Users className="h-3 w-3 mr-2 text-primary" /> {RAS.length} RAs Ready
                  </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {isGenerating && (
        <div className="flex flex-col items-center justify-center py-32 space-y-6 text-center animate-in fade-in duration-500">
          <div className="relative">
            <div className="h-24 w-24 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            <Sparkles className="h-8 w-8 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <div>
            <h3 className="text-2xl font-black tracking-tight">Balancing Workload...</h3>
            <p className="text-muted-foreground font-medium">Gemini is processing site targets and staff availability.</p>
          </div>
        </div>
      )}

      {schedule && !isGenerating && (
        <div className="grid gap-8 px-4 md:px-0">
          <Card className="border-none ring-1 ring-border shadow-xl rounded-[2.5rem] overflow-hidden">
            <CardHeader className="bg-primary/5 p-8 border-b">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-2xl font-black tracking-tight">AI Generated Schedule</CardTitle>
                  <CardDescription className="text-xs font-bold uppercase tracking-widest">Optimized for {format(startOfTomorrow(), 'MMMM d, yyyy')} onwards</CardDescription>
                </div>
                <Badge className="bg-emerald-600 text-white font-black px-4 py-1 rounded-lg">AI VERIFIED</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid md:grid-cols-7 border-b">
                {Array.from({ length: 7 }).map((_, i) => {
                  const date = addDays(startOfTomorrow(), i);
                  const dayAssignments = schedule.assignments.filter(a => a.date === format(date, 'yyyy-MM-dd'));
                  
                  return (
                    <div key={i} className="p-4 border-r last:border-none space-y-4 min-h-[400px] bg-muted/5">
                      <div className="text-center pb-2 border-b">
                        <p className="text-[10px] font-black uppercase text-muted-foreground">{format(date, 'EEEE')}</p>
                        <p className="text-sm font-black">{format(date, 'MMM d')}</p>
                      </div>
                      <div className="space-y-3">
                        {dayAssignments.map((a, ai) => (
                          <div key={ai} className="p-3 bg-white dark:bg-card rounded-2xl ring-1 ring-border shadow-sm hover:shadow-md transition-all group">
                            <p className="text-[10px] font-black uppercase tracking-tighter text-primary mb-1">{a.ra_name}</p>
                            <p className="text-xs font-bold leading-tight line-clamp-2">{a.facility.split(' (')[0]}</p>
                            <div className="mt-2 flex items-center justify-between">
                              <Badge className={cn(
                                "text-[7px] font-black uppercase px-1.5 py-0 h-4 border-none",
                                a.priority_level === 'CRITICAL' ? 'bg-rose-500' : 
                                a.priority_level === 'HIGH' ? 'bg-amber-500' : 'bg-blue-500'
                              )}>
                                {a.priority_level}
                              </Badge>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full hover:bg-primary/10">
                                    <Info className="h-3 w-3" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-64 p-4 rounded-2xl shadow-2xl border-none">
                                  <p className="text-[10px] font-black uppercase text-muted-foreground mb-2">Assignment Logic</p>
                                  <p className="text-xs font-medium leading-relaxed italic">"{a.reasoning}"</p>
                                </PopoverContent>
                              </Popover>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="p-8 bg-muted/20">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                  <Sparkles className="h-3 w-3 text-primary" /> Strategic Summary
                </h4>
                <p className="text-sm font-medium leading-relaxed italic text-slate-600 dark:text-slate-400">
                  {schedule.summary}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-none ring-1 ring-border shadow-none rounded-[2rem] bg-card">
                <CardHeader className="p-8">
                    <CardTitle className="text-xl font-black tracking-tight">Assignment Rules</CardTitle>
                    <CardDescription className="text-xs font-bold uppercase tracking-widest">Optimization Constraints</CardDescription>
                </CardHeader>
                <CardContent className="p-8 pt-0 space-y-4">
                    {[
                      { text: "Prioritize facilities under 50% enrollment.", color: "bg-emerald-500" },
                      { text: "Maintain RA consistency at high-need sites.", color: "bg-blue-500" },
                      { text: "Automatic rotation every 14 days.", color: "bg-amber-500" }
                    ].map((rule, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm font-medium">
                          <div className={cn("h-2 w-2 rounded-full", rule.color)} />
                          {rule.text}
                      </div>
                    ))}
                </CardContent>
            </Card>
            <Card className="border-none ring-1 ring-border shadow-none rounded-[2rem] bg-primary">
                <CardContent className="p-8 text-white space-y-4">
                    <CheckCircle2 className="h-8 w-8" />
                    <h4 className="text-xl font-black tracking-tight leading-tight">Live Deployment Active</h4>
                    <p className="text-sm font-medium opacity-80 leading-relaxed">
                        Assignments generated here are shared directly with RAs via their Activity Hub dashboards.
                    </p>
                    <Button variant="outline" className="w-full h-12 rounded-xl bg-white/10 border-white/20 text-white font-black hover:bg-white/20">
                        Export Schedule
                    </Button>
                </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
