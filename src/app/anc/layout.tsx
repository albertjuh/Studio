
"use client";

import type { ReactNode } from 'react';
import { useEffect, useState, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  ClipboardCheck, 
  LogOut, 
  LayoutGrid, 
  Users,
  Baby,
  Activity,
  Sparkles,
  TrendingUp,
  Download,
  Calendar,
  Menu
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ThemeToggleButton } from '@/components/layout/theme-toggle-button';
import { useCollection, useFirestore, useMemoFirebase, useAuth, useUser } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { AncRegistration } from '@/types';
import { signInAnonymously } from 'firebase/auth';
import { SyncStatusIndicator } from '@/app/anc/components/sync-status-indicator';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { NotificationPopupManager } from '@/app/anc/components/notification-popup-manager';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  SidebarProvider, 
  Sidebar, 
  SidebarContent, 
  SidebarHeader, 
  SidebarFooter, 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton,
  SidebarTrigger,
  SidebarInset
} from '@/components/ui/sidebar';

const NAV_ITEMS = [
  { href: '/anc/activities', label: 'Hub', icon: LayoutGrid, role: ['clinician', 'admin', 'viewer'] },
  { href: '/anc/admin/timeline/due-today', label: 'Forecast', icon: Sparkles, role: ['clinician', 'admin', 'viewer'] },
  { href: '/anc/participants', label: 'Timeline', icon: Baby, role: ['clinician', 'admin', 'viewer'] },
  { href: '/anc/dashboard', label: 'Registry', icon: Users, role: ['clinician', 'admin', 'viewer'] },
  { href: '/anc/admin/schedule', label: 'Planner', icon: Calendar, role: ['clinician', 'admin', 'viewer'] },
  { href: '/anc/admin/timeline', label: 'Cohort', icon: TrendingUp, role: ['admin', 'viewer'] },
  { href: '/anc/admin/export', label: 'Intell', icon: Download, role: ['admin', 'viewer'] },
  { href: '/anc/admin/recruitment', label: 'Workload', icon: Activity, role: ['clinician', 'admin', 'viewer'] },
];

function MobileBottomNav({ user }: { user: any }) {
  const pathname = usePathname();
  const filteredItems = NAV_ITEMS.filter(item => !user || item.role.includes(user.role)).slice(0, 5);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[100] md:hidden bg-background/95 backdrop-blur-md border-t h-16 px-2 flex items-center justify-around pb-safe">
      {filteredItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== '/anc/activities' && pathname.startsWith(item.href));
        return (
          <Link 
            key={item.href} 
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors",
              isActive ? "text-primary" : "text-muted-foreground/60 hover:text-primary/60"
            )}
          >
            <item.icon className={cn("h-5 w-5", isActive ? "stroke-[2.5px]" : "stroke-[1.5px]")} />
            <span className="text-[9px] font-black uppercase tracking-tighter">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function StudySidebar({ user }: { user: any }) {
  const pathname = usePathname();
  const filteredItems = NAV_ITEMS.filter(item => !user || item.role.includes(user.role));

  return (
    <Sidebar collapsible="icon" className="border-r bg-sidebar">
      <SidebarHeader className="h-16 flex items-center px-4 border-b border-sidebar-border">
        <Link href="/anc/activities" className="flex items-center gap-3 group">
          <div className="p-1.5 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
            <ClipboardCheck className="h-6 w-6 text-primary" />
          </div>
          <span className="text-sm font-black tracking-tighter uppercase group-data-[collapsible=icon]:hidden">
            PartoMa <span className="text-primary">Project</span>
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="py-6 px-2">
        <SidebarMenu className="gap-2">
          {filteredItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/anc/activities' && pathname.startsWith(item.href));
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton 
                  asChild 
                  isActive={isActive} 
                  tooltip={item.label}
                  className={cn(
                    "h-12 transition-all",
                    isActive ? "bg-primary/10 text-primary hover:bg-primary/15" : "hover:bg-sidebar-accent"
                  )}
                >
                  <Link href={item.href} className="flex items-center gap-3">
                    <item.icon className={cn("h-5 w-5", isActive ? "stroke-[2.5px]" : "stroke-[1.5px]")} />
                    <span className="font-black text-xs uppercase tracking-widest">{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="flex flex-col gap-4 group-data-[collapsible=icon]:items-center">
            <SyncStatusIndicator />
            <ThemeToggleButton />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

function AncHeader({ user, registrations, mounted }: { user: any; registrations: AncRegistration[] | null; mounted: boolean }) {
    const router = useRouter();
    const { toast } = useToast();

    const handleLogout = () => {
        localStorage.removeItem('ancUser');
        toast({ title: 'Logged Out', variant: 'success' });
        router.push('/anc/login');
    };

    const stats = useMemo(() => {
        try {
            if (!user?.name || !registrations || !Array.isArray(registrations)) return { userCount: 0, globalCount: 0 };
            const userCount = registrations.filter(r => r && r.registeredBy === user.name).length;
            return { userCount, globalCount: registrations.length };
        } catch (e) {
            return { userCount: 0, globalCount: registrations?.length || 0 };
        }
    }, [user?.name, registrations]);

    return (
        <header className="sticky top-0 z-[50] w-full border-b bg-background/95 backdrop-blur-md h-16 flex items-center shrink-0">
            <div className="flex h-full w-full items-center justify-between px-4 md:px-8">
                <div className="flex items-center gap-4">
                    <SidebarTrigger className="md:flex" />
                    <div className="h-6 w-px bg-border hidden md:block mx-2" />
                    <Link href="/anc/activities" className="flex items-center gap-2 group shrink-0 md:hidden">
                        <ClipboardCheck className="h-6 w-6 text-primary" />
                    </Link>
                    {user && mounted && (
                        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-full border border-primary/10">
                            <Users className="h-3.5 w-3.5 text-primary" />
                            <span className="text-[10px] font-black uppercase tracking-widest flex items-center">
                                {user.name}: <span className="text-primary font-black mx-1">{stats.userCount}</span> <span className="mx-1.5 opacity-30">/</span> <span className="opacity-60">{stats.globalCount} Enrolled</span>
                            </span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 md:gap-4">
                    <div className="hidden sm:block">
                        <SyncStatusIndicator />
                    </div>
                    <NotificationBell />
                    <div className="h-4 w-px bg-border mx-1" />
                    {user && mounted && (
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={handleLogout} 
                            className="text-muted-foreground hover:text-destructive h-10 w-10 rounded-xl"
                        >
                            <LogOut className="h-5 w-5" />
                        </Button>
                    )}
                </div>
            </div>
        </header>
    );
}

export default function AncLayout({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const router = useRouter();
  const { user: fbUser, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [mounted, setMounted] = useState(false);
  const [localUser, setLocalUser] = useState<any>(null);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isLoginPage = pathname?.startsWith('/anc/login');

  useEffect(() => {
    if (mounted) {
      const stored = localStorage.getItem('ancUser');
      if (stored) {
        setLocalUser(JSON.parse(stored));
      } else {
        setLocalUser(null);
        if (!isLoginPage) {
          router.push('/anc/login');
        }
      }
    }
  }, [pathname, mounted, isLoginPage, router]);

  useEffect(() => {
    if (mounted && !isUserLoading && !fbUser && auth) {
      signInAnonymously(auth).catch(() => {});
    }
  }, [mounted, isUserLoading, fbUser, auth]);

  const regsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'anc_registrations') : null, [firestore]);
  const { data: registrations } = useCollection<AncRegistration>(regsQuery);

  if (!mounted) return null;

  if (isLoginPage) {
      return (
        <div className="relative min-h-screen flex flex-col w-full selection:bg-primary/20 selection:text-primary bg-background/5">
            <main className="flex-1 flex flex-col w-full">
                <div className="flex-1 w-full flex items-center justify-center">
                    {children}
                </div>
            </main>
        </div>
      );
  }

  return (
    <SidebarProvider defaultOpen={true}>
        <div className="relative flex min-h-screen w-full selection:bg-primary/20 selection:text-primary bg-background/5">
            <NotificationPopupManager />
            <StudySidebar user={localUser} />
            
            <SidebarInset className="flex flex-col min-h-screen w-full transition-all duration-300">
                <AncHeader user={localUser} registrations={registrations} mounted={mounted} />
                
                <main className="flex-1 flex flex-col w-full p-4 md:p-8 overflow-y-auto">
                    <div className="flex-1 w-full max-w-screen-2xl mx-auto pb-20 md:pb-0">
                        {children}
                    </div>
                </main>

                <MobileBottomNav user={localUser} />
            </SidebarInset>

            <div className="fixed inset-0 -z-20 overflow-hidden pointer-events-none opacity-10 dark:opacity-5">
                <Image 
                src="https://picsum.photos/seed/partoma-clinical/1920/1080" 
                alt="PartoMa Background" 
                fill 
                className="object-cover grayscale" 
                priority 
                unoptimized
                />
            </div>
        </div>
    </SidebarProvider>
  );
}
