
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
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export default function ActivitiesHub() {
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem('ancUser');
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
  }, []);

  const activities = [
    {
      title: "New Registration",
      description: "Enroll participants.",
      icon: UserPlus,
      href: "/anc/register",
      color: "text-emerald-600",
      bgColor: "bg-emerald-500/10",
      role: ["clinician", "admin"],
      category: "Clinical",
      essential: true
    },
    {
      title: "Workload Tracker",
      description: "Log daily clinic flow.",
      icon: ClipboardList,
      href: "/anc/recruitment",
      color: "text-blue-600",
      bgColor: "bg-blue-500/10",
      role: ["clinician", "admin"],
      category: "Tracking",
      essential: true
    },
    {
      title: "IDI Registry",
      description: "Qualitative sub-study.",
      icon: Mic,
      href: "/anc/idi",
      color: "text-violet-600",
      bgColor: "bg-violet-500/10",
      role: ["clinician", "admin"],
      category: "Qualitative",
      essential: true
    },
    {
      title: "Action & Forecast",
      description: "14-day upcoming tasks.",
      icon: Telescope,
      href: "/anc/admin/timeline/due-today",
      color: "text-amber-600",
      bgColor: "bg-amber-500/10",
      role: ["clinician", "admin", "viewer"],
      category: "Outreach"
    },
    {
      title: "Cohort Registry",
      description: "Demographic data.",
      icon: Database,
      href: "/anc/dashboard",
      color: "text-cyan-600",
      bgColor: "bg-cyan-500/10",
      role: ["clinician", "admin", "viewer"],
      category: "Data"
    },
    {
      title: "Workload Audit",
      description: "Attrition analytics.",
      icon: Activity,
      href: "/anc/admin/recruitment",
      color: "text-indigo-600",
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
    <div className="max-w-5xl mx-auto space-y-4 pb-6">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
            <Badge className="px-2 py-0.5 text-primary border-primary/20 font-black uppercase tracking-widest text-[8px] bg-primary/5 rounded-lg">
                <LayoutGrid className="h-2.5 w-2.5 mr-1" /> Terminal
            </Badge>
        </div>
        <h1 className="text-xl md:text-2xl font-black tracking-tighter">
            Activities <span className="text-primary italic">Hub</span>
        </h1>
        <p className="text-muted-foreground text-[8px] font-black uppercase tracking-[0.2em] opacity-60">
            Staff: <span className="text-primary">{user?.name}</span>
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
            <Zap className="h-3 w-3 text-primary" />
            <h2 className="text-[9px] font-black tracking-widest uppercase text-slate-500">Core Workflow</h2>
            <div className="h-px flex-1 bg-border/40 ml-2" />
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {filteredEssential.map((activity) => (
                <Link key={activity.href} href={activity.href} className="group active:scale-95 transition-all">
                    <div className={cn(
                        "relative flex flex-col items-center justify-center p-3 transition-all rounded-xl h-[120px] overflow-hidden border bg-white dark:bg-card shadow-sm hover:ring-2 hover:ring-primary/20"
                    )}>
                        <div className={cn("absolute -top-6 -right-6 w-16 h-16 blur-3xl opacity-20", activity.bgColor)} />
                        
                        <div className={cn(
                            "relative p-2 rounded-lg bg-slate-50 dark:bg-slate-900 group-hover:bg-primary group-hover:text-white transition-colors mb-2",
                            activity.color
                        )}>
                            <activity.icon className="h-4 w-4" />
                        </div>
                        
                        <div className="text-center space-y-0.5 relative z-10">
                            <div className="text-[7px] font-black text-primary uppercase tracking-widest">{activity.category}</div>
                            <h3 className="text-xs font-black tracking-tight leading-none">
                                {activity.title}
                            </h3>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none opacity-80 truncate max-w-[120px]">
                                {activity.description}
                            </p>
                        </div>
                    </div>
                </Link>
            ))}
        </div>
      </div>

      <div className="space-y-3 pt-1">
        <div className="flex flex-col items-center">
            <Button 
                onClick={() => setShowAdvanced(!showAdvanced)}
                variant="ghost"
                size="sm"
                className="h-7 px-4 rounded-lg font-black uppercase tracking-widest text-[8px] gap-2 hover:bg-primary/5 border border-dashed border-primary/20"
            >
                <ChevronDown className={cn("h-3 w-3 transition-transform duration-300", showAdvanced && "rotate-180")} />
                {showAdvanced ? "Hide Management" : "Management Tools"}
            </Button>
        </div>

        <AnimatePresence>
            {showAdvanced && (
                <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 3 }}
                    className="grid gap-2 grid-cols-2 md:grid-cols-3"
                >
                    {filteredAdvanced.map((activity) => (
                        <Link key={activity.href} href={activity.href} className="group active:scale-95 transition-all">
                            <div className="p-2.5 rounded-xl border bg-white dark:bg-card shadow-sm hover:ring-2 hover:ring-primary/20 transition-all">
                                <div className="flex items-center gap-2">
                                    <div className={cn("p-1.5 rounded-lg bg-slate-50 dark:bg-slate-900", activity.color)}>
                                        <activity.icon className="h-3.5 w-3.5" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-[6px] font-black text-primary uppercase tracking-widest mb-0.5">{activity.category}</div>
                                        <h3 className="text-[10px] font-black tracking-tight leading-none truncate">{activity.title}</h3>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </motion.div>
            )}
        </AnimatePresence>
      </div>
    </div>
  );
}
