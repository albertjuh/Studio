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
  Telescope
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
      description: "Track the qualitative sub-study series.",
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
      description: "14-day upcoming follow-up prep.",
      icon: Telescope,
      href: "/anc/admin/timeline/due-today",
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-500/10",
      role: ["clinician", "admin", "viewer"],
      category: "Intelligence"
    },
    {
      title: "Cohort Registry",
      description: "Verified demographics and enrollment.",
      icon: Database,
      href: "/anc/dashboard",
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-500/10",
      role: ["clinician", "admin", "viewer"],
      category: "Data"
    },
    {
      title: "Workload Audit",
      description: "Daily totals and attrition analytics.",
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
    <div className="relative max-w-5xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col gap-2 text-center md:text-left relative z-10">
        <div className="flex items-center justify-center md:justify-start">
            <Badge className="px-3 py-1 text-primary border-primary/20 font-black uppercase tracking-widest text-[8px] bg-primary/10 rounded-full">
                <LayoutGrid className="h-3 w-3 mr-1.5" /> Study Operation Terminal
            </Badge>
        </div>
        <div className="space-y-0.5">
            <h1 className="text-3xl md:text-4xl font-black tracking-tighter leading-none text-slate-900 dark:text-white">
                Activities <span className="text-primary italic">Hub</span>
            </h1>
            <p className="text-muted-foreground text-[10px] md:text-xs font-medium uppercase tracking-widest opacity-60">
                Welcome, <span className="text-primary font-black">{user?.name}</span>. Select a clinical workflow.
            </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="h-6 w-6 bg-primary text-white rounded-lg flex items-center justify-center shadow-lg shadow-primary/30">
                    <Zap className="h-3 w-3" />
                </div>
                <h2 className="text-[10px] font-black tracking-widest uppercase text-slate-500">Active Entry</h2>
            </div>
            <div className="hidden sm:block h-px flex-1 bg-gradient-to-r from-primary/20 to-transparent ml-6" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredEssential.map((activity) => (
                <Link key={activity.href} href={activity.href} className="group">
                    <div className={cn(
                        "relative flex flex-col items-center justify-center space-y-3 p-6 transition-all duration-300 rounded-2xl h-[180px] overflow-hidden shadow-sm border-t-2 border-t-primary",
                        "bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 hover:ring-2 hover:ring-primary/20"
                    )}>
                        <div className={cn("absolute -top-10 -right-10 w-24 h-24 blur-[60px] opacity-10", activity.bgColor)} />
                        
                        <div className={cn(
                            "relative p-3 rounded-xl transition-all duration-500 bg-muted/40 group-hover:bg-primary/10",
                            activity.color
                        )}>
                            <activity.icon className="h-6 w-6 stroke-[1.5px]" />
                        </div>
                        
                        <div className="text-center space-y-1">
                            <div className="text-[7px] font-black text-primary uppercase tracking-[0.4em]">{activity.category}</div>
                            <h3 className="text-lg font-black tracking-tight leading-tight">
                                {activity.title}
                            </h3>
                            <p className="text-[9px] font-medium text-slate-500 leading-tight max-w-[160px] mx-auto">
                                {activity.description}
                            </p>
                        </div>
                    </div>
                </Link>
            ))}
        </div>
      </div>

      {filteredAdvanced.length > 0 && (
        <div className="space-y-4 pt-4" ref={advancedRef}>
            <div className="flex flex-col items-center gap-4">
                <Button 
                    onClick={toggleAdvanced}
                    variant="ghost"
                    className="h-9 px-8 rounded-full font-black uppercase tracking-[0.2em] text-[8px] gap-3 hover:bg-primary/5 border border-dashed border-primary/20"
                >
                    <ChevronDown className={cn("h-3 w-3 transition-transform duration-500", showAdvanced && "rotate-180")} />
                    {showAdvanced ? "Hide Management Tools" : "Unlock Management Tools"}
                </Button>
            </div>

            <AnimatePresence>
                {showAdvanced && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
                    >
                        {filteredAdvanced.map((activity) => (
                            <Link key={activity.href} href={activity.href} className="group">
                                <div className="p-4 rounded-xl transition-all duration-300 space-y-2 relative overflow-hidden h-full bg-white/60 dark:bg-slate-900/40 backdrop-blur-md border border-white/20 shadow-sm border-t-2 border-t-primary/20 hover:border-t-primary">
                                    <div className="flex items-center gap-3">
                                        <div className={cn("p-2 rounded-lg bg-muted/40 group-hover:bg-primary/10", activity.color)}>
                                            <activity.icon className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <div className="text-[7px] font-black text-primary uppercase tracking-widest">{activity.category}</div>
                                            <h3 className="text-xs font-black tracking-tight">{activity.title}</h3>
                                        </div>
                                    </div>
                                    <p className="text-[9px] font-medium text-slate-500 leading-tight">
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