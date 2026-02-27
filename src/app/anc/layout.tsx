
"use client";

import type { ReactNode } from 'react';
import { useEffect, useState, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2, ClipboardCheck, User, LogOut } from 'lucide-react';
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

function AncHeader() {
    const router = useRouter();
    const { toast } = useToast();
    const [user, setUser] = useState<{ name: string; role: string } | null>(null);
    const firestore = useFirestore();

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const userStr = localStorage.getItem('ancUser');
            if (userStr) {
                setUser(JSON.parse(userStr));
            }
        }
    }, []);

    const registrationsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, 'anc_registrations');
    }, [firestore]);

    const { data: registrations } = useCollection<AncRegistration>(registrationsQuery);

    const totalUserEntryCount = useMemo(() => {
        if (!registrations || !user) return 0;
        // Case-insensitive match for extra robustness
        return registrations.filter(reg => 
            reg.registeredBy?.toLowerCase() === user.name?.toLowerCase()
        ).length;
    }, [registrations, user]);

    const handleLogout = () => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('ancUser');
            toast({ title: 'Logged Out', description: 'You have been successfully logged out.', variant: 'success' });
            router.push('/anc/login');
        }
    };

    return (
        <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-sm">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
                <Link href="/anc/dashboard" className="flex items-center gap-2 font-bold">
                    <ClipboardCheck className="h-6 w-6 text-primary" />
                    <span className="hidden sm:inline">PartoMa Project</span>
                    <span className="sm:hidden">PartoMa</span>
                </Link>
                <div className="flex items-center gap-2 sm:gap-4">
                    <SyncStatusIndicator />
                    {user && (
                        <div className="flex items-center gap-1 sm:gap-2 text-sm text-muted-foreground">
                            <User className="h-4 w-4 shrink-0" />
                            <span className="max-w-[100px] truncate sm:max-w-none">
                                {user.name}
                                <span className="font-medium text-primary ml-1">({totalUserEntryCount})</span>
                            </span>
                        </div>
                    )}
                    <ThemeToggleButton />
                    {user && (
                         <Button variant="outline" size="sm" onClick={handleLogout} className="h-8 px-2 sm:px-3">
                            <LogOut className="sm:mr-2 h-4 w-4" />
                            <span className="hidden sm:inline">Logout</span>
                        </Button>
                    )}
                </div>
            </div>
        </header>
    );
}

function AncLayoutContent({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    if (isUserLoading || typeof window === 'undefined') {
        return;
    }

    if (!user) {
        if (auth) {
            signInAnonymously(auth).catch((error) => {
                console.error("Anonymous sign-in failed:", error);
            });
        }
        return;
    }

    const ancUser = localStorage.getItem('ancUser');
    const isLoginPage = pathname === '/anc/login';

    if (!ancUser && !isLoginPage) {
      router.push('/anc/login');
    } else {
      setIsVerified(true);
    }
  }, [user, isUserLoading, pathname, router, auth]);
  
  if (!isVerified) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
         <div className="flex items-center space-x-2">
            <Loader2 className="animate-spin h-8 w-8 text-primary" />
            <span className="text-muted-foreground">Loading...</span>
         </div>
      </div>
    );
  }

  const isLoginPage = pathname.endsWith('/login');

  return (
    <div className="relative flex min-h-screen flex-col bg-muted/20">
      {!isLoginPage && <AncHeader />}
      <main className="flex-1">
        {isLoginPage ? children : <div className="container mx-auto py-4 sm:py-8">{children}</div>}
      </main>
    </div>
  );
}


export default function AncLayout({ children }: { children: ReactNode }) {
  return (
      <AncLayoutContent>{children}</AncLayoutContent>
  );
}
