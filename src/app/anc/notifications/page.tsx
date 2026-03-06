
"use client";

import { useState, useMemo } from 'react';
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
  MessageSquare
} from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { type StudyNotification } from '@/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function NotificationCenter() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const notificationsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'notifications'), orderBy('created_at', 'desc'), limit(50));
  }, [firestore]);

  const { data: notifications, isLoading } = useCollection<StudyNotification>(notificationsQuery);

  const filteredNotifications = useMemo(() => {
    if (!notifications) return [];
    let filtered = notifications;

    if (filter !== 'all') {
      if (filter === 'OUTREACH') {
        filtered = filtered.filter(n => (n as any).isOutreachTask);
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

    return filtered;
  }, [notifications, filter, searchTerm]);

  const markAllRead = async () => {
    if (!firestore || !notifications) return;
    const userStr = localStorage.getItem('ancUser');
    const user = userStr ? JSON.parse(userStr) : { name: 'unknown' };
    
    const batch = writeBatch(firestore);
    notifications.forEach(n => {
        if (!n.read_by?.includes(user.name)) {
            batch.update(doc(firestore, 'notifications', n.id), {
                read_by: [...(n.read_by || []), user.name]
            });
        }
    });
    try {
        await batch.commit();
        toast({ title: "Notifications Cleared", variant: "success" });
    } catch (e) {
        toast({ title: "Update Failed", variant: "destructive" });
    }
  };

  const getIcon = (notification: any) => {
    if (notification.isOutreachTask) {
        return <MessageSquare className="h-4 w-4 text-emerald-600" />;
    }
    switch (notification.criticality) {
      case 'CRITICAL': return <AlertCircle className="h-4 w-4 text-rose-600" />;
      case 'HIGH': return <Info className="h-4 w-4 text-amber-600" />;
      default: return <BrainCircuit className="h-4 w-4 text-primary" />;
    }
  };

  const getStyles = (notification: any) => {
    if (notification.isOutreachTask) {
        return "border-emerald-200 bg-emerald-50/30 text-emerald-700";
    }
    switch (notification.criticality) {
      case 'CRITICAL': return "border-rose-200 bg-rose-50/30 text-rose-700";
      case 'HIGH': return "border-amber-200 bg-amber-50/30 text-amber-700";
      default: return "border-primary/20 bg-primary/5 text-primary";
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-24 lg:pb-12 pt-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-[10px]">
            <ShieldCheck className="h-4 w-4" /> Intelligence Feed
          </div>
          <h1 className="text-4xl font-black tracking-tighter">Intelligence Hub</h1>
          <p className="text-sm font-medium text-muted-foreground">Vulnerability monitoring and staff outreach tasks.</p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button variant="outline" size="sm" onClick={markAllRead} className="h-10 rounded-xl font-bold border-2 px-4">
            <CheckCircle2 className="mr-2 h-4 w-4" /> Clear All
          </Button>
          <Button variant="ghost" size="icon" asChild className="rounded-xl h-10 w-10">
            <Link href="/anc/notifications/preferences"><Settings className="h-5 w-5" /></Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <Tabs value={filter} onValueChange={setFilter} className="flex-1">
          <TabsList className="bg-muted/50 p-1 h-12 rounded-2xl border w-full sm:w-auto">
            <TabsTrigger value="all" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest">All</TabsTrigger>
            <TabsTrigger value="CRITICAL" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest text-rose-600 data-[state=active]:bg-rose-600 data-[state=active]:text-white">Critical</TabsTrigger>
            <TabsTrigger value="OUTREACH" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest text-emerald-600 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">Outreach</TabsTrigger>
            <TabsTrigger value="HIGH" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest text-amber-600 data-[state=active]:bg-amber-600 data-[state=active]:text-white">High</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search alerts..." 
            className="pl-10 h-12 rounded-2xl border-2 font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Scanning Intelligence...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="py-32 flex flex-col items-center justify-center text-center space-y-4 border-2 border-dashed rounded-[2.5rem] bg-muted/20">
            <div className="p-6 bg-white rounded-full shadow-sm">
                <Bell className="h-12 w-12 text-muted-foreground/30" />
            </div>
            <div>
                <h3 className="text-xl font-black tracking-tight">System Clear</h3>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest max-w-[280px]">No active intelligence alerts or staff outreach tasks found.</p>
            </div>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <Card key={notification.id} className={cn(
                "border-none ring-1 ring-border shadow-none group transition-all duration-300 hover:ring-primary/40 rounded-[2rem] overflow-hidden",
                !notification.read_by?.includes('admin') && "bg-primary/[0.02] ring-primary/20"
            )}>
              <CardContent className="p-0">
                <div className="flex items-start gap-4 p-6">
                  <div className={cn(
                    "p-3 rounded-2xl flex-shrink-0 transition-transform group-hover:rotate-6",
                    getStyles(notification)
                  )}>
                    {getIcon(notification)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                            {(notification as any).isOutreachTask ? 'Staff Outreach Task' : `${notification.criticality} Alert`}
                        </span>
                        {notification.facility && (
                            <>
                            <div className="w-1 h-1 rounded-full bg-slate-300" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                                {notification.facility}
                            </span>
                            </>
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-muted-foreground">
                        {notification.created_at?.toDate ? format(notification.created_at.toDate(), 'HH:mm a') : 'Now'}
                      </span>
                    </div>
                    <h3 className="text-lg font-black tracking-tight">{notification.title}</h3>
                    <p className="text-sm font-medium text-slate-600 leading-relaxed max-w-2xl">
                      {notification.body}
                    </p>
                    <div className="pt-4 flex items-center gap-3">
                        <Button variant="ghost" size="sm" className="h-9 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-primary/10" asChild>
                            <Link href={notification.participant_id ? `/anc/dashboard?search=${notification.participant_id}` : '#'}>
                                View Participant <ChevronRight className="ml-1.5 h-3.5 w-3.5" />
                            </Link>
                        </Button>
                        {(notification as any).isOutreachTask && (
                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none font-black text-[9px] uppercase">
                                <Users className="h-3 w-3 mr-1" /> Staff Action Needed
                            </Badge>
                        )}
                        {notification.criticality === 'CRITICAL' && (
                            <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-200 border-none font-black text-[9px] uppercase">
                                High Urgency
                            </Badge>
                        )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="pt-16 flex flex-col items-center gap-4 opacity-30 text-center pb-8">
        <BrainCircuit className="h-6 w-6" />
        <p className="text-[9px] font-black uppercase tracking-[0.4em] leading-relaxed">
            PartoMa Intelligence Protocol v1.5<br/>
            Autonomous Staff Task Monitoring Active
        </p>
      </div>
    </div>
  );
}
