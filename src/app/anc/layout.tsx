
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
  PlusCircle, 
  LayoutGrid, 
  Search,
  Activity,
  Home
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

function BottomNav({ user }: { user: any }) {
  const pathname = usePathname();
  
  const navItems = [
    { href: '/anc/activities', label: 'Hub', icon: LayoutGrid },
    { href: '/anc/register', label: 'Register', icon: PlusCircle },
    { href: '/anc/recruitment', label: 'Track', icon: Activity },
    { href: '/anc/dashboard', label: 'Data', icon: Search },
  ];

  if (user?.role === 'admin') {
    navItems.push({ href: '/anc/admin/recruitment', label: 'Analysis', icon: BarChart3 });
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-md border-t pb-safe">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full transition-all duration-200",
                isActive ? "text-primary scale-110" : "text-muted-foreground hover:text-primary"
              )}
            >
              <item.icon className={cn("h-5 w-5 mb-1", isActive && "stroke-[2.5px]")} />
              <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span>
              {isActive && <div className="absolute top-0 w-8 h-1 bg-primary rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function AncHeader({ user, registrationsCount }: { user: any; registrationsCount: number }) {
    const router = useRouter();
    const { toast } = useToast();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('ancUser');
        toast({ title: 'Logged Out', variant: 'success' });
        router.push('/anc/login');
    };

    return (
        <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-md h-16">
            <div className="container mx-auto flex h-full items-center justify-between px-4">
                <div className="flex items-center gap-8">
                    <Link href="/anc/activities" className="flex items-center gap-2 group">
                        <div className="p-1.5 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                            <ClipboardCheck className="h-6 w-6 text-primary" />
                        </div>
                        <span className="text-xl font-black tracking-tighter uppercase">
                            PartoMa <span className="text-primary">Project</span>
                        </span>
                    </Link>
                </div>

                <div className="flex items-center gap-3">
                    <SyncStatusIndicator />
                    <div className="h-4 w-px bg-border hidden sm:block mx-1" />
                    {user && (
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-full border">
                            <User className="h-3.5 w-3.5 text-primary" />
                            <span className="text-xs font-bold" suppressHydrationWarning>
                                {user.name} <span className="text-primary/60 ml-1">({mounted ? registrationsCount : '...'})</span>
                            </span>
                        </div>
                    )}
                    <ThemeToggleButton />
                    {user && (
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
      signInAnonymously(auth).catch(console.error);
    }
    const isLoginPage = pathname === '/anc/login';
    if (!localStorage.getItem('ancUser') && !isLoginPage) {
      router.push('/anc/login');
    }
  }, [fbUser, isUserLoading, pathname, router, auth, mounted]);

  if (!mounted) return null;

  const isLoginPage = pathname === '/anc/login';

  return (
    <div className="relative flex min-h-svh flex-col bg-background/50 overflow-x-hidden">
      {!isLoginPage && <AncHeader user={localUser} registrationsCount={userEntryCount} />}
      <main className={cn(
        "flex-1 flex flex-col",
        !isLoginPage && "pb-16 md:pb-0"
      )}>
        <div className={cn(
            "flex-1 w-full max-w-screen-2xl mx-auto px-4 py-4 md:py-8",
            isLoginPage && "p-0 flex items-center justify-center"
        )}>
            {children}
        </div>
      </main>
      {!isLoginPage && <BottomNav user={localUser} />}
    </div>
  );
}
