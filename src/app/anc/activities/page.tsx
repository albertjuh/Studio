
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
  Sparkles
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function ActivitiesHub() {
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('ancUser');
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
  }, []);

  const activities = [
    {
      title: "New Registration",
      description: "Capture clinical data for new ANC cohort participants.",
      icon: UserPlus,
      href: "/anc/register",
      color: "text-emerald-600",
      role: ["clinician", "admin"],
      category: "Forms"
    },
    {
      title: "Recruitment Tracker",
      description: "Log daily clinic workload, ANC flow, and attrition drivers.",
      icon: ClipboardList,
      href: "/anc/recruitment",
      color: "text-blue-600",
      role: ["clinician", "admin"],
      category: "Forms"
    },
    {
      title: "Clinical Dashboard",
      description: "Monitor actual enrollment counts and cohort demographics.",
      icon: Database,
      href: "/anc/dashboard",
      color: "text-slate-600",
      role: ["clinician", "admin", "viewer"],
      category: "Analytics"
    },
    {
      title: "Survey Forecast",
      description: "Early preparation for 14-day upcoming follow-up windows.",
      icon: Sparkles,
      href: "/anc/admin/timeline/due-today",
      color: "text-blue-600",
      role: ["clinician", "admin", "viewer"],
      category: "Intelligence",
      featured: true
    },
    {
      title: "Recruitment Analysis",
      description: "Analyze daily workload totals and attrition driver trends.",
      icon: BarChart,
      href: "/anc/admin/recruitment",
      color: "text-indigo-600",
      role: ["clinician", "admin", "viewer"],
      category: "Analytics",
      featured: true
    },
    {
      title: "Intelligence Hub",
      description: "AI-driven vulnerability scans and outreach tasks.",
      icon: Activity,
      href: "/anc/notifications",
      color: "text-violet-600",
      role: ["clinician", "admin", "viewer"],
      category: "Intelligence"
    },
    {
      title: "Export Center",
      description: "Download registry datasets and recruitment raw logs.",
      icon: Download,
      href: "/anc/admin/export",
      color: "text-emerald-600",
      role: ["admin", "viewer"],
      category: "Data"
    },
    {
      title: "System Logs",
      description: "Granular workload raw logs for audit and quality check.",
      icon: FileText,
      href: "/anc/admin/recruitment/table",
      color: "text-amber-600",
      role: ["admin", "viewer"],
      category: "Audit"
    }
  ];

  const filteredActivities = activities.filter(act => 
    !user || act.role.includes(user.role)
  );

  return (
    <div className="relative max-w-6xl mx-auto space-y-16 pb-24 md:pb-8 pt-4">
      <div className="flex flex-col gap-3 text-center md:text-left relative z-10">
        <div className="flex items-center justify-center md:justify-start">
            <Badge variant="outline" className="px-3 py-1 text-primary border-primary/20 font-black uppercase tracking-widest text-[9px] bg-primary/5">
                <Activity className="h-3 w-3 mr-1.5" /> Clinical Command Center
            </Badge>
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter">Activities Hub</h1>
        <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
            Welcome back, <span className="text-foreground font-bold">{user?.name}</span>. Select a module to begin your workflow.
        </p>
      </div>

      <div className="grid gap-6 md:gap-12 sm:grid-cols-2 lg:grid-cols-3 relative z-10">
        {filteredActivities.map((activity, index) => {
          return (
            <Link 
              key={activity.href} 
              href={activity.href} 
              className={cn(
                "group outline-none"
              )}
            >
              <div className={cn(
                "p-6 rounded-[2.5rem] transition-all duration-500 space-y-5 relative overflow-hidden h-full",
                "bg-transparent border border-transparent shadow-none",
                "hover:animate-shake hover:scale-[1.03] active:scale-95",
                "hover:bg-white/10 hover:backdrop-blur-[1.5px] hover:border-white/20 hover:shadow-2xl"
              )}>
                <div className="flex items-center gap-4 relative z-10">
                  <div className={cn(
                      "p-4 rounded-2xl transition-all duration-500 group-hover:rotate-6 bg-transparent",
                      activity.color
                  )}>
                    <activity.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-0.5">{activity.category}</div>
                    <h3 className="text-xl font-extrabold tracking-tight transition-colors group-hover:text-primary">{activity.title}</h3>
                  </div>
                </div>
                
                <p className="text-sm leading-relaxed font-medium text-slate-500 max-w-[280px] relative z-10">
                  {activity.description}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      {(user?.role === 'admin' || user?.role === 'viewer') && (
        <div className="pt-16 border-t border-dashed relative z-10 border-slate-200/50">
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
                "flex items-start gap-5 p-6 rounded-[2.5rem] transition-all duration-500",
                "bg-transparent border border-transparent shadow-none",
                "hover:animate-shake hover:scale-[1.03] active:scale-95",
                "hover:bg-white/10 hover:backdrop-blur-[1.5px] hover:border-white/20 hover:shadow-2xl"
              )}>
                <div className="p-4 bg-transparent rounded-2xl transition-colors group-hover:rotate-6">
                    <Users className="h-6 w-6 text-slate-600" />
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
