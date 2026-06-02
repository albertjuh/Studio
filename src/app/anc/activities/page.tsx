"use client";

import { 
  UserPlus, 
  ClipboardList, 
  Database, 
  Activity,
  ChevronDown,
  LayoutGrid,
  Zap,
  Mic,
  Telescope,
  Timer,
  Clock
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
      color: "text-emerald-700 dark:text-emerald-400",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/20",
      role: ["clinician", "admin"],
      category: "Clinical",
      essential: true
    },
    {
      title: "Workload Tracker",
      description: "Log daily clinic flow and attrition drivers.",
      icon: ClipboardList,
      href: "/anc/recruitment",
      color: "text-blue-700 dark:text-blue-400",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/20",
      role: ["clinician", "admin"],
      category: "Tracking",
      essential: true
    },
    {
      title: "IDI Registry",
      description: "Track the qualitative sub-study series.",
      icon: Mic,
      href: "/anc/idi",
      color: "text-violet-700 dark:text-violet-400",
      bgColor: "bg-violet-500/10",
      borderColor: "border-violet-500/20",
      role: ["clinician", "admin"],
      category: "Qualitative",
      essential: true
    },
    {
      title: "Action & Forecast",
      description: "14-day upcoming follow-up prep.",
      icon: Telescope,
      href: "/anc/admin/timeline/due-today",
      color: "text-amber-700 dark:text-amber-400",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/20",
      role: ["clinician", "admin", "viewer"],
      category: "Intelligence"
    },
    {
      title: "Cohort Registry",
      description: "Verified demographics and enrollment.",
      icon: Database,
      href: "/anc/dashboard",
      color: "text-cyan-700 dark:text-cyan-400",
      bgColor: "bg-cyan-500/10",
      borderColor: "border-cyan-500/20",
      role: ["clinician", "admin", "viewer"],
      category: "Data"
    },
    {
      title: "Workload Audit",
      description: "Daily totals and attrition analytics.",
      icon: Activity,
      href: "/anc/admin/recruitment",
      color: "text-indigo-700 dark:text-indigo-400",
      bgColor: "bg-indigo-500/10",
      borderColor: "border-indigo-500/20",
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
    <div className="relative max-w-5xl mx-auto space-y-12 pb-12">
      <div className="flex flex-col gap-3 text-center md:text-left relative z-10">
        <div className="flex items-center justify-center md:justify-start">
            <Badge className="px-5 py-2 text-primary border-primary/20 font-black uppercase tracking-[0.3em] text-[10px] bg-primary/10 rounded-xl shadow-sm">
                <LayoutGrid className="h-4 w-4 mr-3" /> Operations Terminal
            </Badge>
        </div>
        <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter leading-none text-slate-900 dark:text-white">
                Activities <span className="text-primary italic">Hub</span>
            </h1>
            <p className="text-muted-foreground text-[10px] md:text-xs font-black uppercase tracking-[0.4em] opacity-50">
                Welcome back, <span className="text-primary">{user?.name}</span>
            </p>
        </div>
      </div>

      <div className="space-y-8">
        <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-4">
                <div className="h-10 w-10 bg-primary text-white rounded-2xl flex items-center justify-center shadow-xl shadow-primary/30">
                    <Zap className="h-5 w-5" />
                </div>
                <h2 className="text-[10px] font-black tracking-[0.5em] uppercase text-slate-500">Clinical Workflow</h2>
            </div>
            <div className="hidden sm:block h-px flex-1 bg-gradient-to-r from-primary/20 to-transparent ml-10" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEssential.map((activity) => (
                <Link key={activity.href} href={activity.href} className="group active:scale-95 transition-all">
                    <div className={cn(
                        "relative flex flex-col items-center justify-center space-y-6 p-8 transition-all duration-500 rounded-[2rem] h-[240px] overflow-hidden shadow-sm",
                        "bg-white dark:bg-card border-none ring-1 ring-border group-hover:ring-primary/40 group-hover:shadow-2xl group-hover:shadow-primary/5 group-hover:-translate-y-2"
                    )}>
                        <div className={cn("absolute -top-12 -right-12 w-40 h-40 blur-[100px] opacity-20", activity.bgColor)} />
                        
                        <div className={cn(
                            "relative p-5 rounded-2xl transition-all duration-500 bg-slate-50 dark:bg-slate-900 group-hover:scale-110 group-hover:bg-primary group-hover:text-white group-hover:shadow-xl group-hover:shadow-primary/20",
                            activity.color
                        )}>
                            <activity.icon className="h-10 w-10 stroke-[1.5px]" />
                        </div>
                        
                        <div className="text-center space-y-2 relative z-10">
                            <div className="text-[9px] font-black text-primary uppercase tracking-[0.4em]">{activity.category}</div>
                            <h3 className="text-2xl font-black tracking-tighter leading-none">
                                {activity.title}
                            </h3>
                            <p className="text-[10px] font-bold text-slate-400 leading-relaxed max-w-[200px] mx-auto uppercase tracking-widest opacity-80">
                                {activity.description}
                            </p>
                        </div>
                    </div>
                </Link>
            ))}
        </div>
      </div>

      {filteredAdvanced.length > 0 && (
        <div className="space-y-8 pt-8" ref={advancedRef}>
            <div className="flex flex-col items-center gap-6">
                <Button 
                    onClick={toggleAdvanced}
                    variant="ghost"
                    className="h-12 px-12 rounded-2xl font-black uppercase tracking-[0.4em] text-[10px] gap-4 hover:bg-primary/5 border-2 border-dashed border-primary/20 transition-all active:scale-95"
                >
                    <ChevronDown className={cn("h-5 w-5 transition-transform duration-500", showAdvanced && "rotate-180")} />
                    {showAdvanced ? "Hide Management Suite" : "Unlock Management Suite"}
                </Button>
            </div>

            <AnimatePresence>
                {showAdvanced && (
                    <motion.div 
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 15 }}
                        className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
                    >
                        {filteredAdvanced.map((activity) => (
                            <Link key={activity.href} href={activity.href} className="group active:scale-95 transition-all">
                                <div className={cn(
                                    "p-6 rounded-[2rem] transition-all duration-300 space-y-4 relative overflow-hidden h-full bg-white dark:bg-card border-none ring-1 ring-border/50 shadow-sm hover:ring-primary/40 hover:shadow-md",
                                    activity.color.replace('text-', 'border-l-')
                                )}>
                                    <div className="flex items-center gap-5">
                                        <div className={cn("p-3 rounded-xl bg-slate-50 dark:bg-slate-900 group-hover:bg-primary/10 transition-colors", activity.color)}>
                                            <activity.icon className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <div className="text-[9px] font-black text-primary uppercase tracking-[0.3em] leading-none mb-1.5">{activity.category}</div>
                                            <h3 className="text-lg font-black tracking-tight leading-none">{activity.title}</h3>
                                        </div>
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400 leading-relaxed uppercase tracking-widest opacity-80">
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
    </div>
  );
}
