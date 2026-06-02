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
  Sparkles
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
import { motion } from 'framer-motion';
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
    <nav className="fixed bottom-0 left-0 right-0 z-[40] md:hidden bg-background/80 backdrop-blur-3xl border-t border-primary/20 h-14 px-4 flex items-center justify-around pb-safe shadow-[0_-8px_40px_-12px_rgba(0,0,0,0.2)]">
      {filteredItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== '/anc/activities' && pathname.startsWith(item.href));
        return (
          <Link 
            key={item.href} 
            href={item.href}
            className={cn(
              "relative flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all duration-300",
              isActive ? "text-primary" : "text-muted-foreground/50 hover:text-primary/70"
            )}
          >
            {isActive && (
              <motion.div 
                layoutId="mobile-active-pill"
                className="absolute -top-1 h-1 w-6 bg-primary rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <item.icon className={cn("h-4 w-4 transition-all", isActive ? "scale-110 stroke-[2.5px]" : "stroke-[1.5px]")} />
            <span className={cn("text-[7px] font-black uppercase tracking-widest", isActive ? "opacity-100" : "opacity-60")}>{item.label.split(' ')[0]}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function StudySidebar({ user }: { user: any }) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" className="border-r border-primary/20 bg-sidebar/40 backdrop-blur-3xl transition-all duration-500 group-data-[state=collapsed]:bg-sidebar/80">
      <SidebarHeader className="h-14 flex items-center px-4 md:px-6 border-b border-primary/10">
        <Link href="/anc/activities" className="flex items-center gap-2 group">
          <div className="relative shrink-0">
            <div className="p-1.5 bg-primary text-white rounded-lg group-hover:rotate-6 transition-all shadow-lg shadow-primary/30">
              <ClipboardCheck className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="flex flex-col group-data-[state=collapsed]:hidden whitespace-nowrap overflow-hidden">
            <span className="text-[10px] font-black tracking-tighter uppercase leading-none">
              PartoMa <span className="text-primary">Project</span>
            </span>
            <span className="text-[7px] font-bold uppercase tracking-[0.2em] text-primary/60 mt-1">Clinical Terminal</span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent className="py-2">
        {NAV_GROUPS.map((group, gIdx) => {
          const filteredGroupItems = group.items.filter(item => !user || item.role.includes(user.role));
          if (filteredGroupItems.length === 0) return null;

          return (
            <SidebarGroup key={gIdx} className="mb-1 last:mb-0">
              <SidebarGroupLabel className="px-4 text-[8px] font-black uppercase tracking-[0.25em] text-primary/50 mb-0.5 group-data-[state=collapsed]:hidden whitespace-nowrap">
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5 px-2">
                  {filteredGroupItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/anc/activities' && pathname.startsWith(item.href));
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton 
                          asChild 
                          isActive={isActive} 
                          tooltip={item.label}
                          className={cn(
                            "h-auto py-1.5 transition-all duration-300 rounded-lg relative overflow-hidden group/btn",
                            isActive 
                              ? "bg-primary/20 text-primary ring-1 ring-primary/30" 
                              : "hover:bg-primary/5 text-slate-500"
                          )}
                        >
                          <Link href={item.href} className="flex items-center gap-2.5 px-1.5 w-full">
                            <div className={cn(
                              "transition-all duration-300 shrink-0 p-1 rounded-md",
                              isActive ? "bg-primary/20 text-primary scale-110" : "group-hover/btn:bg-primary/5"
                            )}>
                              <item.icon className={cn("h-3.5 w-3.5", isActive ? "stroke-[2.5px]" : "stroke-[1.8px]")} />
                            </div>
                            <div className="flex flex-col group-data-[state=collapsed]:hidden whitespace-nowrap overflow-hidden transition-opacity duration-300">
                                <span className="font-black text-[10px] uppercase tracking-[0.1em] leading-tight">
                                    {item.label}
                                </span>
                                <span className={cn(
                                    "text-[7px] font-bold uppercase tracking-widest opacity-40 transition-opacity",
                                    isActive && "text-primary opacity-60"
                                )}>
                                    {item.sub}
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
      <SidebarFooter className="p-2 border-t border-primary/10 bg-primary/[0.05] group-data-[state=collapsed]:p-1.5 transition-all duration-300">
        <div className="flex flex-col gap-2 group-data-[state=collapsed]:items-center">
            <div className="group-data-[state=collapsed]:hidden">
                <SyncStatusIndicator />
            </div>
            <div className="flex items-center gap-1.5 group-data-[state=collapsed]:flex-col group-data-[state=collapsed]:gap-2">
                <ThemeToggleButton />
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
        <header className="sticky top-0 z-[50] w-full border-b border-primary/20 bg-background/60 backdrop-blur-3xl h-14 flex flex-col shrink-0">
            <div className="h-1 w-full bg-primary shadow-[0_1px_5px_rgba(16,185,129,0.3)]" />
            
            <div className="flex-1 flex items-center justify-between px-3 md:px-6">
                <div className="flex items-center gap-2">
                    <SidebarTrigger className="h-9 w-9 rounded-lg bg-white/20 dark:bg-white/5 hover:bg-primary/10 shadow-sm" />
                    {user && mounted && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/40 dark:bg-white/5 rounded-lg border border-primary/10 shadow-sm">
                            <div className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-[8px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                                {user.name}
                            </span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-1.5 md:gap-3">
                    <div className="flex items-center gap-2 md:gap-4 bg-white/30 dark:bg-black/20 px-3 py-1 rounded-lg border border-primary/10 shadow-sm">
                        <div className="flex flex-col items-end">
                            <span className="text-[6px] font-black uppercase text-muted-foreground opacity-60 leading-none">Reach</span>
                            <span className="text-[9px] font-black text-primary leading-none mt-0.5">{stats.globalCount}</span>
                        </div>
                        <div className="w-px h-4 bg-primary/20" />
                        <div className="flex flex-col items-end">
                            <span className="text-[6px] font-black uppercase text-muted-foreground opacity-60 leading-none">Work</span>
                            <span className="text-[9px] font-black text-slate-900 dark:text-white leading-none mt-0.5">{stats.userCount}</span>
                        </div>
                    </div>
                    
                    <NotificationBell />
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={handleLogout} 
                        className="text-slate-400 hover:text-rose-600 h-9 w-9 rounded-lg active:scale-95 bg-white/30 dark:bg-white/5"
                    >
                        <LogOut className="h-3.5 w-3.5" />
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
        <div className="relative flex min-h-screen w-full selection:bg-primary/20 selection:text-primary bg-background transition-all duration-500 h-svh overflow-hidden">
            <NotificationPopupManager />
            <StudySidebar user={localUser} />
            
            <SidebarInset className="flex flex-col flex-1 transition-all duration-500 !bg-transparent h-svh">
                <AncHeader user={localUser} registrations={registrations} mounted={mounted} />
                
                <main className="flex-1 flex flex-col w-full bg-transparent overflow-y-auto scroll-smooth pb-8">
                    <div className="flex-1 w-full px-3 md:px-8 py-4 md:py-8 relative z-10">
                        <div className="max-w-[1400px] mx-auto">
                            {children}
                        </div>
                    </div>
                </main>

                <div className="shrink-0 flex items-center justify-center py-2 bg-background/80 backdrop-blur-md border-t">
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/30">
                        PartoMa Project Clinical Integrity &copy; {new Date().getFullYear()}
                    </p>
                </div>

                <MobileBottomNav user={localUser} />
            </SidebarInset>

            <div className="fixed inset-0 -z-20 overflow-hidden pointer-events-none">
                <Image 
                  src={placeholders.main_background.url} 
                  alt="Background" 
                  fill 
                  className="object-cover opacity-[0.05] scale-110 grayscale" 
                  priority 
                  unoptimized
                />
            </div>
            
            <div className="fixed inset-0 -z-30 bg-background" />
        </div>
    </SidebarProvider>
  );
}
