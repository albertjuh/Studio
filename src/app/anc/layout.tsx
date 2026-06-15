
"use client";

import type { ReactNode } from 'react';
import { useEffect, useState, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  ClipboardCheck, 
  LogOut, 
  LayoutDashboard, 
  HeartPulse,
  Activity,
  Telescope,
  TrendingUp,
  DownloadCloud,
  Database,
  ShieldCheck,
  Sparkles,
  FileText,
  PlusCircle,
  X,
  User,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ThemeToggleButton } from '@/components/layout/theme-toggle-button';
import { useCollection, useFirestore, useMemoFirebase, useAuth, useUser } from '@/firebase';
import { collection, query, where, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import type { AncRegistration } from '@/types';
import { signInAnonymously } from 'firebase/auth';
import { SyncStatusIndicator } from '@/app/anc/components/sync-status-indicator';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { NotificationPopupManager } from '@/app/anc/components/notification-popup-manager';
import { cn } from '@/lib/utils';
import { 
  SidebarProvider, 
  Sidebar, 
  SidebarContent, 
  SidebarHeader, 
  SidebarFooter, 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton,
  SidebarTrigger,
  SidebarInset,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent
} from '@/components/ui/sidebar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

const NAV_GROUPS = [
  {
    label: "Ops",
    items: [
      { href: '/anc/activities', label: 'Hub', sub: 'Primary', icon: LayoutDashboard, role: ['clinician', 'admin', 'viewer'] },
      { href: '/anc/admin/timeline/due-today', label: 'Actions', sub: 'Daily', icon: Telescope, role: ['clinician', 'admin', 'viewer'] },
      { href: '/anc/participants', label: 'Timeline', sub: 'Pregnancy', icon: HeartPulse, role: ['clinician', 'admin', 'viewer'] },
      { href: '/anc/dashboard', label: 'Registry', sub: 'Data', icon: Database, role: ['clinician', 'admin', 'viewer'] },
    ]
  },
  {
    label: "Insights",
    items: [
      { href: '/anc/study-notes', label: 'Notes Hub', sub: 'Qualitative', icon: FileText, role: ['admin', 'clinician', 'viewer'] },
      { href: '/anc/admin/timeline', label: 'Analysis', sub: 'Stats', icon: TrendingUp, role: ['admin', 'viewer'] },
      { href: '/anc/admin/export', label: 'Export', sub: 'Intel', icon: DownloadCloud, role: ['admin', 'viewer'] },
    ]
  }
];

function QuickNote() {
    const firestore = useFirestore();
    const { user: fbUser } = useUser();
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [isSaving, setIsLogging] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [search, setSearch] = useState('');

    const [form, setForm] = useState({
        participantId: '', participantName: '', facility: '',
        title: '', content: '', category: 'Clinical Observation' as any,
        importance: 'medium' as any
    });

    useEffect(() => {
        const u = localStorage.getItem('ancUser');
        if (u) setUser(JSON.parse(u));
    }, []);

    const partsQuery = useMemoFirebase(() => {
        if (!firestore || search.length < 2) return null;
        return collection(firestore, 'anc_registrations');
    }, [firestore, search]);

    const { data: participants } = useCollection<AncRegistration>(partsQuery);

    const filteredParticipants = useMemo(() => {
        if (!participants) return [];
        return participants.filter(p => 
            p.name.toLowerCase().includes(search.toLowerCase()) || 
            p.participantId.toLowerCase().includes(search.toLowerCase())
        ).slice(0, 5);
    }, [participants, search]);

    const handleSave = async () => {
        if (!firestore || !fbUser || !user || !form.participantId) return;
        setIsLogging(true);
        try {
            await addDoc(collection(firestore, 'participant_notes'), {
                participant_id: form.participantId,
                participant_name: form.participantName,
                participant_facility: form.facility,
                author_id: fbUser.uid,
                author_name: user.name,
                author_role: user.role,
                category: form.category,
                title: form.title,
                content: form.content,
                importance: form.importance,
                visibility: 'all_team',
                requires_followup: false,
                created_at: serverTimestamp(),
                updated_at: serverTimestamp(),
                edited: false
            });
            toast({ title: "Note Recorded", variant: "success" });
            setIsOpen(false);
            setForm({ participantId: '', participantName: '', facility: '', title: '', content: '', category: 'Clinical Observation', importance: 'medium' });
            setSearch('');
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setIsLogging(false);
        }
    };

    return (
        <>
            <Button 
                onClick={() => setIsOpen(true)}
                className="fixed bottom-20 right-6 z-[60] h-14 w-14 rounded-2xl bg-violet-600 text-white shadow-2xl shadow-violet-500/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-all md:bottom-10"
            >
                <PlusCircle className="h-7 w-7" />
            </Button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="rounded-[2.5rem] sm:max-w-lg border-none shadow-3xl p-0 overflow-hidden bg-white">
                    <DialogHeader className="p-6 bg-violet-600 text-white border-b">
                        <DialogTitle className="text-xl font-black uppercase tracking-tight">Quick Study Note</DialogTitle>
                        <DialogDescription className="text-[10px] font-bold text-violet-100 uppercase tracking-widest">Global Capture Unit</DialogDescription>
                    </DialogHeader>
                    <div className="p-6 space-y-5">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400">Search Participant</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Type name or ID..." className="pl-10 h-11 rounded-xl" />
                            </div>
                            {search.length >= 2 && filteredParticipants.length > 0 && (
                                <div className="mt-2 bg-slate-50 rounded-xl border border-slate-100 p-2 space-y-1 shadow-inner">
                                    {filteredParticipants.map(p => (
                                        <button 
                                            key={p.id} 
                                            onClick={() => { setForm({...form, participantId: p.id, participantName: p.name, facility: p.healthFacility}); setSearch(p.name); }}
                                            className={cn("w-full text-left p-2 rounded-lg text-xs font-bold transition-colors", form.participantId === p.id ? "bg-violet-600 text-white" : "hover:bg-white")}
                                        >
                                            {p.name} • {p.participantId}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400">Category</Label>
                            <Select value={form.category} onValueChange={(v: any) => setForm({...form, category: v})}>
                                <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {["Clinical Observation", "Behavioral Pattern", "Social Context", "Family Dynamics", "Adverse Event", "Other"].map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400">Observation Title</Label>
                            <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="h-11 rounded-xl" placeholder="Summary of observation..." />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400">Note Content</Label>
                            <Textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})} className="rounded-xl min-h-[100px]" placeholder="Detailed insights..." />
                        </div>
                    </div>
                    <DialogFooter className="p-6 bg-slate-50 border-t flex gap-3">
                        <Button variant="ghost" onClick={() => setIsOpen(false)} className="rounded-xl font-bold">Cancel</Button>
                        <Button onClick={handleSave} disabled={isSaving || !form.participantId || !form.title || !form.content} className="flex-1 rounded-xl font-black uppercase text-[10px] bg-violet-600 hover:bg-violet-700 text-white">
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />} Save Note
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

function MobileBottomNav({ user }: { user: any }) {
  const pathname = usePathname();
  const filteredItems = NAV_GROUPS.flatMap(g => g.items).filter(item => !user || item.role.includes(user.role)).slice(0, 5);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[40] md:hidden bg-background/90 backdrop-blur-xl border-t h-12 flex items-center justify-around pb-safe shadow-lg">
      {filteredItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== '/anc/activities' && pathname.startsWith(item.href));
        return (
          <Link 
            key={item.href} 
            href={item.href}
            className={cn(
              "relative flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all duration-300",
              isActive ? "text-primary" : "text-muted-foreground/50"
            )}
          >
            <item.icon className={cn("h-4 w-4", isActive ? "stroke-[2.5px]" : "stroke-[1.5px]")} />
            <span className={cn("text-[7px] font-black uppercase tracking-widest", isActive ? "opacity-100" : "opacity-40")}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function StudySidebar({ user }: { user: any }) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" className="border-r bg-sidebar/50 backdrop-blur-xl">
      <SidebarHeader className="h-12 flex items-center px-1 border-b border-primary/10">
        <Link href="/anc/activities" className="flex items-center gap-1.5 group">
          <div className="p-1 bg-primary text-white rounded-md shadow-sm">
            <ClipboardCheck className="h-3 w-3" />
          </div>
          <div className="flex flex-col group-data-[state=collapsed]:hidden">
            <span className="text-[10px] font-black tracking-tighter uppercase leading-none">
              PartoMa <span className="text-primary italic">Project</span>
            </span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent className="py-1">
        {NAV_GROUPS.map((group, gIdx) => {
          const filteredGroupItems = group.items.filter(item => !user || item.role.includes(user.role));
          if (filteredGroupItems.length === 0) return null;

          return (
            <SidebarGroup key={gIdx} className="mb-0 p-0">
              <SidebarGroupLabel className="px-1 text-[7px] font-black uppercase tracking-[0.2em] text-primary/30 group-data-[state=collapsed]:hidden h-6 flex items-center">
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-px">
                  {filteredGroupItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/anc/activities' && pathname.startsWith(item.href));
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton 
                          asChild 
                          isActive={isActive} 
                          className={cn(
                            "h-8 transition-all rounded-none relative group/btn border-l-2 border-transparent",
                            isActive ? "bg-primary/5 text-primary border-primary" : "text-slate-500 hover:bg-primary/5"
                          )}
                        >
                          <Link href={item.href} className="flex items-center gap-1.5 px-1 w-full">
                            <item.icon className={cn("h-3.5 w-3.5", isActive ? "stroke-[2.5px]" : "stroke-[1.8px]")} />
                            <div className="flex flex-col group-data-[state=collapsed]:hidden min-w-0">
                                <span className="font-black text-[9px] uppercase tracking-tight leading-none truncate">
                                    {item.label}
                                </span>
                            </div>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
      <SidebarFooter className="p-1 border-t bg-primary/[0.02]">
        <div className="flex flex-col gap-1 group-data-[state=collapsed]:items-center">
            <SyncStatusIndicator />
            <ThemeToggleButton />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

function AncHeader({ user, registrations, mounted }: { user: any; registrations: AncRegistration[] | null; mounted: boolean }) {
    const router = useRouter();
    const { toast } = useToast();

    const handleLogout = () => {
        localStorage.removeItem('ancUser');
        toast({ title: 'Logged Out', variant: 'success' });
        router.push('/anc/login');
    };

    const stats = useMemo(() => {
        if (!user?.name || !registrations || !Array.isArray(registrations)) return { userCount: 0, globalCount: 0 };
        return { 
            userCount: registrations.filter(r => r && r.registeredBy === user.name).length,
            globalCount: registrations.length 
        };
    }, [user?.name, registrations]);

    return (
        <header className="sticky top-0 z-[50] w-full border-b bg-background/80 backdrop-blur-md h-10 flex items-center shrink-0">
            <div className="flex-1 flex items-center justify-between px-3">
                <div className="flex items-center gap-2">
                    <SidebarTrigger className="h-7 w-7 rounded-md" />
                    {user && mounted && (
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border">
                            {user.name}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white border rounded shadow-sm">
                        <span className="text-[9px] font-black text-primary tabular-nums">{stats.globalCount}</span>
                        <div className="w-px h-2.5 bg-border" />
                        <span className="text-[9px] font-black text-slate-900 tabular-nums">{stats.userCount}</span>
                    </div>
                    <NotificationBell />
                    <Button variant="ghost" size="icon" onClick={handleLogout} className="h-7 w-7 rounded-md text-slate-400 hover:text-rose-600">
                        <LogOut className="h-3 w-3" />
                    </Button>
                </div>
            </div>
        </header>
    );
}

export default function AncLayout({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const router = useRouter();
  const { user: fbUser, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [mounted, setMounted] = useState(false);
  const [localUser, setLocalUser] = useState<any>(null);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isLoginPage = pathname?.startsWith('/anc/login');

  useEffect(() => {
    if (mounted) {
      const stored = localStorage.getItem('ancUser');
      if (stored) {
        setLocalUser(JSON.parse(stored));
      } else {
        setLocalUser(null);
        if (!isLoginPage) router.push('/anc/login');
      }
    }
  }, [pathname, mounted, isLoginPage, router]);

  useEffect(() => {
    if (mounted && !isUserLoading && !fbUser && auth) {
      signInAnonymously(auth).catch(() => {});
    }
  }, [mounted, isUserLoading, fbUser, auth]);

  const regsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'anc_registrations') : null, [firestore]);
  const { data: registrations } = useCollection<AncRegistration>(regsQuery);

  if (!mounted) return null;

  if (isLoginPage) return <div className="min-h-screen bg-muted/40">{children}</div>;

  return (
    <SidebarProvider defaultOpen={true} style={{ "--sidebar-width": "11rem" } as any}>
        <div className="relative flex min-h-screen w-full bg-background overflow-hidden h-svh">
            <NotificationPopupManager />
            <QuickNote />
            <StudySidebar user={localUser} />
            <SidebarInset className="flex flex-col flex-1 !bg-transparent h-svh">
                <AncHeader user={localUser} registrations={registrations} mounted={mounted} />
                <main className="flex-1 flex flex-col w-full bg-transparent overflow-y-auto pb-12 md:pb-2">
                    <div className="flex-1 w-full px-2 md:px-4 py-2 relative z-10">
                        <div className="max-w-[1400px] mx-auto">
                            {children}
                        </div>
                    </div>
                </main>
                <MobileBottomNav user={localUser} />
            </SidebarInset>
        </div>
    </SidebarProvider>
  );
}
