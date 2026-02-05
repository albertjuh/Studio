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

  if (!isVerified) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-blue-50 dark:bg-slate-900 bg-[radial-gradient(theme(colors.slate.200)_1px,transparent_1px)] [background-size:16px_16px] dark:bg-[radial-gradient(theme(colors.slate.800)_1px,transparent_1px)]">
         <div className="flex items-center space-x-2">
            <Loader2 className="animate-spin h-8 w-8 text-blue-800" />
            <span className="text-muted-foreground">Loading...</span>
         </div>
      </div>
    );
  }

  const isLoginPage = pathname === '/anc/login';

  return (
    <div className="flex flex-col min-h-screen bg-blue-50 dark:bg-slate-900 bg-[radial-gradient(theme(colors.slate.200)_1px,transparent_1px)] [background-size:16px_16px] dark:bg-[radial-gradient(theme(colors.slate.800)_1px,transparent_1px)]">
        {!isLoginPage && (
            <header className="sticky top-0 z-40 w-full border-b border-blue-200 dark:border-slate-700 bg-background/80 backdrop-blur-sm">
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
        <footer className="p-4 mt-auto text-center text-sm text-muted-foreground border-t border-blue-200 dark:border-slate-700 bg-background/50 backdrop-blur-sm">
            <p>&copy; {new Date().getFullYear()} PartoMa Project Cohort. All rights reserved.</p>
        </footer>
    </div>
  );
}
