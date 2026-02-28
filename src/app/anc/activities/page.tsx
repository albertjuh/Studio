
"use client";

import { 
  UserPlus, 
  ClipboardList, 
  BarChart, 
  Database, 
  ArrowRight,
  ShieldCheck,
  Users,
  LineChart,
  FileText,
  Activity
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";

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
      description: "Fast-track enrollment for new ANC cohort participants.",
      icon: UserPlus,
      href: "/anc/register",
      color: "text-emerald-600",
      role: ["clinician", "admin"],
      category: "Operations"
    },
    {
      title: "Recruitment Log",
      description: "Log daily tracking and facility-level workload activity.",
      icon: ClipboardList,
      href: "/anc/recruitment",
      color: "text-blue-600",
      role: ["clinician", "admin"],
      category: "Operations"
    },
    {
      title: "Recruitment Analysis",
      description: "High-fidelity visualization of recruitment performance.",
      icon: BarChart,
      href: "/anc/admin/recruitment",
      color: "text-indigo-600",
      role: ["admin"],
      category: "Analytics",
      featured: true
    },
    {
      title: "Cohort Analysis",
      description: "Demographic breakdown and study enrollment metrics.",
      icon: LineChart,
      href: "/anc/admin",
      color: "text-violet-600",
      role: ["admin"],
      category: "Analytics"
    },
    {
      title: "Data Management",
      description: "Search, verify, and manage individual participant records.",
      icon: Database,
      href: "/anc/dashboard",
      color: "text-slate-600",
      role: ["clinician", "admin"],
      category: "Review"
    },
    {
      title: "Activity Logs",
      description: "Detailed system audit and recruitment raw tables.",
      icon: FileText,
      href: "/anc/admin/recruitment/table",
      color: "text-amber-600",
      role: ["admin"],
      category: "Audit"
    }
  ];

  const filteredActivities = activities.filter(act => 
    !user || act.role.includes(user.role)
  );

  return (
    <div className="max-w-6xl mx-auto space-y-16 pb-24 md:pb-8 pt-4">
      <div className="flex flex-col gap-3 text-center md:text-left">
        <div className="flex items-center justify-center md:justify-start">
            <Badge variant="outline" className="px-3 py-1 text-primary border-primary/20 font-black uppercase tracking-widest text-[9px]">
                <Activity className="h-3 w-3 mr-1.5" /> Clinical Command Center
            </Badge>
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter">Activities Hub</h1>
        <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
            Welcome back, <span className="text-foreground font-bold">{user?.name}</span>. Select a module to begin your workflow.
        </p>
      </div>

      <div className="grid gap-8 md:gap-12 sm:grid-cols-2 lg:grid-cols-3">
        {filteredActivities.map((activity) => (
          <Link key={activity.href} href={activity.href} className="group outline-none">
            {/* 
                Minimalist Effect: 
                On Mobile: p-5 rounded-2xl border bg-card shadow-sm (Visible Cards)
                On Desktop (md+): md:p-0 md:bg-transparent md:border-none md:shadow-none (Invisible/Minimalist)
            */}
            <div className="p-5 rounded-2xl border bg-card shadow-sm md:p-0 md:bg-transparent md:border-none md:shadow-none space-y-4 transition-all duration-300 group-hover:translate-x-1">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl bg-muted/50 ${activity.color} group-hover:bg-primary/10 group-hover:text-primary transition-all duration-300`}>
                  <activity.icon className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-0.5">{activity.category}</div>
                  <h3 className="text-xl font-extrabold tracking-tight group-hover:text-primary transition-colors">{activity.title}</h3>
                </div>
              </div>
              <p className="text-sm leading-relaxed font-medium text-slate-500 max-w-[280px]">
                {activity.description}
              </p>
              <div className="flex items-center text-primary text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">
                  Open Module <ArrowRight className="ml-2 h-3.5 w-3.5" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {user?.role === 'admin' && (
        <div className="pt-16 border-t border-dashed">
          <div className="flex items-center gap-3 mb-10">
            <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <div>
                <h2 className="text-2xl font-black tracking-tight">System Administration</h2>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Global Governance Controls</p>
            </div>
          </div>
          
          <div className="grid gap-8 md:grid-cols-2">
             <Link href="/anc/admin" className="group">
              <div className="flex items-start gap-5 md:p-0 p-5 rounded-2xl border md:border-none bg-card md:bg-transparent">
                <div className="p-3 bg-muted rounded-xl group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    <Users className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <div className="font-extrabold text-lg tracking-tight group-hover:text-primary transition-colors">Staff Access Manager</div>
                  <div className="text-sm text-muted-foreground font-medium max-w-sm">Verify credentials, manage RA permissions and audit data entry logs.</div>
                  <div className="pt-2 flex items-center text-primary text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">
                    Manage Access <ArrowRight className="ml-2 h-3.5 w-3.5" />
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
