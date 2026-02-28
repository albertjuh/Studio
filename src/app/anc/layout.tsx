
"use client";

import type { ReactNode } from 'react';
import { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Loader2, 
  ClipboardCheck, 
  User, 
  LogOut, 
  LayoutGrid, 
  UserPlus,
  ClipboardList,
  Database,
  LineChart,
  BarChart,
  ChevronUp
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
import { cn } from '@/lib/utils';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';

function GlobalBottomNav({ user, mounted }: { user: any; mounted: boolean }) {
  const pathname = usePathname();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);
  const { scrollY } = useScroll();
  const lastScrollY = useRef(0);
  
  const navItems = [
    { href: '/anc/activities', label: 'Hub', icon: LayoutGrid, role: ['clinician', 'admin'] },
    { href: '/anc/register', label: 'Register', icon: UserPlus, role: ['clinician', 'admin'] },
    { href: '/anc/recruitment', label: 'Track', icon: ClipboardList, role: ['clinician', 'admin'] },
    { href: '/anc/dashboard', label: 'Data', icon: Database, role: ['clinician', 'admin'] },
    { href: '/anc/admin/recruitment', label: 'Analysis', icon: BarChart, role: ['admin'] },
    { href: '/anc/admin', label: 'Cohort', icon: LineChart, role: ['admin'] },
  ];

  const filteredItems = navItems.filter(item => 
    !user || item.role.includes(user.role)
  );

  useMotionValueEvent(scrollY, "change", (latest) => {
    const direction = latest > lastScrollY.current ? "down" : "up";
    // Natural Behavior: Hide on Down, Show on Up
    if (latest > 100) {
      if (direction === "down") {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
    } else {
      setIsVisible(true);
    }
    lastScrollY.current = latest;
  });

  useEffect(() => {
    if (mounted && scrollRef.current) {
        const activeItem = scrollRef.current.querySelector('[data-active="true"]');
        if (activeItem) {
            activeItem.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
    }
  }, [pathname, mounted]);

  if (!mounted) return null;

  return (
    <>
      <AnimatePresence>
        {!isVisible && (
          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            onClick={() => setIsVisible(true)}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-primary text-white p-2 rounded-full shadow-lg ring-4 ring-primary/20"
          >
            <ChevronUp className="h-5 w-5" />
          </motion.button>
        )}
      </AnimatePresence>

      <motion.nav 
        initial={{ y: 0 }}
        animate={{ y: isVisible ? 0 : 120 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-2xl border-t pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.1)]"
      >
          <div 
              ref={scrollRef}
              className="flex items-center gap-4 overflow-x-auto no-scrollbar px-6 h-16 max-w-screen-xl mx-auto justify-start md:justify-center"
          >
            {filteredItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-active={isActive}
                  className={cn(
                    "flex flex-col items-center justify-center min-w-[70px] md:min-w-[80px] h-full transition-all duration-500 relative outline-none",
                    isActive ? "text-primary scale-125 z-10" : "text-muted-foreground/30 hover:text-primary/60"
                  )}
                >
                  <div className={cn(
                    "p-1.5 rounded-lg transition-all duration-500",
                    isActive ? "bg-primary/10 shadow-sm ring-1 ring-primary/20" : "bg-transparent"
                  )}>
                      <item.icon className={cn("h-4 w-4 md:h-5 md:w-5", isActive ? "stroke-[2.5px]" : "stroke-[1.5px]")} />
                  </div>
                  
                  <AnimatePresence>
                      {isActive && (
                          <motion.span 
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 5 }}
                              className="text-[7px] md:text-[8px] font-black uppercase tracking-widest mt-0.5"
                          >
                              {item.label}
                          </motion.span>
                      )}
                  </AnimatePresence>

                  {isActive && (
                      <motion.div 
                          layoutId="nav-indicator"
                          className="absolute -top-1 w-8 h-1 bg-primary rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                      />
                  )}
                </Link>
              );
            })}
          </div>
      </motion.nav>
    </>
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
        <header className="fixed top-0 left-0 right-0 z-[100] w-full border-b bg-background shadow-md h-16 pointer-events-auto">
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

  useEffect(() => {
    setMounted(true);
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
    
    const regCount = (registrations || [])
      .filter(reg => reg.registeredBy?.toLowerCase() === name).length;
      
    const recruitCount = (recruitmentEntries || [])
      .filter(entry => entry.ra_name?.toLowerCase() === name && entry.first_row_flag === 1).length;
      
    return regCount + recruitCount;
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
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
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

      {!isLoginPage && <GlobalBottomNav user={localUser} mounted={mounted} />}
    </div>
  );
}
