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
      description: "Capture clinical data for new participants.",
      icon: UserPlus,
      href: "/anc/register",
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-500/10",
      role: ["clinician", "admin"],
      category: "Clinical",
      essential: true
    },
    {
      title: "Workload Tracker",
      description: "Log daily clinic flow and attrition drivers.",
      icon: ClipboardList,
      href: "/anc/recruitment",
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-500/10",
      role: ["clinician", "admin"],
      category: "Tracking",
      essential: true
    },
    {
      title: "IDI Registry",
      description: "Track the 4-phase qualitative interview series.",
      icon: Mic,
      href: "/anc/idi",
      color: "text-violet-600 dark:text-violet-400",
      bgColor: "bg-violet-500/10",
      role: ["clinician", "admin"],
      category: "Qualitative",
      essential: true
    },
    {
      title: "Action & Forecast",
      description: "14-day upcoming follow-up window prep.",
      icon: Sparkles,
      href: "/anc/admin/timeline/due-today",
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-500/10",
      role: ["clinician", "admin", "viewer"],
      category: "Intelligence"
    },
    {
      title: "Cohort Registry",
      description: "Verified demographics and enrollment feed.",
      icon: Database,
      href: "/anc/dashboard",
      color: "text-slate-600 dark:text-slate-400",
      bgColor: "bg-slate-500/10",
      role: ["clinician", "admin", "viewer"],
      category: "Data"
    },
    {
      title: "Workload Audit",
      description: "Daily totals and attrition trend analytics.",
      icon: Activity,
      href: "/anc/admin/recruitment",
      color: "text-indigo-600 dark:text-indigo-400",
      bgColor: "bg-indigo-500/10",
      role: ["clinician", "admin", "viewer"],
      category: "Analytics"
    }
  ];

  const filteredEssential = activities.filter(act => 
    act.essential && (!user || act.role.includes(user.role))
  );

  const filteredAdvanced = activities.filter(act => 
    !act.essential && (!user || act.role.includes(user.role))
  );

  return (
    <div className="relative max-w-6xl mx-auto space-y-6 pb-8">
      <div className="flex flex-col gap-2 text-center md:text-left relative z-10">
        <div className="flex items-center justify-center md:justify-start">
            <Badge className="px-3 py-1 text-primary border-primary/20 font-black uppercase tracking-[0.2em] text-[9px] bg-primary/10 rounded-full shadow-sm">
                <LayoutGrid className="h-3 w-3 mr-1.5" /> Study Terminal
            </Badge>
        </div>
        <div className="space-y-0.5">
            <h1 className="text-3xl md:text-4xl font-black tracking-tighter leading-none text-slate-900 dark:text-white">
                Activities <span className="text-primary italic">Hub</span>
            </h1>
            <p className="text-muted-foreground text-xs md:text-sm font-medium">
                Welcome, <span className="text-primary font-bold">{user?.name}</span>. Select a clinical workflow.
            </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
                    <Zap className="h-4 w-4" />
                </div>
                <div>
                    <h2 className="text-lg font-black tracking-tight uppercase tracking-widest leading-none">Active Entry</h2>
                </div>
            </div>
            <div className="hidden sm:block h-px flex-1 bg-gradient-to-r from-primary/10 to-transparent ml-6" />
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
            {filteredEssential.map((activity) => (
                <Link key={activity.href} href={activity.href} className="group outline-none">
                    <div className={cn(
                        "relative flex flex-col items-center justify-center space-y-4 py-6 transition-all duration-300 rounded-[2rem] h-full overflow-hidden",
                        "bg-white/80 dark:bg-slate-900/50 border border-primary/5 ring-1 ring-black/5 hover:ring-primary/30 shadow-sm",
                        "group-hover:-translate-y-1 group-hover:shadow-xl group-active:scale-95"
                    )}>
                        <div className={cn("absolute -top-10 -right-10 w-24 h-24 blur-3xl opacity-0 group-hover:opacity-10 transition-opacity duration-700", activity.bgColor)} />
                        
                        <div className={cn(
                            "relative p-5 rounded-2xl transition-all duration-300 shadow-none",
                            "bg-muted/30 group-hover:scale-105",
                            activity.color
                        )}>
                            <activity.icon className="h-8 w-8 stroke-[1.5px]" />
                        </div>
                        
                        <div className="text-center space-y-1 px-6">
                            <div className="text-[8px] font-black text-primary uppercase tracking-[0.3em]">{activity.category}</div>
                            <h3 className="text-lg font-black tracking-tighter transition-colors group-hover:text-primary leading-tight">
                                {activity.title}
                            </h3>
                            <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-tight max-w-[180px] mx-auto">
                                {activity.description}
                            </p>
                        </div>

                        <div className="pt-1 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                            <div className="p-2 rounded-full bg-primary/10 text-primary">
                                <ChevronRight className="h-4 w-4" />
                            </div>
                        </div>
                    </div>
                </Link>
            ))}
        </div>
      </div>

      {filteredAdvanced.length > 0 && (
        <div className="space-y-6 pt-4" ref={advancedRef}>
            <div className="flex flex-col items-center gap-4">
                <Button 
                    onClick={toggleAdvanced}
                    variant="ghost"
                    className="h-10 px-8 rounded-full font-black uppercase tracking-widest text-[10px] gap-2 transition-all duration-300 hover:bg-primary/5"
                >
                    <div className={cn("transition-transform duration-500", showAdvanced && "rotate-180")}>
                        <ChevronDown className="h-4 w-4" />
                    </div>
                    {showAdvanced ? "Hide Management" : "Unlock Management"}
                    <Sparkles className={cn("h-3.5 w-3.5 text-amber-400 animate-pulse")} />
                </Button>
            </div>

            <AnimatePresence>
                {showAdvanced && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98, y: 10 }}
                        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 pt-2"
                    >
                        {filteredAdvanced.map((activity) => (
                            <Link key={activity.href} href={activity.href} className="group">
                                <div className="p-5 rounded-3xl transition-all duration-300 space-y-3 relative overflow-hidden h-full bg-white/60 dark:bg-slate-900/30 border border-primary/5 shadow-sm group-hover:shadow-lg group-hover:-translate-y-0.5">
                                    <div className="flex items-center gap-4">
                                        <div className={cn("p-3 rounded-xl bg-muted/30 transition-all group-hover:scale-105 group-hover:bg-primary/10 group-hover:text-primary shadow-sm", activity.color)}>
                                            <activity.icon className="h-5 w-5 stroke-[2px]" />
                                        </div>
                                        <div>
                                            <div className="text-[8px] font-black text-primary/40 uppercase tracking-widest leading-none mb-1">{activity.category}</div>
                                            <h3 className="text-base font-black tracking-tight group-hover:text-primary leading-tight">{activity.title}</h3>
                                        </div>
                                    </div>
                                    <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-tight">
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
      
      <div className="pt-12 flex flex-col items-center gap-4 text-primary/20">
        <Heart className="h-5 w-5 fill-current animate-pulse" />
        <p className="text-[8px] font-black uppercase tracking-[0.4em] text-center opacity-40">
            Clinical Integrity Standard v2.0
        </p>
      </div>
    </div>
  );
}
