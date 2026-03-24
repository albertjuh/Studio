
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
  Calendar
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
    
    // Auto-scroll to the advanced section when opening
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
      role: ["clinician", "admin"],
      category: "Forms",
      essential: true
    },
    {
      title: "Recruitment Tracker",
      description: "Log daily clinic workload, ANC flow, and attrition drivers.",
      icon: ClipboardList,
      href: "/anc/recruitment",
      color: "text-blue-600 dark:text-blue-400",
      role: ["clinician", "admin"],
      category: "Forms",
      essential: true
    },
    {
      title: "Participant Registry",
      description: "Monitor actual enrollment counts and cohort demographics.",
      icon: Users,
      href: "/anc/dashboard",
      color: "text-slate-600 dark:text-slate-400",
      role: ["clinician", "admin", "viewer"],
      category: "Analytics"
    },
    {
      title: "Survey Forecast",
      description: "Early preparation for 14-day upcoming follow-up windows.",
      icon: Sparkles,
      href: "/anc/admin/timeline/due-today",
      color: "text-blue-600 dark:text-blue-400",
      role: ["clinician", "admin", "viewer"],
      category: "Intelligence"
    },
    {
      title: "Workload Analysis",
      description: "Analyze daily workload totals and attrition driver trends.",
      icon: Activity,
      href: "/anc/admin/recruitment",
      color: "text-indigo-600 dark:text-indigo-400",
      role: ["clinician", "admin", "viewer"],
      category: "Analytics"
    },
    {
      title: "RA Weekly Scheduler",
      description: "AI-optimized weekly facility assignments for all RAs.",
      icon: Calendar,
      href: "/anc/admin/schedule",
      color: "text-violet-600 dark:text-violet-400",
      role: ["admin"],
      category: "Intelligence"
    },
    {
      title: "Intelligence Hub",
      description: "AI-driven vulnerability scans and outreach tasks.",
      icon: Activity,
      href: "/anc/notifications",
      color: "text-violet-600 dark:text-violet-400",
      role: ["clinician", "admin", "viewer"],
      category: "Intelligence"
    },
    {
      title: "Export Center",
      description: "Download registry datasets and recruitment raw logs.",
      icon: Download,
      href: "/anc/admin/export",
      color: "text-emerald-600 dark:text-emerald-400",
      role: ["admin", "viewer"],
      category: "Data"
    },
    {
      title: "System Logs",
      description: "Granular workload raw logs for audit and quality check.",
      icon: FileText,
      href: "/anc/admin/recruitment/table",
      color: "text-amber-600 dark:text-amber-400",
      role: ["admin", "viewer"],
      category: "Audit"
    }
  ];

  const filteredEssential = activities.filter(act => 
    act.essential && (!user || act.role.includes(user.role))
  );

  const filteredAdvanced = activities.filter(act => 
    !act.essential && (!user || act.role.includes(user.role))
  );

  return (
    <div className="relative max-w-6xl mx-auto space-y-16 pb-24 md:pb-8 pt-4">
      <div className="flex flex-col gap-3 text-center md:text-left relative z-10 px-4">
        <div className="flex items-center justify-center md:justify-start">
            <Badge className="px-3 py-1 text-primary border-none font-black uppercase tracking-widest text-[9px] bg-primary/10">
                <LayoutGrid className="h-3 w-3 mr-1.5" /> Study Terminal
            </Badge>
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter">Activities Hub</h1>
        <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
            Welcome back, <span className="text-foreground font-bold">{user?.name}</span>. Start your primary workflow below.
        </p>
      </div>

      <div className="space-y-12">
        <div className="flex items-center gap-3 px-4">
            <div className="h-8 w-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                <Zap className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-xl font-black tracking-tight uppercase tracking-widest">Active Data Entry</h2>
        </div>
        
        <div className="grid grid-cols-2 gap-4 md:gap-8 relative z-10 px-4">
            {filteredEssential.map((activity) => (
                <Link key={activity.href} href={activity.href} className="group outline-none">
                    <div className={cn(
                        "flex flex-col items-center justify-center space-y-6 py-10 transition-all duration-500 rounded-[3rem] h-full shadow-none",
                        "md:bg-card md:shadow-xl md:p-8",
                        "group-hover:-translate-y-1 group-active:scale-95"
                    )}>
                        <div className={cn(
                            "relative p-8 md:p-10 rounded-[2.5rem] transition-all duration-500 shadow-none",
                            "dark:shadow-none md:shadow-none md:bg-muted/20",
                            "bg-muted/20 md:group-hover:bg-background md:group-hover:shadow-lg",
                            activity.color
                        )}>
                            <activity.icon className="h-12 w-12 md:h-16 md:w-16 stroke-[1.5px]" />
                            <div className="absolute top-4 right-4 h-2 w-2 rounded-full bg-primary/20 animate-pulse" />
                        </div>
                        
                        <div className="text-center space-y-1.5 px-2">
                            <div className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] opacity-60">{activity.category}</div>
                            <h3 className="text-xl md:text-2xl font-black tracking-tighter transition-colors group-hover:text-primary leading-tight">
                                {activity.title}
                            </h3>
                            <p className="hidden md:block text-xs font-medium text-muted-foreground leading-relaxed max-w-[200px]">
                                {activity.description}
                            </p>
                        </div>
                    </div>
                </Link>
            ))}
        </div>
      </div>

      {filteredAdvanced.length > 0 && (
        <div className="space-y-8 pt-8 px-4" ref={advancedRef}>
            <div className="flex flex-col items-center gap-6">
                <div className="text-center space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60">Advanced Management Suite</p>
                    <h3 className="text-sm font-bold text-slate-400 italic">Looking for Analytics or Forecasts?</h3>
                </div>
                
                <Button 
                    onClick={toggleAdvanced}
                    className={cn(
                        "h-16 px-10 rounded-full font-black uppercase tracking-[0.2em] text-xs gap-3 transition-all duration-500",
                        showAdvanced 
                          ? "bg-slate-900 dark:bg-slate-800 text-white shadow-2xl" 
                          : "bg-primary text-white shadow-xl shadow-primary/20 hover:scale-105 active:scale-95"
                    )}
                >
                    <div className={cn("transition-transform duration-500", showAdvanced && "rotate-180")}>
                        <ChevronDown className="h-5 w-5" />
                    </div>
                    {showAdvanced ? "Hide Management Tools" : "Unlock Management Tools"}
                    <Sparkles className={cn("h-4 w-4 text-amber-300 animate-pulse", showAdvanced && "text-white")} />
                </Button>
            </div>

            <AnimatePresence>
                {showAdvanced && (
                    <motion.div 
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ type: "spring", damping: 20, stiffness: 100 }}
                        className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 pt-8"
                    >
                        {filteredAdvanced.map((activity) => (
                            <Link key={activity.href} href={activity.href} className="group">
                                <div className="p-6 rounded-[2.5rem] transition-all duration-500 space-y-4 relative overflow-hidden h-full bg-muted/20 dark:bg-card hover:bg-background hover:shadow-2xl shadow-none border-none">
                                    <div className="flex items-center gap-4">
                                        <div className={cn("p-4 rounded-2xl bg-background shadow-sm transition-transform group-hover:scale-110", activity.color)}>
                                            <activity.icon className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <div className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{activity.category}</div>
                                            <h3 className="text-lg font-black tracking-tight group-hover:text-primary">{activity.title}</h3>
                                        </div>
                                    </div>
                                    <p className="text-xs font-medium text-slate-500 leading-relaxed">
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
        <div className="pt-16 relative z-10 px-4">
          <div className="flex items-center gap-3 mb-10">
            <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <div>
                <h2 className="text-2xl font-black tracking-tight">System Administration</h2>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Global Governance Controls</p>
            </div>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2">
             <Link href="/anc/admin" className="group">
              <div className={cn(
                "flex items-start gap-5 p-6 rounded-[2.5rem] transition-all duration-500 shadow-none border-none",
                "bg-transparent shadow-none",
                "hover:bg-white/10 dark:hover:bg-white/5 hover:backdrop-blur-[1.5px] hover:shadow-2xl"
              )}>
                <div className="p-4 bg-transparent rounded-2xl transition-colors group-hover:rotate-6">
                    <Users className="h-6 w-6 text-slate-600 dark:text-slate-400" />
                </div>
                <div className="space-y-1">
                  <div className="font-extrabold text-lg tracking-tight transition-colors group-hover:text-primary">Staff Access Manager</div>
                  <div className="text-sm text-muted-foreground font-medium max-w-sm">Verify credentials, manage RA permissions and audit cohort registries.</div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      )}
      
      <div className="pt-24 flex flex-col items-center gap-4 text-muted-foreground/40">
        <Heart className="h-5 w-5 fill-current" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em]">PartoMa Clinical Integrity</p>
      </div>
    </div>
  );
}
