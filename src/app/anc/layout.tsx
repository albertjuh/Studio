
"use client";

import type { ReactNode } from 'react';
import { useEffect, useState, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Loader2, 
  ClipboardCheck, 
  User, 
  LogOut, 
  BarChart3, 
  LayoutGrid, 
  UserPlus,
  ClipboardList,
  Database,
  LineChart,
  ShieldCheck,
  CirclePlus
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

function Navigation({ user, mounted }: { user: any; mounted: boolean }) {
  const pathname = usePathname();
  
  const navItems = [
    { href: '/anc/activities', label: 'Hub', icon: LayoutGrid, role: ['clinician', 'admin'] },
    { href: '/anc/register', label: 'Register', icon: UserPlus, role: ['clinician', 'admin'] },
    { href: '/anc/recruitment', label: 'Track', icon: ClipboardList, role: ['clinician', 'admin'] },
    { href: '/anc/dashboard', label: 'Data', icon: Database, role: ['clinician', 'admin'] },
    { href: '/anc/admin/recruitment', label: 'Analysis', icon: BarChart3, role: ['admin'] },
    { href: '/anc/admin', label: 'Cohort', icon: LineChart, role: ['admin'] },
  ];

  const filteredItems = navItems.filter(item => 
    !user || item.role.includes(user.role)
  );

  if (!mounted) return null;

  return (
    <>
      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-xl border-t pb-safe shadow-[0_-1px_10px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-around h-16 px-1">
          {filteredItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full transition-all duration-300 relative",
                  isActive ? "text-primary scale-110" : "text-muted-foreground hover:text-primary"
                )}
              >
                <item.icon className={cn("h-5 w-5 mb-1", isActive && "stroke-[2.5px]")} />
                <span className="text-[9px] font-black uppercase tracking-tighter text-center leading-none">
                  {item.label}
                </span>
                {isActive && (
                    <div className="absolute top-0 w-8 h-0.5 bg-primary rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop Top Nav */}
      <div className="hidden md:flex items-center gap-1 ml-6">
        {filteredItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <Button 
                variant={isActive ? "secondary" : "ghost"} 
                size="sm" 
                className={cn(
                    "h-9 px-3 font-bold text-[11px] uppercase tracking-widest gap-2 rounded-xl transition-all",
                    isActive ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-muted"
                )}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </Button>
            </Link>
          );
        })}
      </div>
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
        <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-md h-16">
            <div className="container mx-auto flex h-full items-center justify-between px-4">
                <div className="flex items-center gap-2">
                    <Link href="/anc/activities" className="flex items-center gap-2 group shrink-0">
                        <div className="p-1.5 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                            <ClipboardCheck className="h-6 w-6 text-primary" />
                        </div>
                        <span className="text-xl font-black tracking-tighter uppercase hidden lg:inline-block">
                            PartoMa <span className="text-primary">Project</span>
                        </span>
                    </Link>
                    <Navigation user={user} mounted={mounted} />
                </div>

                <div className="flex items-center gap-3">
                    <SyncStatusIndicator />
                    <div className="h-4 w-px bg-border hidden sm:block mx-1" />
                    {user && mounted && (
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-full border">
                            <User className="h-3.5 w-3.5 text-primary" />
                            <span className="text-xs font-bold" suppressHydrationWarning>
                                {user.name} <span className="text-primary/60 ml-1">{mounted ? `(${registrationsCount})` : ''}</span>
                            </span>
                        </div>
                    )}
                    <ThemeToggleButton />
                    {user && mounted && (
                        <Button variant="ghost" size="sm" onClick={handleLogout} className="hidden md:flex text-muted-foreground hover:text-destructive h-9 font-bold uppercase tracking-widest text-[10px]">
                            <LogOut className="mr-2 h-4 w-4" />
                            Sign Out
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
    const stored = localStorage.getItem('ancUser');
    if (stored) setLocalUser(JSON.parse(stored));
  }, []);

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
                <span className="text-muted-foreground">Loading...</span>
            </div>
        </div>
    );
  }

  const isLoginPage = pathname === '/anc/login';

  return (
    <div className="relative flex min-h-screen flex-col bg-background/50 overflow-x-hidden">
      {!isLoginPage && <AncHeader user={localUser} registrationsCount={userEntryCount} mounted={mounted} />}
      <main className={cn(
        "flex-1 flex flex-col w-full",
        !isLoginPage && "pb-20 md:pb-8"
      )}>
        <div className={cn(
            "flex-1 w-full max-w-screen-2xl mx-auto px-4 py-4 md:py-8",
            isLoginPage && "p-0 flex items-center justify-center"
        )}>
            {children}
        </div>
      </main>
    </div>
  );
}
