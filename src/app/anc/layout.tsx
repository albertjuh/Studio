
"use client";
import { usePushNotifications } from '@/hooks/use-push-notifications';

import type { ReactNode } from 'react';
import { useEffect, useState, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  LoaderCircle, 
  ClipboardCheck, 
  User, 
  LogOut, 
  LayoutGrid, 
  UserPlus,
  ClipboardList,
  Database,
  BarChart,
  Download,
  Users,
  Baby,
  Clock,
  Activity,
  Sparkles,
  TrendingUp,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ThemeToggleButton } from '@/components/layout/theme-toggle-button';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { AncRegistration, RecruitmentEntry } from '@/types';
import { useAuth, useUser } from '@/firebase';
import { signInAnonymously } from 'firebase/auth';
import { SyncStatusIndicator } from '@/app/anc/components/sync-status-indicator';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { NotificationPopupManager } from '@/app/anc/components/notification-popup-manager';
import { cn } from '@/lib/utils';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const MotionLink = motion(Link);

function StudySidebar({ user }: { user: any }) {
  const pathname = usePathname();
  const navItems = [
    { href: '/anc/activities', label: 'Hub', icon: LayoutGrid, role: ['clinician', 'admin', 'viewer'] },
    { href: '/anc/admin/timeline/due-today', label: 'Forecast', icon: Sparkles, role: ['clinician', 'admin', 'viewer'] },
    { href: '/anc/participants', label: 'Timeline', icon: Baby, role: ['clinician', 'admin', 'viewer'] },
    { href: '/anc/dashboard', label: 'Registry', icon: Users, role: ['clinician', 'admin', 'viewer'] },
    { href: '/anc/admin/timeline', label: 'Cohort', icon: TrendingUp, role: ['admin', 'viewer'] },
    { href: '/anc/admin/export', label: 'Intell', icon: Download, role: ['admin', 'viewer'] },
    { href: '/anc/admin/recruitment', label: 'Workload', icon: Activity, role: ['clinician', 'admin', 'viewer'] },
  ];

  const filteredItems = navItems.filter(item => 
    !user || item.role.includes(user.role)
  );

  return (
    <Sidebar className="hidden md:flex border-r" collapsible="icon">
      <SidebarHeader className="h-16 flex items-center px-4 border-b">
         <Link href="/anc/activities" className="flex items-center gap-2 group overflow-hidden">
            <div className="p-1.5 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors shrink-0">
                <ClipboardCheck className="h-6 w-6 text-primary" />
            </div>
            <div className="flex flex-col transition-all duration-300 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:translate-x-[-20px]">
                <span className="text-sm font-black tracking-tighter uppercase whitespace-nowrap">
                    PartoMa <span className="text-primary">Project</span>
                </span>
                <span className="text-[8px] font-bold text-muted-foreground tracking-widest uppercase">Cohort Study</span>
            </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="uppercase tracking-widest text-[10px] font-black group-data-[collapsible=icon]:hidden mb-4 px-2 pt-4">Study Modules</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {filteredItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/anc/activities' && pathname.startsWith(item.href));
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      tooltip={item.label}
                      className={cn(
                        "h-12 rounded-xl transition-all duration-300",
                        isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-primary/5 hover:text-primary/60"
                      )}
                    >
                      <Link href={item.href}>
                        <item.icon className={cn("h-5 w-5", isActive && "stroke-[2.5px] drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]")} />
                        <span className="font-bold tracking-tight">{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-6 border-t group-data-[collapsible=icon]:hidden">
         <div className="flex flex-col gap-1 opacity-40">
            <span className="text-[8px] font-black uppercase tracking-[0.3em] leading-tight">Clinical Intelligence Protocol</span>
            <span className="text-[9px] font-bold">Bomani Tech @2026</span>
         </div>
      </SidebarFooter>
    </Sidebar>
  );
}

function GlobalBottomNav({ user, mounted }: { user: any; mounted: boolean }) {
  const pathname = usePathname();
  const { scrollY } = useScroll();
  
  const opacity = useTransform(scrollY, [0, 100], [1, 0.95]);
  const translateY = useTransform(scrollY, [0, 100], [0, 10]);

  const navItems = [
    { href: '/anc/activities', label: 'Hub', icon: LayoutGrid, role: ['clinician', 'admin', 'viewer'] },
    { href: '/anc/admin/timeline/due-today', label: 'Forecast', icon: Sparkles, role: ['clinician', 'admin', 'viewer'] },
    { href: '/anc/participants', label: 'Timeline', icon: Baby, role: ['clinician', 'admin', 'viewer'] },
    { href: '/anc/dashboard', label: 'Registry', icon: Users, role: ['clinician', 'admin', 'viewer'] },
    { href: '/anc/admin/timeline', label: 'Cohort', icon: TrendingUp, role: ['admin', 'viewer'] },
    { href: '/anc/admin/export', label: 'Intell', icon: Download, role: ['admin', 'viewer'] },
    { href: '/anc/admin/recruitment', label: 'Workload', icon: Activity, role: ['clinician', 'admin', 'viewer'] },
  ];

  const filteredItems = navItems.filter(item => 
    !user || item.role.includes(user.role)
  );

  if (!mounted) return null;

  return (
    <motion.nav 
      initial={{ y: 100, opacity: 0, x: '-50%' }}
      animate={{ y: 0, opacity: 1, x: '-50%' }}
      transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
      style={{ 
        opacity, 
        y: translateY, 
        x: '-50%'
      }}
      role="navigation"
      aria-label="Study Modules"
      className="fixed bottom-10 left-1/2 z-[100] bg-background/80 dark:bg-background/60 backdrop-blur-3xl border px-4 py-2 rounded-full shadow-[0_30px_60px_rgba(0,0,0,0.4)] flex items-center gap-2 min-w-max pointer-events-auto ring-1 ring-white/10 md:hidden"
    >
      <TooltipProvider delayDuration={0}>
        {filteredItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/anc/activities' && pathname.startsWith(item.href));
          return (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>
                <MotionLink
                  href={item.href}
                  aria-label={item.label}
                  whileHover={{ scale: 1.3, y: -10 }}
                  whileTap={{ scale: 0.9 }}
                  className={cn(
                    "flex flex-col items-center justify-center min-w-[50px] md:min-w-[60px] h-12 transition-all duration-500 relative rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                    isActive ? "text-primary z-10" : "text-muted-foreground/30 hover:text-primary/60 hover:bg-primary/5"
                  )}
                >
                  <motion.div
                    animate={isActive ? { scale: 1.25, y: -2 } : { scale: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  >
                    <item.icon className={cn("h-5 w-5 transition-all duration-500", isActive ? "stroke-[2.5px] drop-shadow-[0_0_15px_rgba(16,185,129,0.4)]" : "stroke-[1.5px]")} />
                  </motion.div>
                  
                  <AnimatePresence>
                    {isActive && (
                      <motion.span 
                        initial={{ opacity: 0, scale: 0.5, y: 5 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.5, y: 5 }}
                        className="text-[7px] font-black uppercase tracking-[0.15em] mt-1"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>

                  {isActive && (
                    <motion.div 
                      layoutId="nav-pill-indicator"
                      transition={{ type: "spring", stiffness: 350, damping: 25 }}
                      className="absolute -bottom-1 w-4 h-1 bg-primary rounded-full shadow-[0_0_20px_rgba(16,185,129,0.8)]"
                    />
                  )}
                </MotionLink>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={20} className="bg-foreground text-background font-black uppercase tracking-widest text-[10px] px-4 py-2 rounded-xl border-none mb-4 shadow-2xl">
                {item.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </TooltipProvider>
    </motion.nav>
  );
}

function AncHeader({ user, registrationsCount, mounted }: { user: any; registrationsCount: number; mounted: boolean }) {
    const router = useRouter();
    const { toast } = useToast();

    const handleLogout = () => {
        localStorage.removeItem('ancUser');
        toast({ title: 'Logged Out', variant: 'success' });
        router.push('/anc/login');
    };

    return (
        <header className="fixed top-0 left-0 right-0 z-[100] w-full border-b bg-background/95 backdrop-blur-sm h-16 transition-all duration-300 group-has-[[data-sidebar=sidebar]]:md:left-[var(--sidebar-width)] group-has-[[data-sidebar=sidebar][data-state=collapsed]]:md:left-[var(--sidebar-width-icon)]">
            <div className="container mx-auto flex h-full items-center justify-between px-4">
                <div className="flex items-center gap-4">
                    <SidebarTrigger className="hidden md:flex h-10 w-10 rounded-xl bg-muted/50 hover:bg-primary/10 hover:text-primary transition-colors shadow-none border-none" />
                    
                    <Link href="/anc/activities" className="flex items-center gap-2 group shrink-0 md:hidden">
                        <div className="p-1.5 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                            <ClipboardCheck className="h-6 w-6 text-primary" />
                        </div>
                        <span className="text-xl font-black tracking-tighter uppercase hidden sm:inline-block">
                            PartoMa <span className="text-primary">Project</span>
                        </span>
                    </Link>
                </div>

                <div className="flex items-center gap-2 md:gap-3">
                    <SyncStatusIndicator />
                    <div className="h-4 w-px bg-border mx-1" />
                    
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Link href="/anc/admin/timeline/due-today" className="relative group">
                                    <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 transition-all hover:bg-blue-500/20">
                                        <Sparkles className="h-5 w-5" />
                                    </div>
                                </Link>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="font-bold text-[10px] uppercase tracking-widest">Survey Forecast</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <NotificationBell />
                    
                    {user && mounted && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-full border border-primary/10 transition-all hover:bg-muted">
                            <User className="h-3.5 w-3.5 text-primary" />
                            <span className="text-[10px] font-black uppercase tracking-widest" suppressHydrationWarning>
                                {user.name} <span className="text-primary/60 ml-0.5">({registrationsCount})</span>
                            </span>
                        </div>
                    )}

                    <ThemeToggleButton />
                    
                    {user && mounted && (
                        <Button 
                            variant="secondary" 
                            size="icon" 
                            onClick={handleLogout} 
                            className="text-muted-foreground hover:text-destructive h-10 w-10 rounded-xl"
                        >
                            <LogOut className="h-5 w-5" />
                            <span className="sr-only">Sign Out</span>
                        </Button>
                    )}
                </div>
            </div>
        </header>
    );
}

export default function AncLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const auth = useAuth();
  const { user: fbUser, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [mounted, setMounted] = useState(false);
  const [localUser, setLocalUser] = useState<any>(null);

  const { scrollY } = useScroll();
  const elementsOpacity = useTransform(scrollY, [0, 100], [0.1, 1]);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  useEffect(() => {
    const syncUser = () => {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('ancUser');
        if (stored) {
          try {
            const userData = JSON.parse(stored);
            setLocalUser(userData);
          } catch (e) {
            setLocalUser(null);
          }
        } else {
          setLocalUser(null);
        }
      }
    };
    
    syncUser();
    window.addEventListener('storage', syncUser);
    window.addEventListener('focus', syncUser);

    return () => {
      window.removeEventListener('storage', syncUser);
      window.removeEventListener('focus', syncUser);
    };
  }, [pathname, mounted]);

  const registrationsQuery = useMemoFirebase(() => {
    if (!firestore || !fbUser || pathname === '/anc/login') return null;
    return collection(firestore, 'anc_registrations');
  }, [firestore, fbUser, pathname]);

  const recruitmentQuery = useMemoFirebase(() => {
    if (!firestore || !fbUser || pathname === '/anc/login') return null;
    return collection(firestore, 'recruitment_entries');
  }, [firestore, fbUser, pathname]);

  const { data: registrations } = useCollection<AncRegistration>(registrationsQuery);
  const { data: recruitmentEntries } = useCollection<RecruitmentEntry>(recruitmentQuery);

  const userEntryCount = useMemo(() => {
    if (!localUser) return 0;
    const name = localUser.name?.toLowerCase() || '';
    const relevantRegs = (registrations || []).filter(reg => reg.registeredBy?.toLowerCase() === name);
    const uniqueSessions = new Set();
    (recruitmentEntries || []).forEach(entry => {
        if (entry.ra_name?.toLowerCase() === name) {
            const dateStr = entry.date_string || 'unknown';
            const fac = entry.facility || 'unknown';
            const ra = entry.ra_name || 'unknown';
            const sessionKey = `${dateStr}_${fac}_${ra}`;
            uniqueSessions.add(sessionKey.toLowerCase());
        }
    });
    return relevantRegs.length + uniqueSessions.size;
  }, [registrations, recruitmentEntries, localUser]);

  useEffect(() => {
    if (!mounted || isUserLoading) return;
    if (!fbUser && auth) {
      signInAnonymously(auth).catch(() => {});
    }
    const isLoginPage = pathname === '/anc/login';
    if (!localStorage.getItem('ancUser') && !isLoginPage) {
      router.push('/anc/login');
    }
  }, [fbUser, isUserLoading, pathname, router, auth, mounted]);

  const isLoginPage = pathname === '/anc/login';

  if (!mounted) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-background" suppressHydrationWarning>
            <div className="flex items-center space-x-2">
                <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
                <span className="text-muted-foreground font-black uppercase tracking-widest text-xs">Loading...</span>
            </div>
        </div>
    );
  }

  if (isLoginPage) {
    return (
      <div className="relative flex min-h-screen flex-col selection:bg-primary/20 selection:text-primary fixed inset-0 overflow-hidden">
        <NotificationPopupManager />
        <main className="flex-1 flex flex-col w-full">
          <div className="flex-1 w-full max-w-screen-2xl mx-auto p-0 flex items-center justify-center h-full">
              {children}
          </div>
        </main>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className={cn(
          "relative flex min-h-screen flex-col w-full selection:bg-primary/20 selection:text-primary bg-background/5 overflow-x-hidden"
      )}>
        <NotificationPopupManager />
        {!isLoginPage && (
            <div className="fixed inset-0 -z-20 overflow-hidden pointer-events-none opacity-20 dark:opacity-5">
              <Image 
                  src="/Partomabg.png" 
                  alt="PartoMa Background" 
                  fill 
                  className="object-cover" 
                  priority
              />
            </div>
        )}

        <StudySidebar user={localUser} />
        
        <SidebarInset className="bg-transparent">
          <AncHeader user={localUser} registrationsCount={userEntryCount} mounted={mounted} />
          
          <main className={cn(
            "flex-1 flex flex-col w-full",
            !isLoginPage && "pt-16 pb-24 md:pb-8" 
          )}>
            <div className={cn(
                "flex-1 w-full max-w-screen-2xl mx-auto px-4 py-4 md:py-8",
                isLoginPage && "p-0 flex items-center justify-center h-full"
            )}>
                {children}
            </div>
          </main>

          {!isLoginPage && (
            <motion.div 
              style={{ opacity: elementsOpacity }}
              className="fixed bottom-6 right-8 z-[40] pointer-events-none flex items-center gap-2" 
              suppressHydrationWarning
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-primary/40">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/30">
                Bomani Tech @2026
              </span>
            </motion.div>
          )}

          {!isLoginPage && <GlobalBottomNav user={localUser} mounted={mounted} />}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
