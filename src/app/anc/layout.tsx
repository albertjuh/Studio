"use client";

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { AncHeader } from '@/components/anc/anc-header';

export default function AncLayout({ children }: { children: ReactNode }) {
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

  const loadingScreen = (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-zinc-950">
         <div className="flex items-center space-x-2">
            <Loader2 className="animate-spin h-8 w-8 text-blue-800" />
            <span className="text-muted-foreground">Loading...</span>
         </div>
      </div>
  );

  if (!isVerified) {
    return loadingScreen;
  }

  const isLoginPage = pathname === '/anc/login';

  return (
    <div className="relative flex flex-col min-h-screen">
      {/* Background Image and Overlay */}
      <div className="absolute inset-0 z-0">
        <div 
          className="absolute inset-0 bg-cover bg-center" 
          style={{ backgroundImage: "url('/partoma-background.jpg')" }}
        ></div>
        <div className="absolute inset-0 bg-white/80 dark:bg-zinc-950/90"></div>
      </div>
      
      {/* Content Layer */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {!isLoginPage && (
            <header className="sticky top-0 z-40 w-full border-b border-blue-200 dark:border-slate-700 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <AncHeader />
                </div>
            </header>
        )}
        <main className="flex-grow p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                {children}
            </div>
        </main>
        <footer className="p-4 mt-auto text-center text-sm text-muted-foreground border-t border-blue-200 dark:border-slate-700 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-sm">
            <p>&copy; {new Date().getFullYear()} PartoMa Project Cohort. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
