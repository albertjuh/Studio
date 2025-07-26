import type { ReactNode } from 'react';
import { AppFooter } from '@/components/layout/app-footer';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
        <main className="flex-1 flex flex-col items-center justify-center p-4">
            {children}
        </main>
        <AppFooter />
    </div>
  );
}
