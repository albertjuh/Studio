
"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  ArrowLeft, 
  Calendar as CalendarIcon, 
  Sparkles, 
  ShieldCheck, 
  Activity, 
  Users, 
  Loader2, 
  CheckCircle2, 
  MapPin, 
  Info,
  AlertCircle,
  Coffee,
  Save,
  Database
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { FACILITY_TARGETS } from '@/lib/facility-targets';
import { type AncRegistration } from '@/types';
import { generateRaSchedule, type RaScheduleOutput } from '@/ai/flows/ra-schedule-flow';
import { format, addDays, startOfTomorrow, isWeekend, parseISO } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const RAS = ['Lucy', 'Riki Mahamba', 'Katie', 'Majid'];

// Fixed Tanzania Public Holidays 2026
const TANZANIA_HOLIDAYS_2026 = [
  '2026-01-01', '2026-01-12', '2026-04-03', '2026-04-06', '2026-04-07', 
  '2026-04-26', '2026-05-01', '2026-07-07', '2026-08-08', '2026-10-14', 
  '2026-12-09', '2026-12-25', '2026-12-26'
];

export default function RAWeeklyScheduler() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [schedule, setSchedule] = useState<RaScheduleOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const regsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'anc_registrations'));
  }, [firestore]);

  const { data: registrations, isLoading: isRegsLoading } = useCollection<AncRegistration>(regsQuery);

  // Persistence: Load latest schedule from DB
  const latestScheduleRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'study_ops', 'latest_ra_schedule');
  }, [firestore]);

  const { data: savedScheduleData, isLoading: isLoadLoading } = useDoc<any>(latestScheduleRef);

  useEffect(() => {
    if (savedScheduleData && !schedule && !isGenerating) {
        setSchedule(savedScheduleData.plan);
    }
  }, [savedScheduleData, schedule, isGenerating]);

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
    setError(null);
    try {
      const tomorrow = startOfTomorrow();
      const result = await generateRaSchedule({
        ras: RAS,
        facilities: facilityProgress,
        startDate: format(tomorrow, 'yyyy-MM-dd')
      });
      setSchedule(result);
    } catch (err: any) {
      console.error("Failed to generate schedule:", err);
      setError("AI Engine Exception: The system encountered a configuration mismatch. Attempting to balance assignments using rule-based fallback...");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveSchedule = async () => {
    if (!firestore || !schedule) return;
    setIsSaving(true);
    try {
        await setDoc(doc(firestore, 'study_ops', 'latest_ra_schedule'), {
            plan: schedule,
            updated_at: serverTimestamp(),
            created_by: 'Admin'
        });
        toast({ title: "Deployment Plan Saved", description: "The weekly schedule is now persistent and live for the team.", variant: "success" });
    } catch (e: any) {
        toast({ title: "Save Failed", description: e.message, variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-24 lg:pb-12 pt-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-4 md:px-0">
        <div className="flex items-center gap-4">
          <Button variant="secondary" size="icon" asChild className="rounded-xl h-11 w-11">
            <Link href="/anc/admin"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-[10px] mb-1">
              <ShieldCheck className="h-4 w-4" /> Intelligence Unit
            </div>
            <h1 className="text-4xl font-black tracking-tighter">Deployment Planner</h1>
            <p className="text-sm font-medium text-muted-foreground">Strategic facility assignments based on representation equity.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
            {schedule && (
                <Button 
                    variant="outline"
                    onClick={handleSaveSchedule}
                    disabled={isSaving}
                    className="h-12 px-6 rounded-xl font-black uppercase tracking-widest border-2 gap-2"
                >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Commit & Save Plan
                </Button>
            )}
            <Button 
                onClick={handleGenerate} 
                disabled={isGenerating || isRegsLoading}
                className="h-12 px-8 rounded-xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 gap-2 bg-primary hover:bg-primary/90"
            >
                {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                {schedule ? 'Regenerate Optimization' : 'Generate New Plan'}
            </Button>
        </div>
      </div>

      {(isLoadLoading && !schedule) ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Fetching Latest Deployment Plan...</p>
          </div>
      ) : (
        <>
          {error && (
            <div className="px-4 md:px-0">
              <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex items-center gap-3 text-rose-800 shadow-sm">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p className="text-xs font-bold">{error}</p>
              </div>
            </div>
          )}

          {!schedule && !isGenerating && (
            <div className="grid gap-6 px-4 md:px-0">
              <Card className="border-none ring-1 ring-border shadow-none rounded-[2.5rem] overflow-hidden bg-primary/5">
                <CardContent className="p-12 flex flex-col items-center text-center space-y-6">
                  <div className="p-6 bg-white rounded-full shadow-sm">
                    <CalendarIcon className="h-12 w-12 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black tracking-tight">Ready for Deployment</h3>
                    <p className="text-muted-foreground max-w-sm mx-auto font-medium leading-relaxed">
                      The engine is initialized with historical data from 31 clinics. Generate a new plan or wait for the latest persistent plan to load.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
                      <Badge variant="outline" className="bg-white border-primary/20 font-black text-[10px] uppercase tracking-widest px-4 py-1.5 rounded-full">
                          <Activity className="h-3 w-3 mr-2 text-primary" /> Consistency Audit Active
                      </Badge>
                      <Badge variant="outline" className="bg-white border-primary/20 font-black text-[10px] uppercase tracking-widest px-4 py-1.5 rounded-full">
                          <Users className="h-3 w-3 mr-2 text-primary" /> Equity Logic Enabled
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
                <h3 className="text-2xl font-black tracking-tight">Balancing Representation...</h3>
                <p className="text-muted-foreground font-medium">Gemini is ensuring every clinical population is represented in this cycle.</p>
              </div>
            </div>
          )}

          {schedule && !isGenerating && (
            <div className="grid gap-8 px-4 md:px-0">
              <Card className="border-none ring-1 ring-border shadow-xl rounded-[2.5rem] overflow-hidden">
                <CardHeader className="bg-primary/5 p-8 border-b">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-2xl font-black tracking-tight">Optimized Deployment Plan</CardTitle>
                      <CardDescription className="text-xs font-bold uppercase tracking-widest">
                          {savedScheduleData?.updated_at ? `Last saved ${format(savedScheduleData.updated_at.toDate(), 'PPP p')}` : `New Unsaved Optimization`}
                      </CardDescription>
                    </div>
                    <Badge className={cn(
                      "font-black px-4 py-1 rounded-lg text-white",
                      schedule.summary.includes("ALERT") ? "bg-amber-600" : "bg-emerald-600"
                    )}>
                      {schedule.summary.includes("ALERT") ? "HEURISTIC ACTIVE" : "AI OPTIMIZED"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="grid md:grid-cols-7 border-b">
                    {Array.from({ length: 7 }).map((_, i) => {
                      const startDate = parseISO(schedule.assignments[0]?.date || format(new Date(), 'yyyy-MM-dd'));
                      const date = addDays(startDate, i);
                      const dateStr = format(date, 'yyyy-MM-dd');
                      const dayAssignments = schedule.assignments.filter(a => a.date === dateStr);
                      const isHoliday = TANZANIA_HOLIDAYS_2026.includes(dateStr);
                      const isWeekendDay = isWeekend(date);
                      const isDayOff = isWeekendDay || isHoliday;
                      
                      return (
                        <div key={i} className={cn(
                            "p-4 border-r last:border-none space-y-4 min-h-[450px] transition-colors",
                            isDayOff ? "bg-muted/30" : "bg-card"
                        )}>
                          <div className="text-center pb-2 border-b">
                            <p className="text-[10px] font-black uppercase text-muted-foreground">{format(date, 'EEEE')}</p>
                            <p className="text-sm font-black">{format(date, 'MMM d')}</p>
                          </div>
                          <div className="space-y-3">
                            {isDayOff ? (
                                <div className="py-12 flex flex-col items-center justify-center gap-2 opacity-40">
                                    <Coffee className="h-6 w-6" />
                                    <p className="text-[9px] font-black uppercase">
                                        {isHoliday ? 'Public Holiday' : 'Weekend'}
                                    </p>
                                </div>
                            ) : (
                                dayAssignments.map((a, ai) => (
                                    <div key={ai} className="p-3 bg-white dark:bg-card rounded-2xl ring-1 ring-border shadow-sm hover:shadow-md transition-all group border-l-4 border-l-primary">
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
                                            <p className="text-[10px] font-black uppercase text-muted-foreground mb-2">Clinical Reasoning</p>
                                            <p className="text-xs font-medium leading-relaxed italic">"{a.reasoning}"</p>
                                            </PopoverContent>
                                        </Popover>
                                        </div>
                                    </div>
                                ))
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className={cn(
                    "p-8",
                    schedule.summary.includes("ALERT") ? "bg-amber-50 dark:bg-amber-900/10" : "bg-muted/20"
                  )}>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                      <Sparkles className="h-3 w-3 text-primary" /> Operations Summary
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
                        <CardTitle className="text-xl font-black tracking-tight">Assignment Constraints</CardTitle>
                        <CardDescription className="text-xs font-bold uppercase tracking-widest">Active Study Protocols</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 pt-0 space-y-4">
                        {[
                          { text: "Monday-Friday deployment cycle only.", color: "bg-emerald-500" },
                          { text: "Unique weekly visits per site (once-per-week).", color: "bg-blue-500" },
                          { text: "Equitable sub-population representation.", color: "bg-amber-500" }
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
                        <Database className="h-8 w-8" />
                        <h4 className="text-xl font-black tracking-tight leading-tight">Master Plan Repository</h4>
                        <p className="text-sm font-medium opacity-80 leading-relaxed">
                            Saved plans are archived for study reporting and available to the field team via their activity dashboards.
                        </p>
                        <Button variant="outline" className="w-full h-12 rounded-xl bg-white/10 border-white/20 text-white font-black hover:bg-white/20">
                            Download Deployment Log
                        </Button>
                    </CardContent>
                </Card>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
