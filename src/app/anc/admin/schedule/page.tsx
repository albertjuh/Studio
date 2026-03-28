"use client";

import { useState, useEffect, useMemo } from 'react';
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
  Database,
  ChevronRight
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { FACILITY_TARGETS } from '@/lib/facility-targets';
import { type AncRegistration } from '@/types';
import { generateRaSchedule, type RaScheduleOutput } from '@/ai/flows/ra-schedule-flow';
import { format, addDays, startOfTomorrow, isWeekend, parseISO, nextMonday, startOfDay, isMonday } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Calendar } from '@/components/ui/calendar';

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
  
  // Default to next Monday for planning next week
  const defaultStartDate = useMemo(() => {
    const today = startOfDay(new Date());
    return isMonday(today) ? today : nextMonday(today);
  }, []);
  
  const [selectedStartDate, setSelectedStartDate] = useState<Date>(defaultStartDate);

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

  const facilityProgress = useMemo(() => {
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
      const result = await generateRaSchedule({
        ras: RAS,
        facilities: facilityProgress,
        startDate: format(selectedStartDate, 'yyyy-MM-dd')
      });
      setSchedule(result);
    } catch (err: any) {
      console.error("Failed to generate schedule:", err);
      setError("AI Engine Exception: Unable to compute optimized paths. Falling back to research consistency rotation.");
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
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" className="h-12 px-4 rounded-xl font-bold border-2 gap-2 bg-background">
                        <CalendarIcon className="h-4 w-4 text-primary" />
                        Next Week: {format(selectedStartDate, 'MMM d')}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                        mode="single"
                        selected={selectedStartDate}
                        onSelect={(date) => date && setSelectedStartDate(date)}
                        disabled={(date) => date < startOfDay(new Date())}
                        initialFocus
                    />
                </PopoverContent>
            </Popover>

            {schedule && (
                <Button 
                    variant="outline"
                    onClick={handleSaveSchedule}
                    disabled={isSaving}
                    className="h-12 px-6 rounded-xl font-black uppercase tracking-widest border-2 gap-2"
                >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Commit & Save
                </Button>
            )}
            <Button 
                onClick={handleGenerate} 
                disabled={isGenerating || isRegsLoading}
                className="h-12 px-8 rounded-xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 gap-2 bg-primary hover:bg-primary/90"
            >
                {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                {schedule ? 'Regenerate Plan' : 'Generate Weekly Plan'}
            </Button>
        </div>
      </div>

      {(isLoadLoading && !schedule) ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Fetching Persistent Plan...</p>
          </div>
      ) : (
        <>
          {error && (
            <div className="px-4 md:px-0">
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-3 text-amber-800 shadow-sm">
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
                    <h3 className="text-2xl font-black tracking-tight">System Ready</h3>
                    <p className="text-muted-foreground max-w-sm mx-auto font-medium leading-relaxed">
                      Select a start date (suggested next Monday) and generate an optimized deployment plan based on representation equity.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
                      <Badge variant="outline" className="bg-white border-primary/20 font-black text-[10px] uppercase tracking-widest px-4 py-1.5 rounded-full">
                          <Activity className="h-3 w-3 mr-2 text-primary" /> Research Consistency
                      </Badge>
                      <Badge variant="outline" className="bg-white border-primary/20 font-black text-[10px] uppercase tracking-widest px-4 py-1.5 rounded-full">
                          <Users className="h-3 w-3 mr-2 text-primary" /> Representation Equity
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
                <h3 className="text-2xl font-black tracking-tight">Balancing Weekly Pulse...</h3>
                <p className="text-muted-foreground font-medium">Gemini is ensuring clinical sub-populations are represented fairly.</p>
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
                          {savedScheduleData?.updated_at ? `Last persistent plan saved ${format(savedScheduleData.updated_at.toDate(), 'PPP p')}` : `Unsaved Proposal`}
                      </CardDescription>
                    </div>
                    <Badge className={cn(
                      "font-black px-4 py-1 rounded-lg text-white",
                      schedule.summary.includes("ALERT") ? "bg-amber-600" : "bg-emerald-600"
                    )}>
                      {schedule.summary.includes("ALERT") ? "CONSISTENCY FALLBACK" : "INTELLIGENCE OPTIMIZED"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="grid md:grid-cols-7 border-b">
                    {Array.from({ length: 7 }).map((_, i) => {
                      const startDate = parseISO(schedule.assignments[0]?.date || format(selectedStartDate, 'yyyy-MM-dd'));
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
                                            a.priority_level === 'HIGH' ? 'bg-amber-100 text-amber-700' : 
                                            a.priority_level === 'MEDIUM' ? 'bg-blue-100 text-blue-700' : 
                                            'bg-slate-100 text-slate-700'
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
                                            <p className="text-[10px] font-black uppercase text-muted-foreground mb-2">Research Strategy</p>
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
                      <Sparkles className="h-3 w-3 text-primary" /> Weekly Decision Summary
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
                        <CardTitle className="text-xl font-black tracking-tight">Assignment Philosophy</CardTitle>
                        <CardDescription className="text-xs font-bold uppercase tracking-widest">Research Standards</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 pt-0 space-y-4">
                        {[
                          { text: "Rotation: No RA visits the same site two weeks in a row.", color: "bg-blue-500" },
                          { text: "Consistency: Every site gets a weekly recruitment pulse.", color: "bg-emerald-500" },
                          { text: "Equity: Population sub-groups are balanced automatically.", color: "bg-amber-500" }
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
                        <h4 className="text-xl font-black tracking-tight leading-tight">Persistent Ops Database</h4>
                        <p className="text-sm font-medium opacity-80 leading-relaxed">
                            Once committed, the schedule is archived. Next week, the engine will use these assignments to rotate RAs into new facilities, ensuring long-term representation equity.
                        </p>
                        <Button variant="outline" className="w-full h-12 rounded-xl bg-white/10 border-white/20 text-white font-black hover:bg-white/20">
                            Download Ops History
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
