
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
      color: "text-emerald-600 dark:text-emerald-400",
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
      color: "text-blue-600 dark:text-blue-400",
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
      color: "text-violet-600 dark:text-violet-400",
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
      color: "text-amber-600 dark:text-amber-400",
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
      color: "text-cyan-600 dark:text-cyan-400",
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
      color: "text-indigo-600 dark:text-indigo-400",
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
    <div className="relative max-w-5xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col gap-2 text-center md:text-left relative z-10">
        <div className="flex items-center justify-center md:justify-start">
            <Badge className="px-4 py-1.5 text-primary border-primary/20 font-black uppercase tracking-[0.2em] text-[8px] bg-primary/10 rounded-full shadow-sm">
                <LayoutGrid className="h-3 w-3 mr-2" /> Study Operation Terminal
            </Badge>
        </div>
        <div className="space-y-1">
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-none text-slate-900 dark:text-white">
                Activities <span className="text-primary italic">Hub</span>
            </h1>
            <p className="text-muted-foreground text-[10px] md:text-xs font-bold uppercase tracking-[0.3em] opacity-60">
                Welcome back, <span className="text-primary font-black">{user?.name}</span>
            </p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-primary text-white rounded-xl flex items-center justify-center shadow-xl shadow-primary/30">
                    <Zap className="h-4 w-4" />
                </div>
                <h2 className="text-[10px] font-black tracking-[0.4em] uppercase text-slate-500">Clinical Workflow</h2>
            </div>
            <div className="hidden sm:block h-px flex-1 bg-gradient-to-r from-primary/20 to-transparent ml-8" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEssential.map((activity) => (
                <Link key={activity.href} href={activity.href} className="group">
                    <div className={cn(
                        "relative flex flex-col items-center justify-center space-y-4 p-8 transition-all duration-500 rounded-xl h-[200px] overflow-hidden shadow-sm border-t-4 border-t-primary",
                        "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1"
                    )}>
                        <div className={cn("absolute -top-12 -right-12 w-32 h-32 blur-[80px] opacity-20", activity.bgColor)} />
                        
                        <div className={cn(
                            "relative p-4 rounded-xl transition-all duration-500 bg-muted/40 group-hover:scale-110",
                            activity.color
                        )}>
                            <activity.icon className="h-8 w-8 stroke-[1.5px]" />
                        </div>
                        
                        <div className="text-center space-y-1.5">
                            <div className="text-[8px] font-black text-primary uppercase tracking-[0.4em]">{activity.category}</div>
                            <h3 className="text-xl font-black tracking-tighter leading-none">
                                {activity.title}
                            </h3>
                            <p className="text-[10px] font-bold text-slate-500 leading-tight max-w-[180px] mx-auto opacity-70">
                                {activity.description}
                            </p>
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
                    className="h-10 px-10 rounded-xl font-black uppercase tracking-[0.3em] text-[9px] gap-3 hover:bg-primary/5 border-2 border-dashed border-primary/20"
                >
                    <ChevronDown className={cn("h-4 w-4 transition-transform duration-500", showAdvanced && "rotate-180")} />
                    {showAdvanced ? "Hide Management Suite" : "Unlock Management Suite"}
                </Button>
            </div>

            <AnimatePresence>
                {showAdvanced && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                    >
                        {filteredAdvanced.map((activity) => (
                            <Link key={activity.href} href={activity.href} className="group">
                                <div className={cn(
                                    "p-5 rounded-xl transition-all duration-300 space-y-3 relative overflow-hidden h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm border-l-4",
                                    activity.color.replace('text-', 'border-l-')
                                )}>
                                    <div className="flex items-center gap-4">
                                        <div className={cn("p-2.5 rounded-lg bg-muted/40 group-hover:bg-primary/10", activity.color)}>
                                            <activity.icon className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <div className="text-[8px] font-black text-primary uppercase tracking-widest leading-none mb-1">{activity.category}</div>
                                            <h3 className="text-sm font-black tracking-tight leading-none">{activity.title}</h3>
                                        </div>
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-500 leading-tight opacity-70">
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
