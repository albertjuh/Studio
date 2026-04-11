
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
  Users,
  Baby,
  Activity,
  Sparkles,
  TrendingUp,
  Download,
  Calendar
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
import { FloatingMatrix } from '@/app/anc/components/floating-matrix';
import { cn } from '@/lib/utils';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

const MotionLink = motion.create(Link);

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
    { href: '/anc/admin/schedule', label: 'Planner', icon: Calendar, role: ['clinician', 'admin', 'viewer'] },
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
      className="fixed bottom-10 left-1/2 z-[100] bg-background/80 dark:bg-background/60 backdrop-blur-3xl border px-4 py-2 rounded-full shadow-[0_30px_60px_rgba(0,0,0,0.4)] flex items-center gap-2 min-w-max pointer-events-auto ring-1 ring-white/10"
    >
      <TooltipProvider delayDuration={0}>
        {filteredItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/anc/activities' && pathname.startsWith(item.href));
          return (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>
                <MotionLink
                  href={item.href}
                  whileHover={{ scale: 1.3, y: -10 }}
                  whileTap={{ scale: 0.9 }}
                  className={cn(
                    "flex flex-col items-center justify-center min-w-[50px] md:min-w-[60px] h-12 transition-all duration-500 relative rounded-full outline-none",
                    isActive ? "text-primary z-10" : "text-muted-foreground/30 hover:text-primary/60 hover:bg-primary/5"
                  )}
                >
                  <motion.div
                    animate={isActive ? { scale: 1.25, y: -2 } : { scale: 1, y: 0 }}
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

function AncHeader({ user, registrations, mounted }: { user: any; registrations: AncRegistration[] | null; mounted: boolean }) {
    const router = useRouter();
    const { toast } = useToast();

    const handleLogout = () => {
        localStorage.removeItem('ancUser');
        toast({ title: 'Logged Out', variant: 'success' });
        router.push('/anc/login');
    };

    const globalCount = registrations?.length || 0;
    const userCount = useMemo(() => {
        if (!user || !registrations || !Array.isArray(registrations)) return 0;
        return registrations.filter(r => r.registeredBy === user.name).length;
    }, [user, registrations]);

    return (
        <header className="fixed top-0 left-0 right-0 z-[100] border-b bg-background/95 backdrop-blur-sm h-16">
            <div className="flex h-full items-center justify-between px-8">
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
                    <NotificationBell />
                    
                    {user && mounted && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-full border border-primary/10">
                            <Users className="h-3.5 w-3.5 text-primary" />
                            <span className="text-[10px] font-black uppercase tracking-widest flex items-center">
                                {user.name}: <span className="text-primary ml-1.5">{userCount}</span>
                                <span className="mx-1.5 opacity-30">/</span>
                                <span className="opacity-60">{globalCount}</span>
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

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('ancUser');
      if (stored) setLocalUser(JSON.parse(stored));
      else setLocalUser(null);
    }
  }, [pathname]);

  useEffect(() => {
    if (mounted && !isUserLoading && !fbUser && auth) {
      signInAnonymously(auth).catch(() => {});
    }
  }, [mounted, isUserLoading, fbUser, auth]);

  const regsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'anc_registrations') : null, [firestore]);
  const { data: registrations } = useCollection<AncRegistration>(regsQuery);

  const isLoginPage = pathname === '/anc/login';

  if (!mounted) return null;

  return (
    <div className="relative flex min-h-screen flex-col w-full selection:bg-primary/20 selection:text-primary bg-background/5">
      <NotificationPopupManager />
      {!isLoginPage && (
          <div className="fixed inset-0 -z-20 overflow-hidden pointer-events-none opacity-20 dark:opacity-5">
            <Image src="/Partomabg.png" alt="PartoMa Background" fill className="object-cover" priority />
          </div>
      )}

      {!isLoginPage && <AncHeader user={localUser} registrations={registrations} mounted={mounted} />}
      {!isLoginPage && <FloatingMatrix />}
      
      <main className={cn("flex-1 flex flex-col w-full", !isLoginPage && "pt-16 pb-24 md:pb-8")}>
        <div className={cn("flex-1 w-full max-w-screen-2xl mx-auto px-4 py-4 md:py-8", isLoginPage && "p-0 flex items-center justify-center h-full")}>
            {children}
        </div>
      </main>

      {!isLoginPage && <GlobalBottomNav user={localUser} mounted={mounted} />}
    </div>
  );
}
