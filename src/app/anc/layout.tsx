
"use client";

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

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
      <div className="flex items-center justify-center min-h-screen bg-blue-50 dark:bg-slate-900">
         <div className="flex items-center space-x-2">
            <Loader2 className="animate-spin h-8 w-8 text-blue-800" />
            <span className="text-muted-foreground">Loading...</span>
         </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-blue-50 dark:bg-slate-900">
        <main className="flex-grow">
            {children}
        </main>
        <footer className="p-4 mt-8 text-center text-sm text-muted-foreground border-t border-blue-200 dark:border-slate-700">
            <p>&copy; {new Date().getFullYear()} ANC Cohort Study. All rights reserved.</p>
        </footer>
    </div>
  );
}
