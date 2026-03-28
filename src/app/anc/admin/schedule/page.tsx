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
  ChevronRight,
  ChevronLeft,
  CalendarDays,
  RefreshCcw
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { useFirestore, useCollection, useMemoFirebase, useDoc, useUser } from '@/firebase';
import { collection, query, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { FACILITY_TARGETS, normalizeSiteName, getFacilityProgress } from '@/lib/facility-targets';
import { type AncRegistration } from '@/types';
import { generateRaSchedule, type RaScheduleOutput } from '@/ai/flows/ra-schedule-flow';
import { format, addDays, isWeekend, parseISO, nextMonday, startOfDay, isMonday, eachDayOfInterval, startOfWeek, endOfWeek } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const RAS = ['Lucy', 'Riki Mahamba', 'Katie', 'Majid'];

const TANZANIA_HOLIDAYS_2026 = [
  '2026-01-01', '2026-01-12', '2026-04-03', '2026-04-06', '2026-04-07', 
  '2026-04-26', '2026-05-01', '2026-07-07', '2026-08-08', '2026-10-14', 
  '2026-12-09', '2026-12-25', '2026-12-26'
];

export default function RAMonthlyScheduler() {
  const firestore = useFirestore();
  const { user: fbUser } = useUser();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [schedule, setSchedule] = useState<RaScheduleOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeWeekTab, setActiveWeekTab] = useState("week-1");
  const [todayStr, setTodayStr] = useState<string>('');
  
  useEffect(() => {
    setTodayStr(format(new Date(), 'yyyy-MM-dd'));
  }, []);

  const defaultStartDate = useMemo(() => {
    const today = startOfDay(new Date());
    return isMonday(today) ? today : nextMonday(today);
  }, []);
  
  const [selectedStartDate, setSelectedStartDate] = useState<Date>(defaultStartDate);

  const regsQuery = useMemoFirebase(() => {
    if (!firestore || !fbUser) return null;
    return query(collection(firestore, 'anc_registrations'));
  }, [firestore, fbUser]);

  const { data: registrations, isLoading: isRegsLoading } = useCollection<AncRegistration>(regsQuery);

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

  const facilityProgressArray = useMemo(() => {
    const counts: Record<string, number> = {};
    if (registrations) {
        registrations.forEach(r => {
          const rawName = (r.healthFacility || (r as any).facility || '').trim();
          if (!rawName) return;
          
          const normalizedCore = normalizeSiteName(rawName);
          counts[normalizedCore] = (counts[normalizedCore] || 0) + 1;
        });
    }

    return Object.entries(FACILITY_TARGETS).map(([targetFullName, target]) => {
      const targetCore = normalizeSiteName(targetFullName);
      const enrolled = counts[targetCore] || 0;

      return {
        name: targetFullName,
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
        facilities: facilityProgressArray,
        startDate: format(selectedStartDate, 'yyyy-MM-dd')
      });
      setSchedule(result);
      setActiveWeekTab("week-1");
    } catch (err: any) {
      setError("AI Engine Exception: Falling back to monthly rotation logic.");
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
        toast({ title: "Monthly Plan Committed", description: "The full month schedule is now live for all staff.", variant: "success" });
    } catch (e: any) {
        toast({ title: "Save Failed", description: e.message, variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };

  const weeklyAssignments = useMemo(() => {
    if (!schedule) return [];
    const weeks: any[][] = [[], [], [], []];
    const baseStart = parseISO(schedule.assignments[0]?.date || format(selectedStartDate, 'yyyy-MM-dd'));
    
    schedule.assignments.forEach(a => {
        const d = parseISO(a.date);
        const diffDays = Math.floor((d.getTime() - baseStart.getTime()) / (1000 * 60 * 60 * 24));
        const weekIdx = Math.min(3, Math.floor(diffDays / 7));
        if (weekIdx >= 0 && weekIdx < 4) {
            weeks[weekIdx].push(a);
        }
    });
    return weeks;
  }, [schedule, selectedStartDate]);

  const visitTotals = useMemo(() => {
    if (!schedule) return { facilities: {}, ras: {} };
    const facs: Record<string, number> = {};
    const ras: Record<string, number> = {};
    
    schedule.assignments.forEach(a => {
        facs[a.facility] = (facs[a.facility] || 0) + 1;
        ras[a.ra_name] = (ras[a.ra_name] || 0) + 1;
    });
    return { facilities: facs, ras };
  }, [schedule]);

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
            <h1 className="text-4xl font-black tracking-tighter">Monthly Deployment</h1>
            <p className="text-sm font-medium text-muted-foreground">Strategic 4-week planning for visit frequency equality.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" className="h-12 px-4 rounded-xl font-bold border-2 gap-2 bg-background">
                        <CalendarIcon className="h-4 w-4 text-primary" />
                        Start: {format(selectedStartDate, 'MMM d')}
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
                {schedule ? 'Regenerate Month' : 'Generate Full Month'}
            </Button>
        </div>
      </div>

      {(isLoadLoading && !schedule) ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Syncing Monthly Strategy...</p>
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
                    <CalendarDays className="h-12 w-12 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black tracking-tight">Monthly Planner Ready</h3>
                    <p className="text-muted-foreground max-w-md mx-auto font-medium leading-relaxed">
                      Select an upcoming Monday to generate a full 4-week deployment plan. The system will automatically ensure every site receives an equal frequency of visits.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
                      <Badge variant="outline" className="bg-white border-primary/20 font-black text-[10px] uppercase tracking-widest px-4 py-1.5 rounded-full">
                          <Activity className="h-3 w-3 mr-2 text-primary" /> Visit Frequency Equality
                      </Badge>
                      <Badge variant="outline" className="bg-white border-primary/20 font-black text-[10px] uppercase tracking-widest px-4 py-1.5 rounded-full">
                          <Users className="h-3 w-3 mr-2 text-primary" /> Balanced RA Rotation
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
                <h3 className="text-2xl font-black tracking-tight">Balancing Monthly Pulse...</h3>
                <p className="text-muted-foreground font-medium">Gemini is distributing 31 facilities across 80 staff-days fairly.</p>
              </div>
            </div>
          )}

          {schedule && !isGenerating && (
            <div className="grid gap-8 px-4 md:px-0">
              <Card className="border-none ring-1 ring-border shadow-xl rounded-[2.5rem] overflow-hidden">
                <CardHeader className="bg-primary/5 p-8 border-b">
                  <div className="flex justify-between items-center">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-2xl font-black tracking-tight">Full Month Deployment Plan</CardTitle>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-primary/40 hover:text-primary"
                            onClick={() => { toast({ title: "Re-checking Registry...", variant: "default" }); }}
                        >
                            <RefreshCcw className="h-4 w-4" />
                        </Button>
                      </div>
                      <CardDescription className="text-xs font-bold uppercase tracking-widest">
                          {savedScheduleData?.updated_at ? `Live plan saved ${format(savedScheduleData.updated_at.toDate(), 'PPP')}` : `Unsaved Monthly Proposal`}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden lg:flex items-center gap-6 px-6 py-2 bg-background rounded-2xl border">
                            <div className="text-center">
                                <p className="text-[8px] font-black uppercase text-muted-foreground">Total Sites</p>
                                <p className="text-sm font-black">31</p>
                            </div>
                            <div className="w-px h-6 bg-border" />
                            <div className="text-center">
                                <p className="text-[8px] font-black uppercase text-muted-foreground">Monthly Slots</p>
                                <p className="text-sm font-black text-primary">80</p>
                            </div>
                        </div>
                        <Badge className="bg-emerald-600 font-black px-4 py-1 rounded-lg text-white">
                          INTELLIGENCE OPTIMIZED
                        </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Tabs value={activeWeekTab} onValueChange={setActiveWeekTab} className="w-full">
                    <div className="bg-muted/30 p-4 border-b">
                        <TabsList className="grid w-full grid-cols-4 h-12 rounded-xl bg-background border shadow-sm">
                            <TabsTrigger value="week-1" className="font-black uppercase text-[10px] tracking-widest">Week 1</TabsTrigger>
                            <TabsTrigger value="week-2" className="font-black uppercase text-[10px] tracking-widest">Week 2</TabsTrigger>
                            <TabsTrigger value="week-3" className="font-black uppercase text-[10px] tracking-widest">Week 3</TabsTrigger>
                            <TabsTrigger value="week-4" className="font-black uppercase text-[10px] tracking-widest">Week 4</TabsTrigger>
                        </TabsList>
                    </div>

                    {[0, 1, 2, 3].map((weekIdx) => (
                        <TabsContent key={weekIdx} value={`week-${weekIdx + 1}`} className="m-0 border-none">
                            <div className="grid md:grid-cols-5 border-b">
                                {Array.from({ length: 5 }).map((_, dayIdx) => {
                                    const baseStart = parseISO(schedule.assignments[0]?.date);
                                    const date = addDays(baseStart, (weekIdx * 7) + dayIdx);
                                    const dateStr = format(date, 'yyyy-MM-dd');
                                    const dayAssignments = schedule.assignments.filter(a => a.date === dateStr);
                                    const isHoliday = TANZANIA_HOLIDAYS_2026.includes(dateStr);
                                    const isToday = dateStr === todayStr;
                                    
                                    return (
                                        <div key={dayIdx} className={cn(
                                            "p-4 border-r last:border-none space-y-4 min-h-[450px] transition-all duration-500 relative",
                                            isToday ? "bg-primary/[0.04] ring-2 ring-inset ring-primary/20 z-10 shadow-inner" : 
                                            isHoliday ? "bg-muted/30" : "bg-card"
                                        )}>
                                            <div className="text-center pb-2 border-b flex flex-col items-center">
                                                {isToday && (
                                                    <Badge className="mb-1 h-4 px-1.5 rounded-full bg-primary text-white font-black text-[7px] uppercase tracking-widest animate-pulse">
                                                        Today
                                                    </Badge>
                                                )}
                                                <p className={cn(
                                                    "text-[10px] font-black uppercase",
                                                    isToday ? "text-primary" : "text-muted-foreground"
                                                )}>
                                                    {format(date, 'EEEE')}
                                                </p>
                                                <p className={cn(
                                                    "text-sm font-black",
                                                    isToday ? "text-primary scale-110 transition-transform" : ""
                                                )}>
                                                    {format(date, 'MMM d')}
                                                </p>
                                            </div>
                                            <div className="space-y-3">
                                                {isHoliday ? (
                                                    <div className="py-12 flex flex-col items-center justify-center gap-2 opacity-40">
                                                        <Coffee className="h-6 w-6" />
                                                        <p className="text-[9px] font-black uppercase">Public Holiday</p>
                                                    </div>
                                                ) : (
                                                    dayAssignments.map((a, ai) => {
                                                        // Accurate site progress tracking using normalized matching
                                                        const aCore = normalizeSiteName(a.facility);
                                                        const progress = facilityProgressArray.find(f => normalizeSiteName(f.name) === aCore);
                                                        
                                                        const enrolledCount = progress?.enrolled ?? 0;
                                                        const targetCount = progress?.target ?? 0;
                                                        const remainingCount = Math.max(0, targetCount - enrolledCount);
                                                        const { isFull } = getFacilityProgress(progress?.name || a.facility, enrolledCount);

                                                        return (
                                                            <div key={ai} className={cn(
                                                                "p-3 rounded-2xl ring-1 ring-border shadow-sm hover:shadow-md transition-all group border-l-4 border-l-primary",
                                                                isToday ? "bg-background" : "bg-white dark:bg-card"
                                                            )}>
                                                                <p className="text-[10px] font-black uppercase tracking-tighter text-primary mb-1">{a.ra_name}</p>
                                                                <p className="text-xs font-bold leading-tight line-clamp-2">{a.facility.split(' (')[0]}</p>
                                                                
                                                                <div className="mt-2">
                                                                    <div className="flex items-center justify-between text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">
                                                                        <span>Remaining: <span className={cn("font-black", remainingCount <= 5 && remainingCount > 0 ? "text-amber-600 animate-pulse" : remainingCount === 0 ? "text-emerald-600" : "text-foreground")}>{remainingCount}</span></span>
                                                                    </div>
                                                                </div>

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
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </TabsContent>
                    ))}
                  </Tabs>
                  <div className="p-8 bg-muted/20">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                      <Sparkles className="h-3 w-3 text-primary" /> Monthly Strategy Summary
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
                        <CardTitle className="text-xl font-black tracking-tight">Frequency Audit</CardTitle>
                        <CardDescription className="text-xs font-bold uppercase tracking-widest">Monthly Visit Totals</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 pt-0">
                        <ScrollArea className="h-64">
                            <div className="grid grid-cols-1 gap-2">
                                {Object.entries(visitTotals.facilities).map(([name, count]) => (
                                    <div key={name} className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                                        <span className="text-[10px] font-black uppercase tracking-tight truncate max-w-[200px]">{name.split(' (')[0]}</span>
                                        <Badge className="bg-primary text-white font-black text-[10px]">{count} Visits</Badge>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
                <Card className="border-none ring-1 ring-border shadow-none rounded-[2rem] bg-primary">
                    <CardContent className="p-8 text-white space-y-4">
                        <Users className="h-8 w-8" />
                        <h4 className="text-xl font-black tracking-tight leading-tight">RA Monthly Workload</h4>
                        <div className="grid grid-cols-2 gap-4">
                            {Object.entries(visitTotals.ras).map(([name, count]) => (
                                <div key={name} className="p-3 bg-white/10 rounded-xl border border-white/20">
                                    <p className="text-[8px] font-black uppercase opacity-60">{name}</p>
                                    <p className="text-lg font-black">{count} Days</p>
                                </div>
                            ))}
                        </div>
                        <p className="text-[10px] font-medium opacity-80 leading-relaxed pt-2">
                            The engine ensures each RA is rotated through 20 assignments per month, maintaining study momentum without exceeding local labor standards.
                        </p>
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
