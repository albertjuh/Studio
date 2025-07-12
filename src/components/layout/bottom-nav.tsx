
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS } from '@/lib/constants';
import type { NavItem } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from 'lucide-react';


export function BottomNav() {
  const pathname = usePathname();
  const [visibleNavItems, setVisibleNavItems] = useState<NavItem[]>([]);

  useEffect(() => {
    const storedRole = localStorage.getItem('userRole') as 'admin' | 'worker' | null;
    if (storedRole) {
      const getVisibleItems = (items: NavItem[]): NavItem[] => {
          let allItems: NavItem[] = [];
          items.forEach(item => {
              if (item.roles.includes(storedRole)) {
                  if (item.children) {
                    // If an item has children, add the children that match the role
                    const childItems = item.children.filter(child => child.roles.includes(storedRole));
                    allItems.push(...childItems);
                  } else {
                    allItems.push(item);
                  }
              }
          });
          return allItems;
      };
      setVisibleNavItems(getVisibleItems(NAV_ITEMS));
    }
  }, []);

  const mainItems = visibleNavItems.slice(0, 3);
  const moreItems = visibleNavItems.slice(3);

  return (
    <nav className="fixed bottom-0 left-0 z-50 w-full h-16 bg-background border-t">
      <div className="grid h-full max-w-lg grid-cols-4 mx-auto font-medium">
        {mainItems.map((item) => {
          const isActive = pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              href={item.disabled ? '#' : item.path}
              className={cn(
                "inline-flex flex-col items-center justify-center px-5 hover:bg-muted group",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="w-6 h-6 mb-1" />
              <span className="text-xs text-center break-words">{item.label}</span>
            </Link>
          );
        })}
        {moreItems.length > 0 && (
            <DropdownMenu>
                 <DropdownMenuTrigger asChild>
                     <button className="inline-flex flex-col items-center justify-center px-5 text-muted-foreground hover:bg-muted group">
                        <MoreHorizontal className="w-6 h-6 mb-1" />
                        <span className="text-xs">More</span>
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="top" className="mb-2">
                    {moreItems.map((item) => (
                         <DropdownMenuItem key={item.path} asChild>
                            <Link href={item.disabled ? '#' : item.path} className="flex items-center gap-2">
                                <item.icon className="w-4 h-4" />
                                <span>{item.label}</span>
                            </Link>
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        )}
      </div>
    </nav>
  );
}
