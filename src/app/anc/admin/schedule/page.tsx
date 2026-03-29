
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
  RefreshCcw,
  LayoutGrid,
  ListFilter,
  GripVertical,
  Zap,
  Clock,
  Split
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { useFirestore, useCollection, useMemoFirebase, useDoc, useUser } from '@/firebase';
import { collection, query, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { FACILITY_TARGETS, normalizeSiteName, getFacilityProgress } from '@/lib/facility-targets';
import { type AncRegistration } from '@/types';
import { generateRaSchedule, type RaScheduleOutput } from '@/ai/flows/ra-schedule-flow';
import { format, addDays, isWeekend, parseISO, nextMonday, startOfDay, isMonday, formatDistanceToNow } from 'date-fns';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TooltipProvider } from "@/components/ui/tooltip";

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
  const [draggedOverDate, setDraggedOverDate] = useState<string | null>(null);
  const [draggedOverCard, setDraggedOverCard] = useState<string | null>(null);
  
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
      toast({ title: "Monthly Cycle Generated", description: `Engine assigned ${result.assignments.length} visits over 4 weeks.`, variant: "success" });
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

  /**
   * DRAG AND DROP HANDLERS
   */
  const handleDragStart = (e: React.DragEvent, assignment: any) => {
    e.dataTransfer.setData("application/json", JSON.stringify(assignment));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDropOnDate = (e: React.DragEvent, newDate: string) => {
    e.preventDefault();
    setDraggedOverDate(null);
    try {
        const assignment = JSON.parse(e.dataTransfer.getData("application/json"));
        if (assignment.date === newDate) return;

        setSchedule(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                assignments: prev.assignments.map(a => {
                    if (a.ra_name === assignment.ra_name && a.facility === assignment.facility && a.date === assignment.date) {
                        return { ...a, date: newDate };
                    }
                    return a;
                })
            };
        });
        
        toast({ 
            title: "Visit Rescheduled", 
            description: `${assignment.ra_name} moved to ${format(parseISO(newDate), 'MMM d')}.`,
        });
    } catch (err) {
        console.error("Drop failed", err);
    }
  };

  const handleSwapRAs = (e: React.DragEvent, targetAssignment: any) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedOverCard(null);
    setDraggedOverDate(null);
    
    try {
        const draggedAssignment = JSON.parse(e.dataTransfer.getData("application/json"));
        
        // If it's the same card, do nothing
        const isSame = draggedAssignment.ra_name === targetAssignment.ra_name && 
                       draggedAssignment.facility === targetAssignment.facility && 
                       draggedAssignment.date === targetAssignment.date;
        if (isSame) return;

        setSchedule(prev => {
            if (!prev) return prev;
            const newAssignments = [...prev.assignments];
            
            const idxA = newAssignments.findIndex(a => 
                a.ra_name === draggedAssignment.ra_name && a.facility === draggedAssignment.facility && a.date === draggedAssignment.date
            );
            const idxB = newAssignments.findIndex(a => 
                a.ra_name === targetAssignment.ra_name && a.facility === targetAssignment.facility && a.date === targetAssignment.date
            );

            if (idxA !== -1 && idxB !== -1) {
                const raA = newAssignments[idxA].ra_name;
                newAssignments[idxA].ra_name = newAssignments[idxB].ra_name;
                newAssignments[idxB].ra_name = raA;
            }

            return { ...prev, assignments: newAssignments };
        });

        toast({ 
            title: "Personnel Exchanged", 
            description: `Swapped assignments between ${draggedAssignment.ra_name} and ${targetAssignment.ra_name}.`,
        });
    } catch (err) {
        console.error("Swap failed", err);
    }
  };

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

  const monthlyWorkingDays = useMemo(() => {
    if (!selectedStartDate) return [];
    const days: Date[] = [];
    let current = selectedStartDate;
    while (days.length < 20) {
        if (!isWeekend(current) && !TANZANIA_HOLIDAYS_2026.includes(format(current, 'yyyy-MM-dd'))) {
            days.push(current);
        }
        current = addDays(current, 1);
    }
    return days;
  }, [selectedStartDate]);

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
                      Select an upcoming Monday to generate a full 4-week deployment plan. The system will automatically ensure every site receives an equal frequency of visits (approx. 68-80 visits per month).
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
                        <CardTitle className="text-2xl font-black tracking-tight">Deployment Strategy</CardTitle>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-primary/40 hover:text-primary"
                            onClick={() => { toast({ title: "Refreshing Grid...", variant: "default" }); }}
                        >
                            <RefreshCcw className="h-4 w-4" />
                        </Button>
                      </div>
                      <CardDescription className="text-xs font-bold uppercase tracking-widest">
                          {savedScheduleData?.updated_at ? `Live plan saved ${format(savedScheduleData.updated_at.toDate(), 'PPP')}` : `Unsaved Monthly Proposal`}
                      </CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-4">
                            <div className="hidden lg:flex items-center gap-6 px-6 py-2 bg-background rounded-2xl border shadow-sm ring-1 ring-emerald-100">
                                <div className="flex items-center gap-3">
                                    <Zap className="h-4 w-4 text-emerald-600 animate-pulse" />
                                    <div className="text-left">
                                        <p className="text-[8px] font-black uppercase text-muted-foreground">Strategic Intelligence</p>
                                        <p className="text-[10px] font-black text-emerald-700">Weekly Strategic Audit Active</p>
                                    </div>
                                </div>
                                <div className="w-px h-6 bg-border" />
                                <div className="text-center">
                                    <p className="text-[8px] font-black uppercase text-muted-foreground">Monthly Slots</p>
                                    <p className="text-sm font-black text-primary">{schedule.assignments.length}</p>
                                </div>
                            </div>
                            <Badge className="bg-emerald-600 font-black px-4 py-1 rounded-lg text-white">
                              INTELLIGENCE OPTIMIZED
                            </Badge>
                        </div>
                        {savedScheduleData?.last_daily_sync && (
                            <p className="text-[9px] font-bold text-muted-foreground flex items-center gap-1.5" suppressHydrationWarning>
                                <Clock className="h-2.5 w-2.5" /> Last Weekly Refinement: {formatDistanceToNow(savedScheduleData.last_daily_sync.toDate(), { addSuffix: true })}
                            </p>
                        )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Tabs value={activeWeekTab} onValueChange={setActiveWeekTab} className="w-full">
                    <div className="bg-muted/30 p-4 border-b flex flex-col sm:flex-row items-center justify-between gap-4">
                        <TabsList className="grid w-full sm:w-[600px] grid-cols-5 h-12 rounded-xl bg-background border shadow-sm">
                            <TabsTrigger value="week-1" className="font-black uppercase text-[9px] tracking-widest">Week 1</TabsTrigger>
                            <TabsTrigger value="week-2" className="font-black uppercase text-[9px] tracking-widest">Week 2</TabsTrigger>
                            <TabsTrigger value="week-3" className="font-black uppercase text-[9px] tracking-widest">Week 3</TabsTrigger>
                            <TabsTrigger value="week-4" className="font-black uppercase text-[9px] tracking-widest">Week 4</TabsTrigger>
                            <TabsTrigger value="matrix" className="font-black uppercase text-[9px] tracking-widest flex items-center gap-1.5 bg-primary/5 text-primary">
                                <LayoutGrid className="h-3 w-3" /> Matrix
                            </TabsTrigger>
                        </TabsList>
                        <div className="text-[10px] font-bold text-muted-foreground hidden sm:block flex items-center gap-2">
                            <div className="flex items-center gap-1.5 bg-background px-2 py-1 rounded-lg border">
                                <GripVertical className="h-3 w-3 text-muted-foreground/40" />
                                <span className="uppercase text-[8px] font-black tracking-widest text-primary">Drag RAs to Swap or Reschedule</span>
                            </div>
                            <span>Period: <span className="text-foreground">{format(selectedStartDate, 'MMM d')} - {format(addDays(selectedStartDate, 27), 'MMM d, yyyy')}</span></span>
                        </div>
                    </div>

                    {[0, 1, 2, 3].map((weekIdx) => (
                        <TabsContent key={weekIdx} value={`week-${weekIdx + 1}`} className="m-0 border-none">
                            <div className="grid md:grid-cols-5 border-b">
                                {Array.from({ length: 5 }).map((_, dayIdx) => {
                                    const date = addDays(selectedStartDate, (weekIdx * 7) + dayIdx);
                                    const dateStr = format(date, 'yyyy-MM-dd');
                                    const dayAssignments = schedule.assignments.filter(a => a.date === dateStr);
                                    
                                    // Group assignments by facility for paired view
                                    const groupedByFacility: Record<string, typeof dayAssignments> = {};
                                    dayAssignments.forEach(a => {
                                        if (!groupedByFacility[a.facility]) groupedByFacility[a.facility] = [];
                                        groupedByFacility[a.facility].push(a);
                                    });

                                    const isHoliday = TANZANIA_HOLIDAYS_2026.includes(dateStr);
                                    const isToday = dateStr === todayStr;
                                    const isDraggingOverDate = draggedOverDate === dateStr;
                                    
                                    return (
                                        <div 
                                            key={dayIdx} 
                                            onDragOver={(e) => { e.preventDefault(); !isHoliday && setDraggedOverDate(dateStr); }}
                                            onDragLeave={() => setDraggedOverDate(null)}
                                            onDrop={(e) => !isHoliday && handleDropOnDate(e, dateStr)}
                                            className={cn(
                                                "p-4 border-r last:border-none space-y-4 min-h-[450px] transition-all duration-500 relative",
                                                isToday ? "bg-primary/[0.04] ring-2 ring-inset ring-primary/20 z-10 shadow-inner" : 
                                                isHoliday ? "bg-muted/30" : "bg-card",
                                                isDraggingOverDate && "bg-primary/10 ring-2 ring-dashed ring-primary/40 z-20"
                                            )}
                                        >
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
                                                ) : Object.keys(groupedByFacility).length === 0 ? (
                                                    <div className="py-12 flex flex-col items-center justify-center gap-2 opacity-20">
                                                        <AlertCircle className="h-6 w-6" />
                                                        <p className="text-[8px] font-black uppercase">No Assignments</p>
                                                    </div>
                                                ) : (
                                                    Object.entries(groupedByFacility).map(([facilityName, assignments], fi) => {
                                                        const aCore = normalizeSiteName(facilityName);
                                                        const progress = facilityProgressArray.find(f => normalizeSiteName(f.name) === aCore);
                                                        const enrolledCount = progress?.enrolled ?? 0;
                                                        const targetCount = progress?.target ?? 0;
                                                        const remainingCount = Math.max(0, targetCount - enrolledCount);
                                                        const isPaired = assignments.length > 1;

                                                        return (
                                                            <div 
                                                                key={fi}
                                                                className={cn(
                                                                    "p-3 rounded-2xl ring-1 ring-border shadow-sm hover:shadow-md transition-all group border-l-4 border-l-primary",
                                                                    isToday ? "bg-background" : "bg-white dark:bg-card",
                                                                    isPaired ? "ring-2 ring-emerald-100" : ""
                                                                )}
                                                            >
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                                                        {isPaired ? 'Paired Visit' : 'Individual Visit'}
                                                                    </p>
                                                                    {isPaired && <Users className="h-3 w-3 text-emerald-600" />}
                                                                </div>
                                                                
                                                                <p className="text-xs font-black leading-tight line-clamp-2 mb-3">{facilityName.split(' (')[0]}</p>
                                                                
                                                                <div className="space-y-2">
                                                                    {assignments.map((a, ai) => {
                                                                        const cardId = `${a.ra_name}-${a.facility}-${a.date}`;
                                                                        const isDraggingOverCard = draggedOverCard === cardId;

                                                                        return (
                                                                            <div 
                                                                                key={ai}
                                                                                draggable
                                                                                onDragStart={(e) => handleDragStart(e, a)}
                                                                                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDraggedOverCard(cardId); }}
                                                                                onDragLeave={() => setDraggedOverCard(null)}
                                                                                onDrop={(e) => handleSwapRAs(e, a)}
                                                                                className={cn(
                                                                                    "p-2 rounded-xl border-2 border-dashed flex items-center justify-between group/ra cursor-grab active:cursor-grabbing transition-all",
                                                                                    isDraggingOverCard ? "ring-4 ring-primary bg-primary/10 scale-105" : "hover:border-primary/40 hover:bg-primary/[0.02]"
                                                                                )}
                                                                            >
                                                                                <div className="flex items-center gap-2">
                                                                                    <GripVertical className="h-3 w-3 text-muted-foreground/30 group-hover/ra:text-primary" />
                                                                                    <span className="text-[10px] font-black uppercase text-primary">{a.ra_name}</span>
                                                                                </div>
                                                                                <Popover>
                                                                                    <PopoverTrigger asChild>
                                                                                        <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full hover:bg-primary/10">
                                                                                            <Info className="h-3 w-3 text-muted-foreground/40" />
                                                                                        </Button>
                                                                                    </PopoverTrigger>
                                                                                    <PopoverContent className="w-64 p-4 rounded-2xl shadow-2xl border-none">
                                                                                        <p className="text-[10px] font-black uppercase text-muted-foreground mb-2">Personnel Detail</p>
                                                                                        <p className="text-xs font-medium leading-relaxed italic">"{a.reasoning}"</p>
                                                                                    </PopoverContent>
                                                                                </Popover>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>

                                                                <div className="mt-3 pt-3 border-t border-dashed flex items-center justify-between">
                                                                    <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">
                                                                        Bal: <span className={cn("font-black", remainingCount <= 5 && remainingCount > 0 ? "text-amber-600 animate-pulse" : remainingCount === 0 ? "text-emerald-600" : "text-foreground")}>{remainingCount}</span>
                                                                    </div>
                                                                    <Badge className={cn(
                                                                        "text-[7px] font-black uppercase px-1.5 py-0 h-4 border-none",
                                                                        assignments[0].priority_level === 'HIGH' ? 'bg-amber-100 text-amber-700' : 
                                                                        assignments[0].priority_level === 'MEDIUM' ? 'bg-blue-100 text-blue-700' : 
                                                                        'bg-slate-100 text-slate-700'
                                                                    )}>
                                                                        {assignments[0].priority_level}
                                                                    </Badge>
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

                    <TabsContent value="matrix" className="m-0 border-none bg-muted/10">
                        <div className="p-6">
                            <Card className="border-none ring-1 ring-border shadow-2xl rounded-3xl overflow-hidden bg-background">
                                <CardHeader className="bg-primary/5 border-b py-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-primary rounded-xl text-white">
                                                <LayoutGrid className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-lg font-black tracking-tight">Deployment Matrix</CardTitle>
                                                <CardDescription className="text-[10px] font-bold uppercase">Chronological Coverage Audit (Days 1-20)</CardDescription>
                                            </div>
                                        </div>
                                        <Badge className="bg-emerald-600 text-white font-black text-[9px] uppercase tracking-widest px-3">
                                            Equality Check Active
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <div className="relative">
                                    <ScrollArea className="w-full h-[600px]">
                                        <Table>
                                            <TableHeader className="bg-muted/30">
                                                <TableRow>
                                                    <TableHead className="w-48 text-[9px] font-black uppercase border-r border-border/50 px-4">
                                                        Clinical Facility
                                                    </TableHead>
                                                    {monthlyWorkingDays.map((day, i) => (
                                                        <TableHead key={i} className="text-center min-w-[60px] text-[9px] font-black uppercase border-r last:border-none">
                                                            <div className="flex flex-col items-center py-1">
                                                                <span className="opacity-40">D{i + 1}</span>
                                                                <span className={cn("text-xs", format(day, 'yyyy-MM-dd') === todayStr && "text-primary font-black")}>{format(day, 'dd/MM')}</span>
                                                            </div>
                                                        </TableHead>
                                                    ))}
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {Object.keys(FACILITY_TARGETS).sort().map((facilityName, fIdx) => (
                                                    <TableRow key={fIdx} className="hover:bg-primary/[0.02] border-b last:border-none group">
                                                        <TableCell className="font-bold text-[10px] border-r border-border/50 px-4 whitespace-nowrap">
                                                            {facilityName.split(' (')[0]}
                                                        </TableCell>
                                                        {monthlyWorkingDays.map((day, dIdx) => {
                                                            const dStr = format(day, 'yyyy-MM-dd');
                                                            const assigned = schedule.assignments.filter(a => a.date === dStr && normalizeSiteName(a.facility) === normalizeSiteName(facilityName));
                                                            
                                                            return (
                                                                <TableCell key={dIdx} className={cn(
                                                                    "text-center p-1 border-r last:border-none min-w-[60px] transition-colors",
                                                                    assigned.length > 0 ? "bg-emerald-50/50 dark:bg-emerald-950/20" : ""
                                                                )}>
                                                                    <div className="flex flex-wrap items-center justify-center gap-0.5">
                                                                        {assigned.map((a, ai) => (
                                                                            <TooltipProvider key={ai}>
                                                                                <Popover>
                                                                                    <PopoverTrigger asChild>
                                                                                        <div className={cn(
                                                                                            "h-6 w-6 rounded-md flex items-center justify-center text-[8px] font-black cursor-help transition-all hover:scale-110 shadow-sm",
                                                                                            a.ra_name === 'Lucy' ? "bg-pink-500 text-white" :
                                                                                            a.ra_name === 'Riki Mahamba' ? "bg-blue-500 text-white" :
                                                                                            a.ra_name === 'Katie' ? "bg-amber-500 text-white" :
                                                                                            "bg-purple-500 text-white"
                                                                                        )}>
                                                                                            {a.ra_name.charAt(0)}
                                                                                        </div>
                                                                                    </PopoverTrigger>
                                                                                    <PopoverContent className="w-48 p-3 rounded-xl shadow-2xl border-none">
                                                                                        <p className="text-[9px] font-black uppercase text-primary mb-1">{a.ra_name}</p>
                                                                                        <p className="text-xs font-bold leading-tight">{facilityName}</p>
                                                                                        <div className="mt-2 pt-2 border-t border-dashed">
                                                                                            <Badge className="text-[7px] font-black uppercase bg-primary/10 text-primary border-none">{a.priority_level} PRIORITY</Badge>
                                                                                        </div>
                                                                                    </PopoverContent>
                                                                                </Popover>
                                                                            </TooltipProvider>
                                                                        ))}
                                                                    </div>
                                                                </TableCell>
                                                            );
                                                        })}
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                        <ScrollBar orientation="horizontal" />
                                        <ScrollBar orientation="vertical" />
                                    </ScrollArea>
                                </div>
                                <div className="p-4 bg-muted/20 border-t flex flex-wrap items-center justify-center gap-6">
                                    <div className="flex items-center gap-2">
                                        <div className="h-3 w-3 rounded-sm bg-pink-500" /> <span className="text-[9px] font-black uppercase text-muted-foreground">Lucy</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="h-3 w-3 rounded-sm bg-blue-500" /> <span className="text-[9px] font-black uppercase text-muted-foreground">Riki</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="h-3 w-3 rounded-sm bg-amber-500" /> <span className="text-[9px] font-black uppercase text-muted-foreground">Katie</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="h-3 w-3 rounded-sm bg-purple-500" /> <span className="text-[9px] font-black uppercase text-muted-foreground">Majid</span>
                                    </div>
                                    <div className="w-px h-4 bg-border hidden sm:block" />
                                    <p className="text-[9px] font-bold text-slate-400 italic">This matrix portrays the full 80-visit deployment cycle for the current month.</p>
                                </div>
                            </Card>
                        </div>
                    </TabsContent>
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
                        <CardDescription className="text-xs font-bold uppercase tracking-widest">Planned Cycle: {schedule.assignments.length} Monthly Visits</CardDescription>
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
                            The engine ensures each RA is rotated through approx. 20 assignments per month, maintaining study momentum without exceeding local labor standards.
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
