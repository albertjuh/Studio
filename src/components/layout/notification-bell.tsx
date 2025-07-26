
"use client";

import React from 'react';
import Link from 'next/link';
import { Bell, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNotifications } from '@/contexts/notification-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { AppNotification } from '@/types';


// Helper function to safely convert timestamp to Date
const safeParseDate = (timestamp: any): Date => {
  if (!timestamp) {
    return new Date(); // Return current date if timestamp is null/undefined
  }

  // If it's already a Date object
  if (timestamp instanceof Date) {
    return isNaN(timestamp.getTime()) ? new Date() : timestamp;
  }

  // If it's a Firestore Timestamp (from server-side rendering or direct object)
  if (timestamp && typeof timestamp.toDate === 'function') {
    try {
      return timestamp.toDate();
    } catch (error) {
      console.warn('Failed to convert Firestore timestamp:', error);
      return new Date();
    }
  }

  // If it's a string or number
  if (typeof timestamp === 'string' || typeof timestamp === 'number') {
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? new Date() : date;
  }

  // If it's an object with seconds (Firestore Timestamp-like from JSON)
  if (timestamp && typeof timestamp === 'object' && timestamp.seconds) {
    try {
      return new Date(timestamp.seconds * 1000);
    } catch (error) {
      console.warn('Failed to convert timestamp object:', error);
      return new Date();
    }
  }

  // Fallback to current date
  console.warn('Unknown timestamp format:', timestamp);
  return new Date();
};


// Helper function to safely format distance
const safeFormatDistance = (timestamp: any): string => {
  try {
    const date = safeParseDate(timestamp);
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    console.warn('Failed to format distance:', error);
    return 'recently';
  }
};


export function NotificationBell() {
  const { notifications, unreadCount, markAllAsRead, clearNotifications } = useNotifications();

  const handleOpenChange = (open: boolean) => {
    // When the dropdown is opened, mark all notifications as read
    if (open && unreadCount > 0) {
      markAllAsRead();
    }
  };

  const getNotificationIcon = (type?: string) => {
    switch (type) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return '📢'; // Default/info
    }
  };


  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
          )}
          <span className="sr-only">View notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>
            <div className="flex items-center justify-between">
              <h3>Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs font-normal text-primary hover:underline"
                >
                  Mark all as read
                </button>
              )}
            </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-64">
          <DropdownMenuGroup>
            {notifications.length > 0 ? (
              notifications.map((notif: AppNotification) => {
                const content = (
                  <div className="flex-col items-start gap-1 whitespace-normal w-full">
                      <div className="flex items-start justify-between w-full">
                          <div className="flex-1">
                              <div className="flex items-center gap-2">
                                  <span className="text-sm">
                                    {getNotificationIcon(notif.type)}
                                  </span>
                                  <p className="text-sm text-foreground flex-1">
                                    {notif.message}
                                  </p>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 ml-6">
                                  {safeFormatDistance(notif.timestamp)}
                              </p>
                          </div>
                      </div>
                  </div>
                );

                return (
                  <DropdownMenuItem key={notif.id} className={cn("p-0", !notif.read && "bg-primary/5")} asChild>
                    {notif.link ? (
                      <Link href={notif.link} className="block p-2 w-full h-full">
                        {content}
                      </Link>
                    ) : (
                      <div className="p-2">{content}</div>
                    )}
                  </DropdownMenuItem>
                );
              })
            ) : (
              <p className="p-4 text-sm text-center text-muted-foreground">No new notifications</p>
            )}
          </DropdownMenuGroup>
        </ScrollArea>
        {notifications.length > 0 && (
            <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={(e) => { e.preventDefault(); clearNotifications(); }} className="text-muted-foreground justify-center">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear all notifications
                </DropdownMenuItem>
            </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
