
"use client";

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarInset,
} from '@/components/ui/sidebar';
import { AppHeader } from '@/components/layout/app-header';
import { AppFooter } from '@/components/layout/app-footer';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { NAV_ITEMS } from '@/lib/constants';
import { NotificationProvider } from '@/contexts/notification-context';
import { useIsMobile } from '@/hooks/use-mobile';
import { BottomNav } from '@/components/layout/bottom-nav';

function isUserAuthorized(pathname: string, userRole: 'admin' | 'worker'): boolean {
    const checkItems = (items: typeof NAV_ITEMS): boolean => {
        for (const item of items) {
            if (pathname.startsWith(item.path) && item.roles.includes(userRole)) {
                return true;
            }
            if (item.children && checkItems(item.children)) {
                return true;
            }
        }
        return false;
    };
    return checkItems(NAV_ITEMS);
}


export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isVerified, setIsVerified] = useState(false); // To prevent flash of content
  const isMobile = useIsMobile();

  useEffect(() => {
    const userRole = localStorage.getItem('userRole') as 'admin' | 'worker' | null;

    if (!userRole) {
      router.push('/login');
      return;
    }

    if (!isUserAuthorized(pathname, userRole)) {
        // If user is not authorized for this page, redirect to their default page
        const defaultPage = userRole === 'admin' ? '/dashboard' : '/data-entry';
        router.push(defaultPage);
        return;
    }

    // If all checks pass, allow rendering
    setIsVerified(true);

  }, [pathname, router]);


  // While verifying, show a loading state to prevent flicker of unauthorized content
  if (!isVerified) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
         <div className="flex items-center space-x-2">
            <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-muted-foreground">Verifying access...</span>
         </div>
      </div>
    );
  }

  return (
    <NotificationProvider>
      <SidebarProvider defaultOpen={false}>
        {!isMobile && (
          <Sidebar collapsible="icon">
            <SidebarContent>
              <SidebarNav />
            </SidebarContent>
          </Sidebar>
        )}
        <div className="flex flex-col flex-1 min-h-screen">
          <AppHeader />
          <SidebarInset>
            <div className="flex-1 p-4 sm:p-6 bg-background pb-20 sm:pb-6">
              {children}
            </div>
            {!isMobile && <AppFooter />}
          </SidebarInset>
        </div>
         {isMobile && <BottomNav />}
      </SidebarProvider>
    </NotificationProvider>
  );
}
