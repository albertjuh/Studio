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
  const [activeIndex, setActiveIndex] = useState(0);
  const advancedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('ancUser');
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
  }, []);

  // Auto-rotation for the main stack
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % filteredEssential.length);
    }, 5000);
    return () => clearInterval(interval);
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
    <div className="relative max-w-6xl mx-auto space-y-12 pb-24">
      <div className="flex flex-col gap-3 text-center md:text-left relative z-10">
        <div className="flex items-center justify-center md:justify-start">
            <Badge className="px-4 py-1.5 text-primary border-primary/20 font-black uppercase tracking-[0.25em] text-[10px] bg-primary/10 rounded-full shadow-sm">
                <LayoutGrid className="h-3.5 w-3.5 mr-2" /> Study Operation Terminal
            </Badge>
        </div>
        <div className="space-y-1">
            <h1 className="text-5xl md:text-6xl font-black tracking-tighter leading-none text-slate-900 dark:text-white">
                Activities <span className="text-primary italic">Hub</span>
            </h1>
            <p className="text-muted-foreground text-sm md:text-base font-medium">
                Welcome back, <span className="text-primary font-bold">{user?.name}</span>. Select your primary clinical workflow.
            </p>
        </div>
      </div>

      <div className="space-y-8">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="h-10 w-10 bg-primary text-white rounded-2xl flex items-center justify-center shadow-xl shadow-primary/30">
                    <Zap className="h-5 w-5" />
                </div>
                <div>
                    <h2 className="text-xl font-black tracking-tight uppercase tracking-widest leading-none">Active Entry</h2>
                    <p className="text-[10px] font-black text-muted-foreground mt-1 opacity-60">High-Priority Field Tasks</p>
                </div>
            </div>
            <div className="hidden sm:block h-px flex-1 bg-gradient-to-r from-primary/20 to-transparent ml-8" />
        </div>
        
        {/* 3D Stack Carousel with Peeking Cards */}
        <div className="relative h-[450px] flex items-center justify-center perspective-1000">
            <AnimatePresence mode="popLayout">
                {filteredEssential.map((activity, index) => {
                    const offset = (index - activeIndex + filteredEssential.length) % filteredEssential.length;
                    
                    const isCenter = offset === 0;
                    const isNext = offset === 1;
                    const isPrev = offset === 2;

                    return (
                        <motion.div
                            key={activity.href}
                            initial={{ opacity: 0, scale: 0.8, x: 0 }}
                            animate={{
                                opacity: isCenter ? 1 : 0.6,
                                scale: isCenter ? 1 : 0.8,
                                x: isCenter ? 0 : isNext ? 240 : -220,
                                zIndex: isCenter ? 30 : 10,
                                rotateY: isCenter ? 0 : isNext ? -15 : 15,
                                filter: isCenter ? "blur(0px)" : "blur(2px)",
                            }}
                            transition={{ type: "spring", stiffness: 260, damping: 22 }}
                            className="absolute w-full max-w-[420px] cursor-pointer"
                            onClick={() => !isCenter && setActiveIndex(index)}
                        >
                            <Link href={activity.href} className={cn("group block", !isCenter && "pointer-events-none")}>
                                <div className={cn(
                                    "relative flex flex-col items-center justify-center space-y-6 p-10 transition-all duration-500 rounded-[3.5rem] h-[360px] overflow-hidden shadow-2xl",
                                    "bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 ring-1 ring-black/5",
                                    isCenter ? "hover:ring-primary/40 group-active:scale-95" : "bg-white/40 dark:bg-slate-900/40"
                                )}>
                                    <div className={cn("absolute -top-20 -right-20 w-48 h-48 blur-[100px] opacity-20", activity.bgColor)} />
                                    
                                    <div className={cn(
                                        "relative p-8 rounded-[2rem] transition-all duration-500 shadow-lg",
                                        "bg-muted/40 group-hover:scale-110",
                                        activity.color
                                    )}>
                                        <activity.icon className="h-12 w-12 stroke-[1.5px]" />
                                    </div>
                                    
                                    <div className="text-center space-y-2">
                                        <div className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">{activity.category}</div>
                                        <h3 className="text-3xl font-black tracking-tighter transition-colors group-hover:text-primary leading-tight">
                                            {activity.title}
                                        </h3>
                                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed max-w-[220px] mx-auto">
                                            {activity.description}
                                        </p>
                                    </div>

                                    {isCenter && (
                                        <div className="pt-2 animate-bounce">
                                            <div className="p-3 rounded-full bg-primary text-white shadow-lg shadow-primary/30">
                                                <ChevronRight className="h-5 w-5" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Link>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>

        {/* Stack Indicators */}
        <div className="flex justify-center gap-2">
            {filteredEssential.map((_, i) => (
                <button
                    key={i}
                    onClick={() => setActiveIndex(i)}
                    className={cn(
                        "h-1.5 transition-all duration-500 rounded-full",
                        activeIndex === i ? "w-8 bg-primary" : "w-1.5 bg-slate-300"
                    )}
                />
            ))}
        </div>
      </div>

      {filteredAdvanced.length > 0 && (
        <div className="space-y-8 pt-8" ref={advancedRef}>
            <div className="flex flex-col items-center gap-6">
                <div className="text-center space-y-1">
                    <h2 className="text-2xl font-black tracking-tight uppercase tracking-widest text-slate-400">Research & Governance Suite</h2>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.3em]">Advanced Analytics & Automated Forecasts</p>
                </div>
                <Button 
                    onClick={toggleAdvanced}
                    variant="ghost"
                    className="h-12 px-10 rounded-full font-black uppercase tracking-[0.2em] text-[11px] gap-3 transition-all duration-300 hover:bg-primary/5 border-2 border-dashed border-primary/20"
                >
                    <div className={cn("transition-transform duration-500", showAdvanced && "rotate-180")}>
                        <ChevronDown className="h-5 w-5" />
                    </div>
                    {showAdvanced ? "Hide Management Tools" : "Unlock Management Tools"}
                    <Sparkles className={cn("h-4 w-4 text-amber-400 animate-pulse")} />
                </Button>
            </div>

            <AnimatePresence>
                {showAdvanced && (
                    <motion.div 
                        initial={{ opacity: 0, y: 30, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
                    >
                        {filteredAdvanced.map((activity) => (
                            <Link key={activity.href} href={activity.href} className="group">
                                <div className="p-8 rounded-[2.5rem] transition-all duration-500 space-y-4 relative overflow-hidden h-full bg-white/60 dark:bg-slate-900/40 backdrop-blur-md border border-white/20 shadow-xl group-hover:shadow-2xl group-hover:-translate-y-1">
                                    <div className="flex items-center gap-5">
                                        <div className={cn("p-4 rounded-2xl bg-muted/40 transition-all group-hover:scale-110 group-hover:bg-primary/10 group-hover:text-primary shadow-sm", activity.color)}>
                                            <activity.icon className="h-6 w-6 stroke-[2px]" />
                                        </div>
                                        <div>
                                            <div className="text-[9px] font-black text-primary/40 uppercase tracking-[0.2em] leading-none mb-1.5">{activity.category}</div>
                                            <h3 className="text-xl font-black tracking-tight group-hover:text-primary leading-tight">{activity.title}</h3>
                                        </div>
                                    </div>
                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
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
      
      <div className="pt-20 flex flex-col items-center gap-6 text-primary/20">
        <Heart className="h-8 w-8 fill-current animate-pulse" />
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-center opacity-40">
            PartoMa Project Clinical Integrity Standard v2.0
        </p>
      </div>
    </div>
  );
}
