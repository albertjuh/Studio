
"use client";

import type { ReactNode } from 'react';
import { useEffect, useState, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  ClipboardCheck, 
  LogOut, 
  LayoutDashboard, 
  Users,
  HeartPulse,
  Activity,
  Telescope,
  TrendingUp,
  DownloadCloud,
  CalendarDays,
  Menu,
  Database,
  ShieldCheck,
  Zap,
  Clock,
  Layers,
  Sparkles,
  Search
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ThemeToggleButton } from '@/components/layout/theme-toggle-button';
import { useCollection, useFirestore, useMemoFirebase, useAuth, useUser } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { AncRegistration } from '@/types';
import { signInAnonymously } from 'firebase/auth';
import { SyncStatusIndicator } from '@/app/anc/components/sync-status-indicator';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { NotificationPopupManager } from '@/app/anc/components/notification-popup-manager';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import placeholders from '@/app/lib/placeholder-images.json';
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

const NAV_GROUPS = [
  {
    label: "Clinical Operations",
    items: [
      { href: '/anc/activities', label: 'Activities Hub', sub: 'Primary Staff Workflow', icon: LayoutDashboard, role: ['clinician', 'admin', 'viewer'] },
      { href: '/anc/admin/timeline/due-today', label: 'Action & Forecast', sub: 'Daily Outreach Tasks', icon: Telescope, role: ['clinician', 'admin', 'viewer'] },
      { href: '/anc/participants', label: 'Study Timeline', sub: 'Pregnancy Progression', icon: HeartPulse, role: ['clinician', 'admin', 'viewer'] },
      { href: '/anc/dashboard', label: 'Cohort Registry', sub: 'Verified Data Feed', icon: Database, role: ['clinician', 'admin', 'viewer'] },
    ]
  },
  {
    label: "Management & Logistics",
    items: [
      { href: '/anc/admin/schedule', label: 'Staff Planner', sub: 'RA Deployment Grid', icon: CalendarDays, role: ['clinician', 'admin', 'viewer'] },
      { href: '/anc/admin/timeline', label: 'Cohort Analysis', sub: 'Population Statistics', icon: TrendingUp, role: ['admin', 'viewer'] },
      { href: '/anc/admin/export', label: 'Export Center', sub: 'Data Intelligence Hub', icon: DownloadCloud, role: ['admin', 'viewer'] },
    ]
  },
  {
    label: "System Intelligence",
    items: [
      { href: '/anc/notifications', label: 'Intelligence Feed', sub: 'AI Alerts & Warnings', icon: Sparkles, role: ['clinician', 'admin', 'viewer'] },
      { href: '/anc/admin/recruitment', label: 'Workload Audit', sub: 'Staff Performance Logs', icon: Activity, role: ['clinician', 'admin', 'viewer'] },
    ]
  }
];

function MobileBottomNav({ user }: { user: any }) {
  const pathname = usePathname();
  const filteredItems = NAV_GROUPS.flatMap(g => g.items).filter(item => !user || item.role.includes(user.role)).slice(0, 5);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[100] md:hidden bg-background/80 backdrop-blur-2xl border-t border-primary/10 h-20 px-4 flex items-center justify-around pb-safe shadow-[0_-8px_40px_-12px_rgba(0,0,0,0.2)]">
      {filteredItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== '/anc/activities' && pathname.startsWith(item.href));
        return (
          <Link 
            key={item.href} 
            href={item.href}
            className={cn(
              "relative flex flex-col items-center justify-center flex-1 h-full gap-1.5 transition-all duration-300",
              isActive ? "text-primary" : "text-muted-foreground/50 hover:text-primary/70"
            )}
          >
            {isActive && (
              <motion.div 
                layoutId="mobile-active-pill"
                className="absolute -top-1 h-1.5 w-10 bg-primary rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <item.icon className={cn("h-6 w-6 transition-all", isActive ? "scale-110 stroke-[2.5px] drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]" : "stroke-[1.5px]")} />
            <span className={cn("text-[9px] font-black uppercase tracking-widest", isActive ? "opacity-100" : "opacity-60")}>{item.label.split(' ')[0]}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function StudySidebar({ user }: { user: any }) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" className="border-r border-primary/10 bg-sidebar/50 backdrop-blur-3xl transition-all duration-500 group-data-[state=collapsed]:bg-sidebar/90">
      <SidebarHeader className="h-20 flex items-center px-4 md:px-6 border-b border-sidebar-border/30">
        <Link href="/anc/activities" className="flex items-center gap-4 group">
          <div className="relative shrink-0">
            <div className="p-2.5 bg-primary text-white rounded-xl group-hover:rotate-6 transition-all shadow-xl shadow-primary/30">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div className="absolute -bottom-1 -right-1 h-3.5 w-3.5 bg-emerald-400 rounded-full border-2 border-white dark:border-slate-900 animate-pulse" />
          </div>
          <div className="flex flex-col group-data-[state=collapsed]:hidden whitespace-nowrap overflow-hidden">
            <span className="text-sm font-black tracking-tighter uppercase leading-none">
              PartoMa <span className="text-primary">Project</span>
            </span>
            <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-primary/60 mt-1">Clinical Terminal</span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent className="py-6">
        {NAV_GROUPS.map((group, gIdx) => {
          const filteredGroupItems = group.items.filter(item => !user || item.role.includes(user.role));
          if (filteredGroupItems.length === 0) return null;

          return (
            <SidebarGroup key={gIdx} className="mb-4 last:mb-0">
              <SidebarGroupLabel className="px-4 text-[10px] font-black uppercase tracking-[0.25em] text-primary/40 mb-2 group-data-[state=collapsed]:hidden whitespace-nowrap">
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-2 px-2">
                  {filteredGroupItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/anc/activities' && pathname.startsWith(item.href));
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton 
                          asChild 
                          isActive={isActive} 
                          tooltip={item.label}
                          className={cn(
                            "h-auto py-3.5 transition-all duration-300 rounded-2xl relative overflow-hidden group/btn",
                            isActive 
                              ? "bg-primary/15 text-primary shadow-[inset_0_0_15px_rgba(16,185,129,0.05)] ring-1 ring-primary/40 backdrop-blur-md" 
                              : "hover:bg-primary/5 text-slate-500 hover:text-primary"
                          )}
                        >
                          <Link href={item.href} className="flex items-center gap-4 px-3 w-full">
                            <div className={cn(
                              "transition-all duration-300 shrink-0 p-2 rounded-xl",
                              isActive ? "bg-primary/10 text-primary scale-110 drop-shadow-[0_0_10px_rgba(16,185,129,0.4)]" : "group-hover/btn:bg-primary/5 group-hover/btn:text-primary"
                            )}>
                              <item.icon className={cn("h-5 w-5", isActive ? "stroke-[2.5px]" : "stroke-[1.8px]")} />
                            </div>
                            <div className="flex flex-col group-data-[state=collapsed]:hidden whitespace-nowrap overflow-hidden transition-opacity duration-300">
                                <span className="font-black text-[12px] uppercase tracking-[0.12em] leading-tight">
                                    {item.label}
                                </span>
                                <span className={cn(
                                    "text-[9px] font-bold uppercase tracking-widest opacity-40 group-hover/btn:opacity-60 transition-opacity",
                                    isActive && "text-primary opacity-60"
                                )}>
                                    {item.sub}
                                </span>
                            </div>
                            {isActive && (
                              <motion.div 
                                layoutId="active-nav-glow"
                                className="absolute right-0 top-1/2 -translate-y-1/2 h-10 w-1.5 bg-primary rounded-l-full shadow-[0_0_15px_rgba(16,185,129,0.5)] group-data-[state=collapsed]:hidden"
                              />
                            )}
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
      <SidebarFooter className="p-6 border-t border-sidebar-border/20 bg-primary/[0.03] group-data-[state=collapsed]:p-2 transition-all duration-300">
        <div className="flex flex-col gap-6 group-data-[state=collapsed]:items-center">
            <div className="group-data-[state=collapsed]:hidden">
                <SyncStatusIndicator />
            </div>
            <div className="flex items-center gap-3 group-data-[state=collapsed]:flex-col group-data-[state=collapsed]:gap-4">
                <ThemeToggleButton />
                <Button variant="ghost" size="icon" className="h-11 w-11 rounded-2xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all active:scale-95 shadow-sm">
                    <LogOut className="h-5 w-5" />
                </Button>
            </div>
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
        try {
            if (!user?.name || !registrations || !Array.isArray(registrations)) return { userCount: 0, globalCount: 0 };
            const userCount = registrations.filter(r => r && r.registeredBy === user.name).length;
            return { userCount, globalCount: registrations.length };
        } catch (e) {
            return { userCount: 0, globalCount: registrations?.length || 0 };
        }
    }, [user?.name, registrations]);

    return (
        <header className="sticky top-0 z-[50] w-full border-b border-primary/10 bg-background/40 backdrop-blur-2xl h-20 flex items-center shrink-0">
            <div className="flex h-full w-full items-center justify-between px-6 md:px-12">
                <div className="flex items-center gap-6">
                    <SidebarTrigger className="h-12 w-12 rounded-2xl bg-white/40 dark:bg-white/5 hover:bg-primary/10 hover:text-primary transition-all shadow-md active:scale-95 ring-1 ring-black/5" />
                    <div className="h-8 w-px bg-primary/10 hidden md:block" />
                    
                    <div className="hidden lg:flex items-center gap-4">
                        <div className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-2xl shadow-xl shadow-primary/20">
                            <Layers className="h-4 w-4" />
                            <span className="text-[11px] font-black uppercase tracking-[0.2em]">
                                LIVE REGISTRY
                            </span>
                        </div>
                        {user && mounted && (
                            <div className="flex items-center gap-2 px-5 py-2 bg-white/60 dark:bg-white/5 rounded-2xl border border-primary/10 shadow-sm">
                                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                                    {user.name}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden sm:flex items-center gap-8 mr-4 bg-white/40 dark:bg-black/20 px-8 py-2 rounded-2xl border border-primary/10 shadow-sm">
                        <div className="flex flex-col items-end">
                            <span className="text-[9px] font-black uppercase text-muted-foreground opacity-60 tracking-widest">Global Reach</span>
                            <span className="text-sm font-black text-primary leading-none mt-0.5">{stats.globalCount}</span>
                        </div>
                        <div className="w-px h-8 bg-primary/10" />
                        <div className="flex flex-col items-end">
                            <span className="text-[9px] font-black uppercase text-muted-foreground opacity-60 tracking-widest">Your Work</span>
                            <span className="text-sm font-black text-slate-900 dark:text-white leading-none mt-0.5">{stats.userCount}</span>
                        </div>
                    </div>
                    
                    <NotificationBell />
                    <div className="h-8 w-px bg-primary/10 mx-2" />
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={handleLogout} 
                        className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 h-12 w-12 rounded-2xl transition-all shadow-sm active:scale-95 bg-white/40 dark:bg-white/5"
                    >
                        <LogOut className="h-6 w-6" />
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
        if (!isLoginPage) {
          router.push('/anc/login');
        }
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

  if (isLoginPage) {
      return (
        <div className="relative min-h-screen flex flex-col w-full selection:bg-primary/20 selection:text-primary bg-background/5">
            <main className="flex-1 flex flex-col w-full">
                <div className="flex-1 w-full flex items-center justify-center">
                    {children}
                </div>
            </main>
        </div>
      );
  }

  return (
    <SidebarProvider defaultOpen={true}>
        <div className="relative flex min-h-screen w-full selection:bg-primary/20 selection:text-primary bg-background transition-all duration-500">
            <NotificationPopupManager />
            <StudySidebar user={localUser} />
            
            <SidebarInset className="flex flex-col min-h-screen w-full transition-all duration-500 overflow-hidden bg-transparent">
                <AncHeader user={localUser} registrations={registrations} mounted={mounted} />
                
                <main className="flex-1 flex flex-col w-full p-4 md:p-10 lg:p-16 overflow-y-auto">
                    <div className="flex-1 w-full max-w-[1800px] mx-auto pb-24 md:pb-0 relative z-10">
                        {children}
                    </div>
                </main>

                <MobileBottomNav user={localUser} />
            </SidebarInset>

            {/* Vibrant "Alive" Background Architecture */}
            <div className="fixed inset-0 -z-20 overflow-hidden pointer-events-none">
                {/* Luminous Mesh Gradients */}
                <div className="absolute top-[-20%] right-[-10%] w-[70%] h-[70%] bg-emerald-500/10 blur-[140px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-20%] left-[-10%] w-[70%] h-[70%] bg-blue-500/10 blur-[140px] rounded-full animate-pulse [animation-delay:2s]" />
                <div className="absolute top-[20%] left-[20%] w-[40%] h-[40%] bg-violet-400/5 blur-[120px] rounded-full opacity-50 animate-pulse [animation-delay:4s]" />
                
                {/* Main System Background Image */}
                <Image 
                  src={placeholders.main_background.url} 
                  alt="PartoMa Project Alive Environment" 
                  fill 
                  className="object-cover opacity-[0.08] dark:opacity-[0.12] scale-105 transition-all duration-[2000ms]" 
                  priority 
                  unoptimized
                  data-ai-hint={placeholders.main_background.hint}
                />
            </div>
            <div className="fixed inset-0 -z-30 bg-background" />
        </div>
    </SidebarProvider>
  );
}
