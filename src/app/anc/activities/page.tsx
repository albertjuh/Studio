"use client";

import { 
  UserPlus, 
  ClipboardList, 
  BarChart, 
  Database, 
  ShieldCheck, 
  Users,
  FileText,
  Activity,
  Heart,
  Download,
  Sparkles,
  ChevronDown,
  LayoutGrid,
  Zap,
  TrendingUp,
  Calendar,
  Mic,
  MessageSquare,
  ChevronRight,
  Stethoscope
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export default function ActivitiesHub() {
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const advancedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('ancUser');
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
  }, []);

  const toggleAdvanced = () => {
    const nextState = !showAdvanced;
    setShowAdvanced(nextState);
    
    if (nextState) {
      setTimeout(() => {
        advancedRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }, 100);
    }
  };

  const activities = [
    {
      title: "New Registration",
      description: "Capture clinical data for new ANC cohort participants.",
      icon: UserPlus,
      href: "/anc/register",
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-500/10",
      accentColor: "group-hover:bg-emerald-500",
      role: ["clinician", "admin"],
      category: "Clinical",
      essential: true
    },
    {
      title: "Workload Tracker",
      description: "Log daily clinic flow, staffing, and attrition drivers.",
      icon: ClipboardList,
      href: "/anc/recruitment",
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-500/10",
      accentColor: "group-hover:bg-blue-500",
      role: ["clinician", "admin"],
      category: "Tracking",
      essential: true
    },
    {
      title: "IDI Registry",
      description: "Track the 4-phase in-depth interview series.",
      icon: Mic,
      href: "/anc/idi",
      color: "text-violet-600 dark:text-violet-400",
      bgColor: "bg-violet-500/10",
      accentColor: "group-hover:bg-violet-500",
      role: ["clinician", "admin"],
      category: "Qualitative",
      essential: true
    },
    {
      title: "Action & Forecast",
      description: "Daily preparation for 14-day upcoming follow-up windows.",
      icon: Sparkles,
      href: "/anc/admin/timeline/due-today",
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-500/10",
      role: ["clinician", "admin", "viewer"],
      category: "Intelligence"
    },
    {
      title: "Cohort Registry",
      description: "Monitor actual enrollment counts and verified demographics.",
      icon: Database,
      href: "/anc/dashboard",
      color: "text-slate-600 dark:text-slate-400",
      bgColor: "bg-slate-500/10",
      role: ["clinician", "admin", "viewer"],
      category: "Data"
    },
    {
      title: "Workload Audit",
      description: "Analyze daily workload totals and attrition driver trends.",
      icon: Activity,
      href: "/anc/admin/recruitment",
      color: "text-indigo-600 dark:text-indigo-400",
      bgColor: "bg-indigo-500/10",
      role: ["clinician", "admin", "viewer"],
      category: "Analytics"
    },
    {
      title: "Intelligence Hub",
      description: "AI-driven vulnerability scans and outreach tasks.",
      icon: Zap,
      href: "/anc/notifications",
      color: "text-rose-600 dark:text-rose-400",
      bgColor: "bg-rose-500/10",
      role: ["clinician", "admin", "viewer"],
      category: "AI Feeds"
    },
    {
      title: "Export Center",
      description: "Download registry datasets and recruitment raw logs.",
      icon: Download,
      href: "/anc/admin/export",
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-500/10",
      role: ["admin", "viewer"],
      category: "Research"
    },
    {
      title: "System Audit",
      description: "Granular workload raw logs for study quality checks.",
      icon: ShieldCheck,
      href: "/anc/admin/recruitment/table",
      color: "text-slate-600 dark:text-slate-400",
      bgColor: "bg-slate-500/10",
      role: ["admin", "viewer"],
      category: "Integrity"
    }
  ];

  const filteredEssential = activities.filter(act => 
    act.essential && (!user || act.role.includes(user.role))
  );

  const filteredAdvanced = activities.filter(act => 
    !act.essential && (!user || act.role.includes(user.role))
  );

  return (
    <div className="relative max-w-7xl mx-auto space-y-20 pb-32 pt-8 px-6">
      <div className="flex flex-col gap-4 text-center md:text-left relative z-10">
        <div className="flex items-center justify-center md:justify-start">
            <Badge className="px-4 py-1.5 text-primary border-primary/20 font-black uppercase tracking-[0.3em] text-[10px] bg-primary/10 rounded-full shadow-sm ring-1 ring-primary/20">
                <LayoutGrid className="h-3.5 w-3.5 mr-2" /> Study Operation Terminal
            </Badge>
        </div>
        <div className="space-y-1">
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-[0.9] text-slate-900 dark:text-white">
                Activities <span className="text-primary italic">Hub</span>
            </h1>
            <p className="text-muted-foreground text-lg md:text-xl max-w-2xl leading-relaxed font-medium">
                Welcome back, <span className="text-primary font-black underline underline-offset-4 decoration-primary/30 decoration-4">{user?.name}</span>. Select your primary clinical workflow.
            </p>
        </div>
      </div>

      <div className="space-y-10">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="h-10 w-10 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30">
                    <Zap className="h-6 w-6" />
                </div>
                <div>
                    <h2 className="text-2xl font-black tracking-tight uppercase tracking-[0.2em] leading-none">Active Entry</h2>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1.5 opacity-60">High-Priority Field Tasks</p>
                </div>
            </div>
            <div className="hidden sm:block h-px flex-1 bg-gradient-to-r from-primary/20 to-transparent ml-8" />
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
            {filteredEssential.map((activity) => (
                <Link key={activity.href} href={activity.href} className="group outline-none">
                    <div className={cn(
                        "relative flex flex-col items-center justify-center space-y-8 py-14 transition-all duration-500 rounded-[4rem] h-full shadow-none overflow-hidden",
                        "bg-white dark:bg-slate-900/50 border border-primary/5 ring-1 ring-black/5 hover:ring-primary/40",
                        "group-hover:-translate-y-2 group-hover:shadow-2xl group-hover:shadow-primary/10 group-active:scale-95"
                    )}>
                        {/* Jewel Background Accent */}
                        <div className={cn("absolute -top-10 -right-10 w-32 h-32 blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-700", activity.bgColor)} />
                        
                        <div className={cn(
                            "relative p-10 md:p-12 rounded-[3rem] transition-all duration-500 shadow-none",
                            "bg-muted/30 group-hover:scale-110",
                            activity.color
                        )}>
                            <activity.icon className="h-14 w-14 md:h-16 md:w-16 stroke-[1.25px] drop-shadow-xl" />
                            <div className="absolute top-5 right-5 h-3 w-3 rounded-full bg-primary animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.8)]" />
                        </div>
                        
                        <div className="text-center space-y-3 px-8">
                            <div className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-1">{activity.category}</div>
                            <h3 className="text-2xl md:text-3xl font-black tracking-tighter transition-colors group-hover:text-primary leading-none">
                                {activity.title}
                            </h3>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed max-w-[240px] mx-auto">
                                {activity.description}
                            </p>
                        </div>

                        <div className="pt-4 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
                            <div className="p-3 rounded-full bg-primary/10 text-primary">
                                <ChevronRight className="h-6 w-6" />
                            </div>
                        </div>
                    </div>
                </Link>
            ))}
        </div>
      </div>

      {filteredAdvanced.length > 0 && (
        <div className="space-y-12 pt-12" ref={advancedRef}>
            <div className="flex flex-col items-center gap-8">
                <div className="text-center space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60">Research & Governance Suite</p>
                    <h3 className="text-lg font-bold text-slate-400 italic">Advanced Analytics & Automated Forecasts</h3>
                </div>
                
                <Button 
                    onClick={toggleAdvanced}
                    className={cn(
                        "h-16 px-12 rounded-full font-black uppercase tracking-[0.2em] text-xs gap-4 transition-all duration-500 shadow-2xl active:scale-95",
                        showAdvanced 
                          ? "bg-slate-900 dark:bg-white dark:text-slate-900 text-white" 
                          : "bg-primary text-white shadow-primary/30 hover:scale-105 hover:glow-emerald"
                    )}
                >
                    <div className={cn("transition-transform duration-500", showAdvanced && "rotate-180")}>
                        <ChevronDown className="h-5 w-5" />
                    </div>
                    {showAdvanced ? "Hide Management Tools" : "Unlock Management Tools"}
                    <Sparkles className={cn("h-4 w-4 text-amber-300 animate-pulse", showAdvanced && "text-primary")} />
                </Button>
            </div>

            <AnimatePresence>
                {showAdvanced && (
                    <motion.div 
                        initial={{ opacity: 0, y: 50, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9, y: 30 }}
                        transition={{ type: "spring", damping: 20, stiffness: 80 }}
                        className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 pt-4"
                    >
                        {filteredAdvanced.map((activity) => (
                            <Link key={activity.href} href={activity.href} className="group">
                                <div className="p-8 rounded-[3rem] transition-all duration-500 space-y-5 relative overflow-hidden h-full bg-white dark:bg-slate-900/40 border border-primary/5 shadow-sm group-hover:shadow-2xl group-hover:shadow-primary/5 group-hover:-translate-y-1">
                                    <div className="flex items-center gap-5">
                                        <div className={cn("p-5 rounded-2xl bg-muted/30 transition-all group-hover:scale-110 group-hover:bg-primary/10 group-hover:text-primary shadow-sm", activity.color)}>
                                            <activity.icon className="h-6 w-6 stroke-[2px]" />
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-black text-primary/40 uppercase tracking-widest leading-none mb-1.5">{activity.category}</div>
                                            <h3 className="text-xl font-black tracking-tight group-hover:text-primary leading-tight">{activity.title}</h3>
                                        </div>
                                    </div>
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                                        {activity.description}
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
      )}

      {(user?.role === 'admin' || user?.role === 'viewer') && (
        <div className="pt-20 relative z-10">
          <div className="flex items-center gap-5 mb-12">
            <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center shadow-inner">
                <ShieldCheck className="h-8 w-8 text-primary" />
            </div>
            <div>
                <h2 className="text-3xl font-black tracking-tighter leading-none">System Administration</h2>
                <p className="text-[11px] text-primary/60 font-black uppercase tracking-[0.3em] mt-2">Core Governance Controls</p>
            </div>
          </div>
          
          <div className="grid gap-8 md:grid-cols-2">
             <Link href="/anc/admin" className="group">
              <div className={cn(
                "flex items-center gap-6 p-8 rounded-[3.5rem] transition-all duration-500 border border-primary/10 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm",
                "hover:bg-primary/5 hover:shadow-3xl hover:shadow-primary/5 group-hover:-translate-x-2"
              )}>
                <div className="p-5 bg-white dark:bg-slate-800 rounded-3xl shadow-xl shadow-black/5 group-hover:rotate-12 transition-transform duration-500 ring-1 ring-black/5">
                    <Users className="h-8 w-8 text-primary" />
                </div>
                <div className="space-y-2">
                  <div className="font-black text-2xl tracking-tighter transition-colors group-hover:text-primary">Staff Access Manager</div>
                  <div className="text-sm text-muted-foreground font-medium max-w-sm leading-relaxed">Verify credentials, manage RA permissions and audit cohort registries with full trace-logs.</div>
                </div>
                <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="h-8 w-8 text-primary/40" />
                </div>
              </div>
            </Link>
          </div>
        </div>
      )}
      
      <div className="pt-32 flex flex-col items-center gap-6 text-primary/20">
        <div className="h-px w-24 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        <Heart className="h-10 w-10 fill-current animate-pulse" />
        <p className="text-[11px] font-black uppercase tracking-[0.5em] text-center max-w-xs leading-loose">
            PartoMa Project <br/>
            Clinical Integrity Standard v2.0
        </p>
      </div>
    </div>
  );
}