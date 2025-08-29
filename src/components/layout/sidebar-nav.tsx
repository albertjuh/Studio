
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarMenuSub,
  SidebarMenuSubButton,
} from '@/components/ui/sidebar';
import { NAV_ITEMS, APP_NAME } from '@/lib/constants';
import type { NavItem } from '@/lib/constants';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight, PanelLeftClose } from 'lucide-react';
import { Button } from '../ui/button';

export function SidebarNav() {
  const pathname = usePathname();
  const [visibleNavItems, setVisibleNavItems] = useState<NavItem[]>([]);
  const { state, toggleSidebar } = useSidebar();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  
  useEffect(() => {
    const storedRole = localStorage.getItem('userRole') as 'admin' | 'worker' | null;
    if (storedRole) {
      const getVisibleItems = (items: NavItem[], role: 'admin' | 'worker'): NavItem[] => {
          return items
              .map(item => {
                  if (!item.roles.includes(role)) return null;

                  if (item.children) {
                      const visibleChildren = item.children.filter(child => child.roles.includes(role));
                      if (visibleChildren.length > 0) {
                          return { ...item, children: visibleChildren };
                      }
                      // Don't show parent if no children are visible, unless parent itself is a link
                      return item.path ? { ...item, children: [] } : null;
                  }
                  
                  return item;
              })
              .filter(Boolean) as NavItem[];
      };
      const visibleItems = getVisibleItems(NAV_ITEMS, storedRole);
      setVisibleNavItems(visibleItems);

      // Pre-expand parent if a child is active
      const activeParent = visibleItems.find(item => item.children?.some(child => pathname.startsWith(child.path)));
      if (activeParent) {
          setExpandedItems(prev => [...prev, activeParent.label]);
      }
    }
  }, [pathname]);

  const toggleExpanded = (label: string) => {
    setExpandedItems(prev => 
      prev.includes(label) 
        ? prev.filter(item => item !== label)
        : [...prev, label]
    );
  };
  
  // When collapsed, flatten the list to show all accessible items as top-level icons
  const itemsToShow = state === 'collapsed' 
    ? visibleNavItems.flatMap(item => item.children ? [item, ...item.children] : [item])
    : visibleNavItems;

  return (
    <>
      <div className="flex h-16 items-center gap-3 border-b px-4 lg:h-[60px]">
        <Link href="/dashboard" className="flex items-center gap-3 font-semibold text-foreground">
          <Image src="/logocntl.png" alt={`${APP_NAME} logo`} width={40} height={40} className="h-10 w-10" />
          <span className={cn("text-xl font-bold transition-opacity duration-300",
            state === 'collapsed' ? 'opacity-0 w-0' : 'opacity-100 w-auto delay-100'
          )}>
            {APP_NAME}
          </span>
        </Link>
      </div>

      <div className="flex-1 overflow-auto py-2 group/sidebar-content">
        <SidebarMenu className="px-2">
          {itemsToShow.map((item, index) => {
             const isExpanded = expandedItems.includes(item.label);

            // In expanded view, render nested menus
            if (state === 'expanded' && item.children && item.children.length > 0) {
                return (
                    <SidebarMenuItem key={`${item.label}-${index}`}>
                        <SidebarMenuButton
                            onClick={() => toggleExpanded(item.label)}
                            className="justify-between"
                            tooltip={{ children: item.label, side: 'right', align: 'center' }}
                        >
                            <div className="flex items-center gap-2">
                                <item.icon className="h-4 w-4 shrink-0" />
                                <span className="truncate">{item.label}</span>
                            </div>
                            {isExpanded ? (
                                <ChevronDown className="h-4 w-4 shrink-0" />
                            ) : (
                                <ChevronRight className="h-4 w-4 shrink-0" />
                            )}
                        </SidebarMenuButton>
                        {isExpanded && (
                             <SidebarMenuSub>
                                {item.children.map((child) => (
                                    <SidebarMenuItem key={child.path}>
                                        <SidebarMenuSubButton asChild isActive={pathname.startsWith(child.path)}>
                                            <Link href={child.disabled ? '#' : child.path}>
                                                <child.icon className="h-4 w-4" />
                                                <span className="truncate">{child.label}</span>
                                            </Link>
                                        </SidebarMenuSubButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenuSub>
                        )}
                    </SidebarMenuItem>
                )
            }
            
            // In both collapsed and expanded views, render top-level items
            return (
              <SidebarMenuItem key={item.path || `${item.label}-${index}`}>
                <SidebarMenuButton
                  asChild
                  isActive={item.path ? pathname.startsWith(item.path) : false}
                  tooltip={{ children: item.label, side: 'right', align: 'center' }}
                  disabled={item.disabled}
                  aria-disabled={item.disabled}
                >
                  <Link href={item.disabled || !item.path ? '#' : item.path}>
                    <item.icon className="h-4 w-4" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </div>

       <SidebarFooter className="mt-auto border-t">
        <Button 
          variant="ghost" 
          className={cn(
            "w-full justify-start text-muted-foreground transition-opacity duration-300",
            state === 'collapsed' ? 'opacity-0 w-0 h-0 p-0' : 'opacity-100 w-auto h-auto p-2 delay-100'
            )}
          onClick={toggleSidebar}
        >
          <PanelLeftClose className="mr-2 h-4 w-4" />
          Collapse
        </Button>
      </SidebarFooter>
    </>
  );
}
