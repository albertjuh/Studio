
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
  Sparkles,
  ChevronDown,
  Clock
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
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
      localStorage.setItem(`anc_last_viewed_notifications_${userData.name}`, new Date().toISOString());
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
            if (resolved.overall_status === 'action_needed' || resolved.overall_status === 'overdue') {
                alerts.push({
                    id: `task_${p.id}`,
                    title: `Outreach: ${p.name}`,
                    body: `${p.participantId} is in an active window.`,
                    criticality: resolved.overall_status === 'overdue' ? 'CRITICAL' : 'HIGH',
                    isOutreachTask: true,
                    facility: p.healthFacility,
                    participant_id: p.id,
                    created_at: { toDate: () => new Date() },
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
    if (filter !== 'all') filtered = filtered.filter(n => (filter === 'OUTREACH' ? (n as any).isOutreachTask : n.criticality === filter));
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(n => n.title.toLowerCase().includes(lower) || n.body.toLowerCase().includes(lower));
    }
    return { visible: filtered.slice(0, displayLimit), total: filtered.length };
  }, [combinedItems, filter, searchTerm, displayLimit]);

  const getIcon = (notification: any) => {
    if (notification.isOutreachTask) return notification.criticality === 'CRITICAL' ? <AlertCircle className="h-4 w-4 text-rose-600" /> : <Clock className="h-4 w-4 text-emerald-600" />;
    switch (notification.criticality) {
      case 'CRITICAL': return <AlertCircle className="h-4 w-4 text-rose-600" />;
      case 'HIGH': return <Info className="h-4 w-4 text-amber-600" />;
      default: return <BrainCircuit className="h-4 w-4 text-primary" />;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4 pb-6">
      <div className="flex flex-row justify-between items-center gap-4">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 text-primary font-black uppercase tracking-widest text-[8px]">
            <ShieldCheck className="h-3 w-3" /> Intel Feed
          </div>
          <h1 className="text-xl font-black tracking-tighter">Intelligence Hub</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-8 rounded-lg font-black uppercase tracking-widest text-[8px] px-4" onClick={() => toast({ title: "Cleared" })}>
            <CheckCircle2 className="mr-1.5 h-3 w-3" /> Clear
          </Button>
          <Button variant="secondary" size="icon" asChild className="h-8 w-8 rounded-lg"><Link href="/anc/notifications/preferences"><Settings className="h-3.5 w-3.5" /></Link></Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <Tabs value={filter} onValueChange={setFilter} className="flex-1">
          <TabsList className="h-8 p-1 rounded-lg border w-full md:w-auto">
            <TabsTrigger value="all" className="rounded-md px-3 font-black uppercase text-[8px] tracking-widest">All</TabsTrigger>
            <TabsTrigger value="CRITICAL" className="rounded-md px-3 font-black uppercase text-[8px] tracking-widest text-rose-600">Critical</TabsTrigger>
            <TabsTrigger value="OUTREACH" className="rounded-md px-3 font-black uppercase text-[8px] tracking-widest text-emerald-600">Action</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input placeholder="Search alerts..." className="pl-8 h-8 rounded-lg text-[10px] font-bold" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        {isLoading ? (
          <div className="py-20 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>
        ) : filteredNotifications.visible.length === 0 ? (
          <div className="py-20 text-center border-2 border-dashed rounded-xl bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-300">System Clear</div>
        ) : (
          filteredNotifications.visible.map((notification) => (
            <Card key={notification.id} className={cn("border-none ring-1 ring-border/50 shadow-sm rounded-xl overflow-hidden bg-white dark:bg-card transition-all", user && !notification.read_by?.includes(user.name) && "ring-primary/20 bg-primary/[0.01]")}>
              <CardContent className="p-3">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-slate-50 border shrink-0">{getIcon(notification)}</div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-4">
                        <span className="text-[7px] font-black uppercase tracking-widest text-slate-400">
                            {notification.facility?.split(' (')[0] || 'System'} • {notification.created_at?.toDate ? formatDistanceToNow(notification.created_at.toDate(), { addSuffix: true }) : 'Now'}
                        </span>
                    </div>
                    <h3 className="text-xs font-black tracking-tight">{notification.title}</h3>
                    <p className="text-[10px] font-medium text-slate-500 leading-tight truncate">{notification.body}</p>
                    <div className="pt-2">
                        <Button variant="secondary" size="sm" className="h-6 rounded-md text-[7px] font-black uppercase tracking-widest h-6" asChild>
                            <Link href={notification.participant_id ? `/anc/participants/${notification.participant_id}` : '#'}>Open timeline <ChevronRight className="ml-1 h-2.5 w-2.5" /></Link>
                        </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {filteredNotifications.total > displayLimit && (
        <div className="flex justify-center pt-2">
          <Button variant="outline" size="sm" onClick={() => setDisplayLimit(prev => prev + 10)} className="h-8 rounded-lg font-black uppercase text-[8px] tracking-widest px-8">Load More</Button>
        </div>
      )}
    </div>
  );
}
