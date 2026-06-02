
"use client";

import type { ReactNode } from 'react';
import { useEffect, useState, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  ClipboardCheck, 
  LogOut, 
  LayoutDashboard, 
  HeartPulse,
  Activity,
  Telescope,
  TrendingUp,
  DownloadCloud,
  Database,
  ShieldCheck,
  Sparkles
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
import { motion } from 'framer-motion';
import placeholders from '@/app/lib/placeholder-images.json';
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
  SidebarInset,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent
} from '@/components/ui/sidebar';

const NAV_GROUPS = [
  {
    label: "Ops",
    items: [
      { href: '/anc/activities', label: 'Activities', sub: 'Primary Hub', icon: LayoutDashboard, role: ['clinician', 'admin', 'viewer'] },
      { href: '/anc/admin/timeline/due-today', label: 'Action List', sub: 'Daily Outreach', icon: Telescope, role: ['clinician', 'admin', 'viewer'] },
      { href: '/anc/participants', label: 'Timeline', sub: 'Pregnancy', icon: HeartPulse, role: ['clinician', 'admin', 'viewer'] },
      { href: '/anc/dashboard', label: 'Registry', sub: 'Data Feed', icon: Database, role: ['clinician', 'admin', 'viewer'] },
    ]
  },
  {
    label: "Management",
    items: [
      { href: '/anc/admin/timeline', label: 'Analysis', sub: 'Population', icon: TrendingUp, role: ['admin', 'viewer'] },
      { href: '/anc/admin/export', label: 'Export', sub: 'Intel Hub', icon: DownloadCloud, role: ['admin', 'viewer'] },
    ]
  }
];

function MobileBottomNav({ user }: { user: any }) {
  const pathname = usePathname();
  const filteredItems = NAV_GROUPS.flatMap(g => g.items).filter(item => !user || item.role.includes(user.role)).slice(0, 5);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[40] md:hidden bg-background/90 backdrop-blur-xl border-t h-12 flex items-center justify-around pb-safe shadow-lg">
      {filteredItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== '/anc/activities' && pathname.startsWith(item.href));
        return (
          <Link 
            key={item.href} 
            href={item.href}
            className={cn(
              "relative flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all duration-300",
              isActive ? "text-primary" : "text-muted-foreground/50"
            )}
          >
            <item.icon className={cn("h-4 w-4", isActive ? "stroke-[2.5px]" : "stroke-[1.5px]")} />
            <span className={cn("text-[7px] font-black uppercase tracking-widest", isActive ? "opacity-100" : "opacity-40")}>{item.label.split(' ')[0]}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function StudySidebar({ user }: { user: any }) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" className="border-r bg-sidebar/50 backdrop-blur-xl">
      <SidebarHeader className="h-14 flex items-center px-4 border-b border-primary/10">
        <Link href="/anc/activities" className="flex items-center gap-2 group">
          <div className="p-1.5 bg-primary text-white rounded-lg shadow-sm">
            <ClipboardCheck className="h-3.5 w-3.5" />
          </div>
          <div className="flex flex-col group-data-[state=collapsed]:hidden">
            <span className="text-[10px] font-black tracking-tighter uppercase leading-none">
              PartoMa <span className="text-primary">Project</span>
            </span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent className="py-2">
        {NAV_GROUPS.map((group, gIdx) => {
          const filteredGroupItems = group.items.filter(item => !user || item.role.includes(user.role));
          if (filteredGroupItems.length === 0) return null;

          return (
            <SidebarGroup key={gIdx} className="mb-1">
              <SidebarGroupLabel className="px-4 text-[7px] font-black uppercase tracking-widest text-primary/40 group-data-[state=collapsed]:hidden">
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5 px-2">
                  {filteredGroupItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/anc/activities' && pathname.startsWith(item.href));
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton 
                          asChild 
                          isActive={isActive} 
                          className={cn(
                            "h-9 transition-all rounded-lg relative group/btn",
                            isActive ? "bg-primary/10 text-primary ring-1 ring-primary/20" : "text-slate-500 hover:bg-primary/5"
                          )}
                        >
                          <Link href={item.href} className="flex items-center gap-3 px-2 w-full">
                            <item.icon className={cn("h-4 w-4", isActive ? "stroke-[2.5px]" : "stroke-[1.8px]")} />
                            <div className="flex flex-col group-data-[state=collapsed]:hidden">
                                <span className="font-black text-[10px] uppercase tracking-tight leading-none">
                                    {item.label}
                                </span>
                            </div>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
      <SidebarFooter className="p-2 border-t bg-primary/[0.02]">
        <div className="flex flex-col gap-2 group-data-[state=collapsed]:items-center">
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
        if (!user?.name || !registrations || !Array.isArray(registrations)) return { userCount: 0, globalCount: 0 };
        return { 
            userCount: registrations.filter(r => r && r.registeredBy === user.name).length,
            globalCount: registrations.length 
        };
    }, [user?.name, registrations]);

    return (
        <header className="sticky top-0 z-[50] w-full border-b bg-background/80 backdrop-blur-md h-12 flex items-center shrink-0">
            <div className="flex-1 flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                    <SidebarTrigger className="h-8 w-8 rounded-lg" />
                    {user && mounted && (
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 bg-slate-50 px-2 py-1 rounded-md border">
                            {user.name}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1 bg-white border rounded-lg shadow-sm">
                        <span className="text-[10px] font-black text-primary tabular-nums">{stats.globalCount}</span>
                        <div className="w-px h-3 bg-border" />
                        <span className="text-[10px] font-black text-slate-900 tabular-nums">{stats.userCount}</span>
                    </div>
                    <NotificationBell />
                    <Button variant="ghost" size="icon" onClick={handleLogout} className="h-8 w-8 rounded-lg text-slate-400 hover:text-rose-600">
                        <LogOut className="h-3.5 w-3.5" />
                    </Button>
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
        if (!isLoginPage) router.push('/anc/login');
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

  if (isLoginPage) return <div className="min-h-screen bg-muted/40">{children}</div>;

  return (
    <SidebarProvider defaultOpen={true}>
        <div className="relative flex min-h-screen w-full bg-background overflow-hidden h-svh">
            <NotificationPopupManager />
            <StudySidebar user={localUser} />
            <SidebarInset className="flex flex-col flex-1 !bg-transparent h-svh">
                <AncHeader user={localUser} registrations={registrations} mounted={mounted} />
                <main className="flex-1 flex flex-col w-full bg-transparent overflow-y-auto pb-16 md:pb-4">
                    <div className="flex-1 w-full px-3 md:px-6 py-4 relative z-10">
                        <div className="max-w-[1400px] mx-auto">
                            {children}
                        </div>
                    </div>
                </main>
                <MobileBottomNav user={localUser} />
            </SidebarInset>
        </div>
    </SidebarProvider>
  );
}
