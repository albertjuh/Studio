
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
  Activity
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ThemeToggleButton } from '@/components/layout/theme-toggle-button';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { AncRegistration } from '@/types';
import { useAuth, useUser } from '@/firebase';
import { signInAnonymously } from 'firebase/auth';
import { SyncStatusIndicator } from '@/app/anc/components/sync-status-indicator';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

function GlobalBottomNav({ user, mounted }: { user: any; mounted: boolean }) {
  const pathname = usePathname();
  const scrollRef = useRef<HTMLDivElement>(null);
  
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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-2xl border-t pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.1)] transition-all duration-500">
        <div 
            ref={scrollRef}
            className="flex items-center gap-2 overflow-x-auto no-scrollbar px-6 h-20 md:h-24 max-w-screen-xl mx-auto justify-start md:justify-center"
        >
          {filteredItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                data-active={isActive}
                className={cn(
                  "flex flex-col items-center justify-center min-w-[80px] md:min-w-[100px] h-full transition-all duration-500 relative outline-none",
                  isActive ? "text-primary scale-125 z-10" : "text-muted-foreground/60 hover:text-primary grayscale-[0.5] hover:grayscale-0"
                )}
              >
                <div className={cn(
                    "p-2 rounded-2xl transition-all duration-500",
                    isActive ? "bg-primary/15 shadow-[0_0_20px_rgba(16,185,129,0.2)]" : "bg-transparent"
                )}>
                    <item.icon className={cn("h-6 w-6", isActive ? "stroke-[2.5px]" : "stroke-[1.5px]")} />
                </div>
                
                <AnimatePresence>
                    {isActive && (
                        <motion.span 
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 5 }}
                            className="text-[10px] font-black uppercase tracking-widest mt-1.5"
                        >
                            {item.label}
                        </motion.span>
                    )}
                </AnimatePresence>

                {isActive && (
                    <motion.div 
                        layoutId="nav-indicator"
                        className="absolute -top-1 w-12 h-1 bg-primary rounded-full shadow-[0_0_15px_rgba(16,185,129,0.8)]"
                    />
                )}
              </Link>
            );
          })}
        </div>
    </nav>
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
        <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-md h-16">
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

                <div className="flex items-center gap-3">
                    <SyncStatusIndicator />
                    <div className="h-4 w-px bg-border mx-1" />
                    
                    {user && mounted && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-full border border-primary/10 transition-all hover:bg-muted">
                            <User className="h-3.5 w-3.5 text-primary" />
                            <span className="text-[10px] font-black uppercase tracking-widest" suppressHydrationWarning>
                                {user.name} <span className="text-primary/60 ml-1">({registrationsCount})</span>
                            </span>
                        </div>
                    )}

                    <ThemeToggleButton />
                    
                    {user && mounted && (
                        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-destructive h-9 font-bold uppercase tracking-widest text-[10px]">
                            <LogOut className="h-4 w-4" />
                            <span className="ml-2 hidden lg:inline">Sign Out</span>
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

  // Identity Synchronization (The "Lucy" Protection Layer)
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

  const { data: registrations } = useCollection<AncRegistration>(registrationsQuery);

  const userEntryCount = useMemo(() => {
    if (!registrations || !localUser) return 0;
    return registrations.filter(reg => reg.registeredBy?.toLowerCase() === localUser.name?.toLowerCase()).length;
  }, [registrations, localUser]);

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

  if (!mounted) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-background" suppressHydrationWarning>
            <div className="flex items-center space-x-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-muted-foreground font-black uppercase tracking-widest text-xs">Synchronizing Identity...</span>
            </div>
        </div>
    );
  }

  const isLoginPage = pathname === '/anc/login';

  return (
    <div className="relative flex min-h-screen flex-col bg-background/50 overflow-x-hidden selection:bg-primary/20 selection:text-primary">
      {!isLoginPage && <AncHeader user={localUser} registrationsCount={userEntryCount} mounted={mounted} />}
      
      <main className={cn(
        "flex-1 flex flex-col w-full",
        !isLoginPage && "pb-32 md:pb-40" // Extra padding for the dominant bottom nav
      )}>
        <div className={cn(
            "flex-1 w-full max-w-screen-2xl mx-auto px-4 py-4 md:py-8",
            isLoginPage && "p-0 flex items-center justify-center"
        )}>
            {children}
        </div>
      </main>

      {!isLoginPage && <GlobalBottomNav user={localUser} mounted={mounted} />}
    </div>
  );
}
