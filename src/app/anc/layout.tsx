
"use client";

import type { ReactNode } from 'react';
import { useEffect, useState, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2, ClipboardCheck, User, LogOut } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ThemeToggleButton } from '@/components/layout/theme-toggle-button';
import { useQuery } from '@tanstack/react-query';
import { getAncRegistrationsAction } from '@/lib/anc-actions';
import type { AncRegistration } from '@/types';
import { startOfDay } from 'date-fns';

function AncHeader() {
    const router = useRouter();
    const { toast } = useToast();
    const [user, setUser] = useState<{ name: string; role: string } | null>(null);

    useEffect(() => {
        const userStr = localStorage.getItem('ancUser');
        if (userStr) {
            setUser(JSON.parse(userStr));
        }
    }, []);

    // Fetch all registrations to calculate the daily count
    const { data: registrations } = useQuery<AncRegistration[]>({
        queryKey: ['ancRegistrations'],
        queryFn: () => getAncRegistrationsAction(),
    });

    const todaysEntryCount = useMemo(() => {
        if (!registrations || !user) return 0;
        const today = startOfDay(new Date());
        return registrations.filter(reg => {
            const regDate = startOfDay(new Date(reg.createdAt));
            return reg.registeredBy === user.name && regDate.getTime() === today.getTime();
        }).length;
    }, [registrations, user]);

    const handleLogout = () => {
        localStorage.removeItem('ancUser');
        toast({ title: 'Logged Out', description: 'You have been successfully logged out.', variant: 'success' });
        router.push('/anc/login');
    };

    return (
        <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-sm">
            <div className="container mx-auto flex h-16 items-center justify-between">
                <Link href="/anc/dashboard" className="flex items-center gap-2 font-bold">
                    <ClipboardCheck className="h-6 w-6 text-primary" />
                    <span>PartoMa Project Cohort</span>
                </Link>
                <div className="flex items-center gap-2 sm:gap-4">
                    {user && (
                        <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                            <User className="h-4 w-4" />
                            <span>{user.name} ({todaysEntryCount})</span>
                        </div>
                    )}
                    <ThemeToggleButton />
                    {user && (
                         <Button variant="outline" size="sm" onClick={handleLogout}>
                            <LogOut className="mr-0 sm:mr-2 h-4 w-4" />
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
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    const user = localStorage.getItem('ancUser');
    const isLoginPage = pathname === '/anc/login';

    if (!user && !isLoginPage) {
      router.push('/anc/login');
    } else {
      setIsVerified(true);
    }
  }, [pathname, router]);
  
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
        {isLoginPage ? children : <div className="container mx-auto py-8">{children}</div>}
      </main>
    </div>
  );
}


export default function AncLayout({ children }: { children: ReactNode }) {
  return (
      <AncLayoutContent>{children}</AncLayoutContent>
  );
}
