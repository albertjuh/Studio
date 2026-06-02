"use client";

import { useState, useMemo, useEffect, useRef } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, doc, writeBatch } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  Bell, 
  AlertCircle, 
  Info, 
  ChevronRight, 
  CheckCircle2, 
  ShieldCheck, 
  Search,
  Settings,
  BrainCircuit,
  Loader2,
  Users,
  MessageSquare,
  Sparkles,
  ChevronDown,
  Clock
, Phone} from 'lucide-react';
import { format, formatDistanceToNow, subDays } from 'date-fns';
import Link from 'next/link';
import { type StudyNotification, type AncRegistration } from '@/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { resolveParticipantStatuses } from '@/lib/timeline/formulas';

export default function NotificationCenter() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [displayLimit, setDisplayLimit] = useState(10);
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const autoMarkedRef = useRef(false);

  useEffect(() => {
    const userStr = localStorage.getItem('ancUser');
    if (userStr) {
      const userData = JSON.parse(userStr);
      setUser(userData);
      
      // Update User-specific Last Viewed timestamp to clear local counts
      const key = `anc_last_viewed_notifications_${userData.name}`;
      localStorage.setItem(key, new Date().toISOString());
    }
  }, []);

  const notificationsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'notifications'), orderBy('created_at', 'desc'), limit(30));
  }, [firestore]);

  const participantsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'anc_registrations');
  }, [firestore]);

  const { data: notifications, isLoading } = useCollection<StudyNotification>(notificationsQuery);
  const { data: participants } = useCollection<AncRegistration>(participantsQuery);

  // Automatically mark visible DB notifications as read for this user on load
  useEffect(() => {
    if (firestore && user && notifications && !autoMarkedRef.current) {
        const unread = notifications.filter(n => !n.read_by?.includes(user.name));
        if (unread.length > 0) {
            const batch = writeBatch(firestore);
            unread.forEach(n => {
                batch.update(doc(firestore, 'notifications', n.id), {
                    read_by: [...(n.read_by || []), user.name]
                });
            });
            batch.commit().catch(() => {});
        }
        autoMarkedRef.current = true;
    }
  }, [firestore, user, notifications]);

  const combinedItems = useMemo(() => {
    const alerts = notifications ? [...notifications] : [];
    
    if (participants) {
        participants.forEach(p => {
            const resolved = resolveParticipantStatuses(p);
            if (!resolved) return;
            
            // 1. Task: Due Now (Action Required)
            if (resolved.overall_status === 'action_needed') {
                const activeSurvey = resolved.survey2_status === 'due_now' ? 2 : resolved.survey3_status === 'due_now' ? 3 : 4;
                const windowOpenDate = resolved[`survey${activeSurvey}_window_open` as keyof typeof resolved] as Date;
                
                alerts.push({
                    id: `task_${p.id}_s${activeSurvey}`,
                    title: `Outreach Task: Survey ${activeSurvey} Window Open`,
                    body: `${p.name} (${p.participantId}) is currently in the data collection window for Survey ${activeSurvey}. Outreach is required today.`,
                    criticality: 'HIGH',
                    isOutreachTask: true,
                    facility: p.healthFacility,
                    participant_id: p.id,
                    created_at: { toDate: () => windowOpenDate || new Date() },
                    read_by: []
                } as any);
            }

            // 2. Alert: Overdue (Critical Recovery)
            if (resolved.overall_status === 'overdue') {
                const activeSurvey = resolved.survey2_status === 'overdue' ? 2 : resolved.survey3_status === 'overdue' ? 3 : 4;
                const windowCloseDate = resolved[`survey${activeSurvey}_window_close` as keyof typeof resolved] as Date;

                alerts.push({
                    id: `alert_${p.id}_s${activeSurvey}`,
                    title: `Critical Alert: Survey ${activeSurvey} Window Passed`,
                    body: `${p.name} (${p.participantId}) has exceeded the timeline for Survey ${activeSurvey}. Immediate recovery outreach is required.`,
                    criticality: 'CRITICAL',
                    isOutreachTask: true,
                    facility: p.healthFacility,
                    participant_id: p.id,
                    created_at: { toDate: () => windowCloseDate || new Date() },
                    read_by: []
                } as any);
            }

            // 3. Forecast: Due Soon (Early Prep)
            const hasUpcoming = resolved.survey2_status === 'due_soon' || resolved.survey3_status === 'due_soon' || resolved.survey4_status === 'due_soon';
            if (hasUpcoming && resolved.overall_status === 'on_track') {
                const activeSurvey = resolved.survey2_status === 'due_soon' ? 2 : resolved.survey3_status === 'due_soon' ? 3 : 4;
                const windowOpenDate = resolved[`survey${activeSurvey}_window_open` as keyof typeof resolved] as Date;
                const forecastAchievedDate = resolved[`survey${activeSurvey}_forecast_date` as keyof typeof resolved] as Date;
                const surveyLabel = activeSurvey === 2 ? '34-38 week phone call' : activeSurvey === 3 ? 'delivery record collection' : '6-week postpartum follow-up';
                
                alerts.push({
                    id: `forecast_${p.id}_s${activeSurvey}`,
                    title: `Forecast: Survey ${activeSurvey} Preparation`,
                    body: `${p.name} (${p.participantId}) is entering the 14-day preparation period for her ${surveyLabel}. Current GA is ${resolved.current_ga.weeks}+${resolved.current_ga.days} weeks.`,
                    criticality: 'MEDIUM',
                    isForecast: true,
                    facility: p.healthFacility,
                    participant_id: p.id,
                    created_at: { toDate: () => forecastAchievedDate || new Date() },
                    read_by: []
                } as any);
            }
        });
    }

    return alerts.sort((a, b) => {
        const dateA = a.created_at?.toDate ? a.created_at.toDate() : new Date();
        const dateB = b.created_at?.toDate ? b.created_at.toDate() : new Date();
        return dateB.getTime() - dateA.getTime();
    });
  }, [notifications, participants]);

  const filteredNotifications = useMemo(() => {
    let filtered = combinedItems;

    if (filter !== 'all') {
      if (filter === 'OUTREACH') {
        filtered = filtered.filter(n => (n as any).isOutreachTask);
      } else if (filter === 'FORECAST') {
        filtered = filtered.filter(n => (n as any).isForecast);
      } else {
        filtered = filtered.filter(n => n.criticality === filter);
      }
    }

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(n => 
        n.title.toLowerCase().includes(lower) || 
        n.body.toLowerCase().includes(lower) ||
        n.facility?.toLowerCase().includes(lower) ||
        n.participant_id?.toLowerCase().includes(lower)
      );
    }

    return {
        visible: filtered.slice(0, displayLimit),
        total: filtered.length
    };
  }, [combinedItems, filter, searchTerm, displayLimit]);

  const markAllRead = async () => {
    if (!firestore || !notifications || !user) return;
    
    const batch = writeBatch(firestore);
    let count = 0;
    notifications.forEach(n => {
        if (!n.read_by?.includes(user.name)) {
            batch.update(doc(firestore, 'notifications', n.id), {
                read_by: [...(n.read_by || []), user.name]
            });
            count++;
        }
    });

    if (count === 0) {
        toast({ title: "Notifications Already Read", variant: "default" });
        return;
    }

    try {
        await batch.commit();
        toast({ title: `${count} Alerts Cleared`, variant: "success" });
    } catch (e) {
        toast({ title: "Update Failed", variant: "destructive" });
    }
  };

  const getIcon = (notification: any) => {
    if (notification.isOutreachTask) {
        return notification.criticality === 'CRITICAL' ? <AlertCircle className="h-5 w-5 text-rose-600" /> : <Clock className="h-5 w-5 text-emerald-600" />;
    }
    if (notification.isForecast) {
        return <Sparkles className="h-5 w-5 text-blue-600" />;
    }
    switch (notification.criticality) {
      case 'CRITICAL': return <AlertCircle className="h-5 w-5 text-rose-600" />;
      case 'HIGH': return <Info className="h-5 w-5 text-amber-600" />;
      default: return <BrainCircuit className="h-5 w-5 text-primary" />;
    }
  };

  const getStyles = (notification: any) => {
    if (notification.isOutreachTask) {
        return notification.criticality === 'CRITICAL' ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700";
    }
    if (notification.isForecast) {
        return "border-blue-200 bg-blue-50 text-blue-700";
    }
    switch (notification.criticality) {
      case 'CRITICAL': return "border-rose-200 bg-rose-50 text-rose-700";
      case 'HIGH': return "border-amber-200 bg-amber-50 text-amber-700";
      default: return "border-primary/10 bg-primary/5 text-primary";
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 md:space-y-12 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-primary font-black uppercase tracking-[0.3em] text-[10px]">
            <ShieldCheck className="h-4 w-4" /> Intelligence Feed
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tighter">Intelligence Hub</h1>
          <p className="text-sm font-medium text-muted-foreground">Strategic monitoring and automated staff task assignment.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <Button variant="outline" size="sm" onClick={markAllRead} className="h-11 rounded-xl font-black uppercase tracking-widest text-[10px] border-2 px-6 shadow-sm flex-1 md:flex-none">
            <CheckCircle2 className="mr-2 h-4 w-4" /> Clear Alerts
          </Button>
          <Button variant="secondary" size="icon" asChild className="rounded-xl h-11 w-11 shadow-sm">
            <Link href="/anc/notifications/preferences"><Settings className="h-5 w-5" /></Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <Tabs value={filter} onValueChange={setFilter} className="flex-1">
          <TabsList className="bg-slate-100/80 dark:bg-slate-900/80 p-1 h-12 rounded-2xl border w-full md:w-auto">
            <TabsTrigger value="all" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest">All</TabsTrigger>
            <TabsTrigger value="CRITICAL" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest text-rose-600 data-[state=active]:bg-rose-600 data-[state=active]:text-white">Critical</TabsTrigger>
            <TabsTrigger value="OUTREACH" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest text-emerald-600 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">Action</TabsTrigger>
            <TabsTrigger value="FORECAST" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest text-blue-600 data-[state=active]:bg-blue-600 data-[state=active]:text-white">Forecast</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="Search alerts..." 
            className="pl-12 h-12 rounded-2xl border-none ring-1 ring-border bg-white dark:bg-card font-bold text-sm shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-6">
        {isLoading ? (
          <div className="py-40 flex flex-col items-center justify-center gap-6">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground">Scanning Intelligence...</p>
          </div>
        ) : filteredNotifications.visible.length === 0 ? (
          <div className="py-40 flex flex-col items-center justify-center text-center space-y-6 border-2 border-dashed rounded-[3rem] bg-slate-50/50 dark:bg-slate-900/10">
            <div className="p-8 bg-white dark:bg-card rounded-3xl shadow-sm ring-1 ring-border">
                <Bell className="h-16 w-16 text-muted-foreground/20" />
            </div>
            <div className="space-y-1">
                <h3 className="text-xl font-black tracking-tight">System Clear</h3>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest max-w-[320px]">No active intelligence alerts or staff outreach tasks found.</p>
            </div>
          </div>
        ) : (
          <>
            {filteredNotifications.visible.map((notification) => (
                <Card key={notification.id} className={cn(
                    "border-none ring-1 ring-border/50 shadow-sm group transition-all duration-300 hover:ring-primary/40 rounded-[2rem] overflow-hidden bg-white dark:bg-card",
                    user && !notification.read_by?.includes(user.name) && !notification.id.startsWith('task_') && !notification.id.startsWith('alert_') && "bg-primary/[0.02] ring-primary/20"
                )}>
                <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row items-start gap-6 p-6 md:p-8">
                    <div className={cn(
                        "p-4 rounded-2xl flex-shrink-0 transition-transform group-hover:rotate-6 shadow-sm ring-1",
                        getStyles(notification)
                    )}>
                        {getIcon(notification)}
                    </div>
                    <div className="flex-1 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">
                                    {(notification as any).isForecast ? 'Follow-up Forecast' : (notification as any).isOutreachTask ? (notification.criticality === 'CRITICAL' ? 'Critical Recovery' : 'Staff Outreach Task') : `${notification.criticality} Alert`}
                                </span>
                                {notification.facility && (
                                    <>
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                                        {notification.facility.split(' (')[0]}
                                    </span>
                                    </>
                                )}
                            </div>
                            <span className="text-[10px] font-black text-muted-foreground tabular-nums bg-slate-50 dark:bg-slate-900 px-3 py-1 rounded-lg" suppressHydrationWarning>
                                {notification.created_at?.toDate ? formatDistanceToNow(notification.created_at.toDate(), { addSuffix: true }) : 'Now'}
                            </span>
                        </div>
                        <h3 className="text-xl font-black tracking-tight">{notification.title}</h3>
                        <p className="text-base font-medium text-slate-600 dark:text-slate-400 leading-relaxed max-w-3xl">
                            {notification.body}
                        </p>
                        <div className="pt-6 flex flex-wrap items-center gap-4">
                            <Button variant="secondary" size="sm" className="h-10 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-primary/10 active:scale-95 transition-all" asChild>
                                <Link href={notification.participant_id ? `/anc/participants/${notification.participant_id}` : '#'}>
                                    Open Timeline <ChevronRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                            {(notification as any).isForecast && (
                                <Badge className="bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-200 font-black text-[9px] uppercase tracking-widest px-3 h-7 rounded-xl">
                                    <Sparkles className="h-3 w-3 mr-2" /> Early Prep Mode
                                </Badge>
                            )}
                            {(notification as any).isOutreachTask && (
                                <Badge className={cn(
                                    "border-none font-black text-[9px] uppercase tracking-widest px-3 h-7 rounded-xl flex items-center",
                                    notification.criticality === 'CRITICAL' ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200" : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                )}>
                                    <Users className="h-3.5 w-3.5 mr-2" /> Staff Action Required
                                </Badge>
                            )}
                        </div>
                    </div>
                    </div>
                </CardContent>
                </Card>
            ))}
            
            {filteredNotifications.total > displayLimit && (
                <div className="pt-10 flex justify-center">
                    <Button 
                        variant="outline" 
                        onClick={() => setDisplayLimit(prev => prev + 10)}
                        className="font-black uppercase tracking-[0.3em] text-[10px] gap-3 hover:bg-primary/5 h-14 px-12 rounded-2xl border-2 border-dashed border-primary/20 transition-all"
                    >
                        Load More Intelligence ({filteredNotifications.total - displayLimit} remaining) <ChevronDown className="h-4 w-4" />
                    </Button>
                </div>
            )}
          </>
        )}
      </div>

      <div className="pt-20 flex flex-col items-center gap-6 opacity-30 text-center pb-12">
        <BrainCircuit className="h-10 w-10 text-primary" />
        <p className="text-[10px] font-black uppercase tracking-[0.5em] leading-relaxed">
            PartoMa Intelligence Protocol v1.8<br/>
            Real-time Timeline Synchronization Active
        </p>
      </div>
    </div>
  );
}
