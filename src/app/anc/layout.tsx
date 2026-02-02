import type { ReactNode } from 'react';

export default function AncLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-blue-50 dark:bg-slate-900">
        <main>
            {children}
        </main>
    </div>
  );
}
