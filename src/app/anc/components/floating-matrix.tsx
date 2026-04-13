
"use client";

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutGrid, 
  X, 
  Maximize2, 
  Minimize2, 
  Zap, 
  ShieldCheck, 
  Info,
  CalendarDays,
  GripHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import { FACILITY_TARGETS, normalizeSiteName } from '@/lib/facility-targets';
import { format, addDays, isWeekend, parseISO, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { type AncRegistration } from '@/types';

const TANZANIA_HOLIDAYS_2026 = [
  '2026-01-01', '2026-01-12', '2026-04-03', '2026-04-06', '2026-04-07', 
  '2026-04-26', '2026-05-01', '2026-07-07', '2026-08-08', '2026-10-14', 
  '2026-12-09', '2026-12-25', '2026-12-26'
];

export function FloatingMatrix() {
  const [isOpen, setIsOpen] = useState(false);
  const firestore = useFirestore();
  const [todayStr, setTodayStr] = useState<string>('');

  useEffect(() => {
    setTodayStr(format(new Date(), 'yyyy-MM-dd'));
  }, []);

  const regsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'anc_registrations'));
  }, [firestore]);

  const { data: registrations } = useCollection<AncRegistration>(regsQuery);

  const latestScheduleRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'study_ops', 'latest_ra_schedule');
  }, [firestore]);

  const { data: savedScheduleData } = useDoc<any>(latestScheduleRef);

  const schedule = savedScheduleData?.plan;
  
  const selectedStartDate = useMemo(() => {
    if (schedule?.assignments && Array.isArray(schedule.assignments) && schedule.assignments.length > 0) {
        try {
            return parseISO(schedule.assignments[0].date);
        } catch (e) {
            return startOfDay(new Date());
        }
    }
    return startOfDay(new Date());
  }, [schedule]);

  const monthlyWorkingDays = useMemo(() => {
    if (!selectedStartDate) return [];
    const days: Date[] = [];
    let current = selectedStartDate;
    while (days.length < 20) {
        const dStr = format(current, 'yyyy-MM-dd');
        if (!isWeekend(current) && !TANZANIA_HOLIDAYS_2026.includes(dStr)) {
            days.push(current);
        }
        current = addDays(current, 1);
    }
    return days;
  }, [selectedStartDate]);

  if (!schedule) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[150]">
      <motion.div 
        drag
        dragMomentum={false}
        initial={{ x: 20, y: 150 }}
        className="absolute right-6 bottom-32 pointer-events-auto"
      >
        <AnimatePresence mode="wait">
          {!isOpen ? (
            <motion.button
              key="fab"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              onClick={() => setIsOpen(true)}
              className="group h-14 w-14 rounded-2xl bg-primary text-white shadow-2xl shadow-primary/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-all ring-4 ring-white/20"
            >
              <LayoutGrid className="h-6 w-6" />
              <div className="absolute -top-1 -right-1 h-4 w-4 bg-emerald-400 rounded-full border-2 border-white animate-pulse" />
            </motion.button>
          ) : (
            <motion.div
              key="expanded"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-4 md:inset-auto md:right-10 md:bottom-10 md:w-[90vw] lg:w-[1200px] max-h-[85vh] bg-background border shadow-[0_40px_80px_rgba(0,0,0,0.3)] rounded-[2.5rem] overflow-hidden flex flex-col no-print"
            >
              <div className="flex items-center justify-between p-6 bg-primary text-white cursor-grab active:cursor-grabbing border-b">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <LayoutGrid className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-tight leading-none">Strategic Matrix</h3>
                    <p className="text-[10px] font-bold uppercase opacity-70 mt-1 tracking-widest">Global Study Deployment</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center gap-4 bg-white/10 px-4 py-1.5 rounded-full mr-4 border border-white/10">
                    <div className="flex items-center gap-2">
                        <Zap className="h-3 w-3 text-emerald-300" />
                        <span className="text-[9px] font-black uppercase tracking-widest">{schedule?.assignments?.length || 0} Site Visits</span>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setIsOpen(false)} 
                    className="h-10 w-10 rounded-xl hover:bg-white/20 text-white"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-hidden relative flex flex-col">
                <ScrollArea className="flex-1">
                  <div className="p-4">
                    <Table>
                      <TableHeader className="bg-muted/50 sticky top-0 z-20 backdrop-blur-md">
                        <TableRow>
                          <TableHead className="w-40 text-[9px] font-black uppercase border-r px-4 bg-muted/50">
                            Facility
                          </TableHead>
                          {monthlyWorkingDays.map((day, i) => (
                            <TableHead key={i} className="text-center min-w-[65px] text-[9px] font-black uppercase border-r last:border-none px-1">
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
                          <TableRow key={fIdx} className="hover:bg-primary/[0.02] border-b last:border-none group h-14">
                            <TableCell className="font-bold text-[10px] border-r px-4 whitespace-nowrap bg-background group-hover:bg-muted/10 transition-colors">
                              {facilityName.split(' (')[0]}
                            </TableCell>
                            {monthlyWorkingDays.map((day, dIdx) => {
                              const dStr = format(day, 'yyyy-MM-dd');
                              const assignments = schedule?.assignments || [];
                              const assigned = assignments.filter((a: any) => a.date === dStr && normalizeSiteName(a.facility) === normalizeSiteName(facilityName));
                              
                              return (
                                <TableCell key={dIdx} className={cn(
                                  "text-center p-1 border-r last:border-none min-w-[65px] transition-colors",
                                  assigned.length > 0 ? "bg-emerald-50/30 dark:bg-emerald-950/10" : ""
                                )}>
                                  <div className="flex flex-wrap items-center justify-center gap-0.5">
                                    {assigned.map((a: any, ai: number) => (
                                      <Popover key={ai}>
                                        <PopoverTrigger asChild>
                                          <div className={cn(
                                            "h-7 w-7 rounded-lg flex items-center justify-center text-[9px] font-black cursor-help transition-all hover:scale-110 shadow-sm border-2 border-white dark:border-slate-800",
                                            a.ra_name === 'Lucy' ? "bg-pink-500 text-white" :
                                            a.ra_name === 'Riki Mahamba' ? "bg-blue-500 text-white" :
                                            a.ra_name === 'Katie' ? "bg-amber-500 text-white" :
                                            "bg-purple-500 text-white"
                                          )}>
                                            {a.ra_name.charAt(0)}
                                          </div>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-56 p-4 rounded-2xl shadow-2xl border-none ring-1 ring-black/5" side="top">
                                          <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black uppercase px-2 py-0.5">
                                                    {a.priority_level} Priority
                                                </Badge>
                                                <span className="text-[9px] font-bold text-slate-400">{format(day, 'EEEE')}</span>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase text-muted-foreground mb-0.5">Assigned RA</p>
                                                <p className="text-sm font-black text-primary">{a.ra_name}</p>
                                            </div>
                                            <div className="p-3 bg-muted/30 rounded-xl italic text-[11px] font-medium leading-relaxed border border-dashed">
                                                "{a.reasoning}"
                                            </div>
                                          </div>
                                        </PopoverContent>
                                      </Popover>
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
                  </div>
                </ScrollArea>
                
                <div className="p-6 bg-muted/20 border-t flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                            <div className="w-2 h-2 rounded-full bg-pink-500" /> Lucy
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                            <div className="w-2 h-2 rounded-full bg-blue-500" /> Riki
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                            <div className="w-2 h-2 rounded-full bg-amber-500" /> Katie
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                            <div className="w-2 h-2 rounded-full bg-purple-500" /> Majid
                        </div>
                    </div>
                    <p className="text-[9px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
                        <ShieldCheck className="h-3 w-3" /> PartoMa Strategic Planning Active
                    </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
