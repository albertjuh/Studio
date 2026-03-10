"use client";

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
  Sparkles
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

function GlobalBottomNav({ user, mounted }: { user: any; mounted: boolean }) {
  const pathname = usePathname();
  const { scrollY } = useScroll();
  
  // Refined scroll animation: Visible at top, stays visible but slightly fades/shifts as you scroll
  const opacity = useTransform(scrollY, [0, 100], [1, 0.95]);
  const translateY = useTransform(scrollY, [0, 100], [0, 10]);

  const navItems = [
    { href: '/anc/activities', label: 'Hub', icon: LayoutGrid, role: ['clinician', 'admin', 'viewer'] },
    { href: '/anc/admin/timeline/due-today', label: 'Forecast', icon: Sparkles, role: ['clinician', 'admin', 'viewer'] },
    { href: '/anc/participants', label: 'Timeline', icon: Baby, role: ['clinician', 'admin', 'viewer'] },
    { href: '/anc/recruitment', label: 'Track', icon: ClipboardList, role: ['clinician', 'admin'] },
    { href: '/anc/dashboard', label: 'Data', icon: Database, role: ['clinician', 'admin', 'viewer'] },
    { href: '/anc/admin/timeline', label: 'Cohort', icon: Activity, role: ['admin', 'viewer'] },
    { href: '/anc/admin/export', label: 'Intell', icon: Download, role: ['admin', 'viewer'] },
    { href: '/anc/admin/recruitment', label: 'Analysis', icon: BarChart, role: ['admin', 'viewer'] },
  ];

  const filteredItems = navItems.filter(item => 
    !user || item.role.includes(user.role)
  );

  if (!mounted) return null;

  return (
    <motion.nav 
      style={{ 
        opacity, 
        y: translateY, 
        x: '-50%'
      }}
      role="navigation"
      aria-label="Study Modules"
      className="fixed bottom-8 left-1/2 z-[100] bg-background/80 dark:bg-background/60 backdrop-blur-2xl border px-2 py-2 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center gap-1 min-w-max pointer-events-auto ring-1 ring-white/10"
    >
      <TooltipProvider delayDuration={0}>
        {filteredItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/anc/activities' && pathname.startsWith(item.href));
          return (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>
                <Link
                  href={item.href}
                  aria-label={item.label}
                  className={cn(
                    "flex flex-col items-center justify-center min-w-[50px] md:min-w-[60px] h-12 transition-all duration-500 relative rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                    isActive ? "text-primary scale-110 z-10" : "text-muted-foreground/40 hover:text-primary/60 hover:bg-primary/5"
                  )}
                >
                  <item.icon className={cn("h-5 w-5", isActive ? "stroke-[2.5px]" : "stroke-[1.5px]")} />
                  
                  {isActive && (
                    <motion.span 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-[7px] font-black uppercase tracking-widest mt-1"
                    >
                      {item.label}
                    </motion.span>
                  )}

                  {isActive && (
                    <motion.div 
                      layoutId="nav-pill-indicator"
                      className="absolute -bottom-1 w-5 h-1 bg-primary rounded-full shadow-[0_0_12px_rgba(16,185,129,0.6)]"
                    />
                  )}
                </Link>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-foreground text-background font-black uppercase tracking-widest text-[9px] px-3 py-1.5 rounded-lg border-none mb-2">
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
        <header className="fixed top-0 left-0 right-0 z-[100] w-full border-b bg-background/95 backdrop-blur-sm h-16">
            <div className="container mx-auto flex h-full items-center justify-between px-4">
                <div className="flex items-center gap-4">
                    <Link href="/anc/activities" className="flex items-center gap-2 group shrink-0">
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
                            variant="ghost" 
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
    // Request permission for push notifications
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
    if (!firestore) return null;
    return collection(firestore, 'anc_registrations');
  }, [firestore]);

  const recruitmentQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'recruitment_entries');
  }, [firestore]);

  const { data: registrations } = useCollection<AncRegistration>(registrationsQuery);
  const { data: recruitmentEntries } = useCollection<RecruitmentEntry>(recruitmentQuery);

  const userEntryCount = useMemo(() => {
    if (!localUser) return 0;
    const name = localUser.name?.toLowerCase();
    const relevantRegs = (registrations || []).filter(reg => reg.registeredBy?.toLowerCase() === name);
    const uniqueSessions = new Set();
    (recruitmentEntries || []).forEach(entry => {
        if (entry.ra_name?.toLowerCase() === name) {
            const sessionKey = `${entry.date_string}_${entry.facility}_${entry.ra_name}`;
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

  return (
    <div className={cn(
        "relative flex min-h-screen flex-col selection:bg-primary/20 selection:text-primary",
        isLoginPage ? "fixed inset-0 overflow-hidden" : "bg-background/5 overflow-x-hidden"
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

      {!isLoginPage && <AncHeader user={localUser} registrationsCount={userEntryCount} mounted={mounted} />}
      
      <main className={cn(
        "flex-1 flex flex-col w-full",
        !isLoginPage && "pt-16 pb-24 md:pb-28" 
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
    </div>
  );
}
