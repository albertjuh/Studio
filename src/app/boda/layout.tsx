"use client";

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2, Bike } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ThemeToggleButton } from '@/components/layout/theme-toggle-button';
import { User, LogOut } from 'lucide-react';


function BodaHeader() {
    const router = useRouter();
    const { toast } = useToast();
    const [user, setUser] = useState<{ name: string; role: string } | null>(null);

    useEffect(() => {
        const userStr = localStorage.getItem('bodaUser');
        if (userStr) {
            setUser(JSON.parse(userStr));
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('bodaUser');
        toast({ title: "Logged Out", description: "You have been successfully logged out." });
        router.push('/boda/login');
    };

    return (
        <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-sm">
            <div className="container flex h-16 items-center justify-between">
                <Link href="/boda/dashboard" className="flex items-center gap-2 font-bold">
                    <Bike className="h-6 w-6 text-primary" />
                    <span>Boda</span>
                </Link>
                <div className="flex items-center gap-4">
                    {user && (
                        <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                            <User className="h-4 w-4" />
                            <span>{user.name} ({user.role})</span>
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


export default function BodaLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    const user = localStorage.getItem('bodaUser');
    const isLoginPage = pathname === '/boda/login';

    if (!user && !isLoginPage) {
      router.push('/boda/login');
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

  const isLoginPage = pathname === '/boda/login';

  return (
    <div className="relative flex min-h-screen flex-col bg-muted/20">
      {!isLoginPage && <BodaHeader />}
      <main className="flex-1">
        {isLoginPage ? children : <div className="container py-8">{children}</div>}
      </main>
    </div>
  );
}
