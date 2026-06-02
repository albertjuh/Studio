
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
      { href: '/anc/activities', label: 'Hub', sub: 'Primary', icon: LayoutDashboard, role: ['clinician', 'admin', 'viewer'] },
      { href: '/anc/admin/timeline/due-today', label: 'Actions', sub: 'Daily', icon: Telescope, role: ['clinician', 'admin', 'viewer'] },
      { href: '/anc/participants', label: 'Timeline', sub: 'Pregnancy', icon: HeartPulse, role: ['clinician', 'admin', 'viewer'] },
      { href: '/anc/dashboard', label: 'Registry', sub: 'Data', icon: Database, role: ['clinician', 'admin', 'viewer'] },
    ]
  },
  {
    label: "Admin",
    items: [
      { href: '/anc/admin/timeline', label: 'Analysis', sub: 'Stats', icon: TrendingUp, role: ['admin', 'viewer'] },
      { href: '/anc/admin/export', label: 'Export', sub: 'Intel', icon: DownloadCloud, role: ['admin', 'viewer'] },
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
            <span className={cn("text-[7px] font-black uppercase tracking-widest", isActive ? "opacity-100" : "opacity-40")}>{item.label}</span>
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
      <SidebarHeader className="h-12 flex items-center px-2 border-b border-primary/10">
        <Link href="/anc/activities" className="flex items-center gap-2 group">
          <div className="p-1 bg-primary text-white rounded-md shadow-sm">
            <ClipboardCheck className="h-3 w-3" />
          </div>
          <div className="flex flex-col group-data-[state=collapsed]:hidden">
            <span className="text-[10px] font-black tracking-tighter uppercase leading-none">
              PartoMa <span className="text-primary italic">Project</span>
            </span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent className="py-1">
        {NAV_GROUPS.map((group, gIdx) => {
          const filteredGroupItems = group.items.filter(item => !user || item.role.includes(user.role));
          if (filteredGroupItems.length === 0) return null;

          return (
            <SidebarGroup key={gIdx} className="mb-0 p-0">
              <SidebarGroupLabel className="px-2 text-[7px] font-black uppercase tracking-[0.2em] text-primary/30 group-data-[state=collapsed]:hidden h-6 flex items-center">
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-px">
                  {filteredGroupItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/anc/activities' && pathname.startsWith(item.href));
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton 
                          asChild 
                          isActive={isActive} 
                          className={cn(
                            "h-8 transition-all rounded-none relative group/btn border-l-2 border-transparent",
                            isActive ? "bg-primary/5 text-primary border-primary" : "text-slate-500 hover:bg-primary/5"
                          )}
                        >
                          <Link href={item.href} className="flex items-center gap-2 px-2 w-full">
                            <item.icon className={cn("h-3.5 w-3.5", isActive ? "stroke-[2.5px]" : "stroke-[1.8px]")} />
                            <div className="flex flex-col group-data-[state=collapsed]:hidden min-w-0">
                                <span className="font-black text-[9px] uppercase tracking-tight leading-none truncate">
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
      <SidebarFooter className="p-1 border-t bg-primary/[0.02]">
        <div className="flex flex-col gap-1 group-data-[state=collapsed]:items-center">
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
        <header className="sticky top-0 z-[50] w-full border-b bg-background/80 backdrop-blur-md h-10 flex items-center shrink-0">
            <div className="flex-1 flex items-center justify-between px-3">
                <div className="flex items-center gap-2">
                    <SidebarTrigger className="h-7 w-7 rounded-md" />
                    {user && mounted && (
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border">
                            {user.name}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white border rounded shadow-sm">
                        <span className="text-[9px] font-black text-primary tabular-nums">{stats.globalCount}</span>
                        <div className="w-px h-2.5 bg-border" />
                        <span className="text-[9px] font-black text-slate-900 tabular-nums">{stats.userCount}</span>
                    </div>
                    <NotificationBell />
                    <Button variant="ghost" size="icon" onClick={handleLogout} className="h-7 w-7 rounded-md text-slate-400 hover:text-rose-600">
                        <LogOut className="h-3 w-3" />
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
    <SidebarProvider defaultOpen={true} style={{ "--sidebar-width": "11rem" } as any}>
        <div className="relative flex min-h-screen w-full bg-background overflow-hidden h-svh">
            <NotificationPopupManager />
            <StudySidebar user={localUser} />
            <SidebarInset className="flex flex-col flex-1 !bg-transparent h-svh">
                <AncHeader user={localUser} registrations={registrations} mounted={mounted} />
                <main className="flex-1 flex flex-col w-full bg-transparent overflow-y-auto pb-12 md:pb-2">
                    <div className="flex-1 w-full px-2 md:px-4 py-2 relative z-10">
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
