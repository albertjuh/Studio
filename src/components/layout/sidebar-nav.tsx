'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { NAV_ITEMS, APP_NAME } from '@/lib/constants';
import type { NavItem } from '@/lib/constants';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight } from 'lucide-react';

export function SidebarNav() {
  const pathname = usePathname();
  const [visibleNavItems, setVisibleNavItems] = useState<NavItem[]>([]);
  const { state } = useSidebar();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  useEffect(() => {
    const storedRole = localStorage.getItem('userRole') as 'admin' | 'worker' | null;
    if (storedRole) {
      const filteredItems = NAV_ITEMS.filter(item => item.roles.includes(storedRole));
      setVisibleNavItems(filteredItems);
    }
  }, []);

  const toggleExpanded = (label: string) => {
    setExpandedItems(prev => 
      prev.includes(label) 
        ? prev.filter(item => item !== label)
        : [...prev, label]
    );
  };

  return (
    <>
      <div className="flex h-14 items-center gap-2 border-b px-4 lg:h-[60px] lg:px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-foreground">
          <Image src="/logocntl.png" alt={`${APP_NAME} logo`} width={28} height={28} className="h-7 w-7" />
          <span className={cn("transition-opacity duration-300",
            state === 'collapsed' ? 'opacity-0 w-0' : 'opacity-100 w-auto delay-100'
          )}>
            {APP_NAME}
          </span>
        </Link>
      </div>

      <div className="flex-1 overflow-auto py-2 group/sidebar-content">
        <SidebarMenu className="px-2">
          {visibleNavItems.map((item) => {
            const isExpanded = expandedItems.includes(item.label);

            if (item.children) {
              return (
                <SidebarMenuItem key={item.label}>
                  <button
                    onClick={() => toggleExpanded(item.label)}
                    className={cn(
                      'group/menu-item flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50'
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                    {isExpanded ? (
                      <ChevronDown className="ml-auto h-4 w-4 shrink-0" />
                    ) : (
                      <ChevronRight className="ml-auto h-4 w-4 shrink-0" />
                    )}
                  </button>
                  {isExpanded && (
                    <div className="ml-4 mt-1 space-y-1 border-l pl-4">
                      {item.children.map((child) => (
                        <SidebarMenuButton
                          key={child.path}
                          asChild
                          isActive={pathname.startsWith(child.path)}
                          disabled={child.disabled}
                          aria-disabled={child.disabled}
                        >
                          <Link href={child.disabled ? '#' : child.path}>
                            <child.icon className="h-4 w-4" />
                            <span className="truncate">{child.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      ))}
                    </div>
                  )}
                </SidebarMenuItem>
              );
            }

            return (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith(item.path)}
                  tooltip={{ children: item.label, side: 'right', align: 'center' }}
                  disabled={item.disabled}
                  aria-disabled={item.disabled}
                >
                  <Link href={item.disabled ? '#' : item.path}>
                    <item.icon className="h-4 w-4" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </div>
    </>
  );
}
