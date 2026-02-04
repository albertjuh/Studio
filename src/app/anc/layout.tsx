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
    <div className="min-h-screen bg-blue-50 dark:bg-slate-900">
        <main>
            {children}
        </main>
    </div>
  );
}
