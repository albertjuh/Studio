
"use client";

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { ThemeToggleButton } from '@/components/layout/theme-toggle-button';
import { NotificationBell } from './notification-bell';
import { UserMenu } from './user-menu';
import { Calendar, Clock } from 'lucide-react';
import { APP_NAME } from '@/lib/constants';

export function AppHeader() {
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  useEffect(() => {
    // This code runs only on the client, after the initial render,
    // which prevents a hydration mismatch.
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000); // Update every second

    return () => clearInterval(timer); // Cleanup on component unmount
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        <span className="font-semibold hidden sm:inline-block">{APP_NAME}</span>
      </div>
      
      <div className="hidden items-center gap-x-2 sm:flex ml-auto">
        <div className="flex items-center gap-1 text-sm text-primary/90">
            <Calendar className="h-4 w-4" />
            <span>{format(currentDateTime, 'PPP')}</span>
        </div>
        <div className="flex items-center gap-1 text-sm text-primary/90">
             <Clock className="h-4 w-4" />
             <span>{format(currentDateTime, 'p')}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-2 ml-auto sm:ml-0">
        <NotificationBell />
        <ThemeToggleButton />
        <UserMenu />
      </div>
    </header>
  );
}
