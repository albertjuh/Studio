
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  UserPlus, 
  ClipboardList, 
  BarChart3, 
  Database, 
  ArrowRight,
  ShieldCheck,
  Users,
  LineChart,
  FileText,
  Activity,
  Zap
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
      bgColor: "bg-emerald-50",
      role: ["clinician", "admin"],
      category: "Operations"
    },
    {
      title: "Recruitment Log",
      description: "Log daily tracking and facility-level workload activity.",
      icon: ClipboardList,
      href: "/anc/recruitment",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      role: ["clinician", "admin"],
      category: "Operations"
    },
    {
      title: "Recruitment Analysis",
      description: "High-fidelity visualization of recruitment performance.",
      icon: BarChart3,
      href: "/anc/admin/recruitment",
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
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
      bgColor: "bg-violet-50",
      role: ["admin"],
      category: "Analytics"
    },
    {
      title: "Data Management",
      description: "Search, verify, and manage individual participant records.",
      icon: Database,
      href: "/anc/dashboard",
      color: "text-slate-600",
      bgColor: "bg-slate-100",
      role: ["clinician", "admin"],
      category: "Review"
    },
    {
      title: "Activity Logs",
      description: "Detailed system audit and recruitment raw tables.",
      icon: FileText,
      href: "/anc/admin/recruitment/table",
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      role: ["admin"],
      category: "Audit"
    }
  ];

  const filteredActivities = activities.filter(act => 
    !user || act.role.includes(user.role)
  );

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-24 md:pb-8">
      <div className="flex flex-col gap-4 text-center md:text-left">
        <div className="flex items-center justify-center md:justify-start gap-2">
            <Badge variant="secondary" className="px-3 py-1 bg-primary/10 text-primary border-none font-black uppercase tracking-widest text-[10px]">
                <Activity className="h-3 w-3 mr-1.5" /> Clinical Command Center
            </Badge>
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter">Activities Hub</h1>
        <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
            Welcome back, <span className="text-foreground font-bold">{user?.name}</span>. Select a module below to begin your workflow.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredActivities.map((activity) => (
          <Link key={activity.href} href={activity.href} className="group outline-none">
            <Card className={`h-full border-none shadow-sm ring-1 ring-border transition-all duration-300 hover:shadow-xl hover:ring-primary/40 relative overflow-hidden bg-card/50 backdrop-blur-sm ${activity.featured ? 'ring-2 ring-primary/40' : ''}`}>
              {activity.featured && (
                <div className="absolute top-0 right-0 p-3">
                    <Zap className="h-5 w-5 text-primary animate-pulse" />
                </div>
              )}
              <CardHeader className="flex flex-row items-center gap-5 space-y-0 pt-8">
                <div className={`p-4 rounded-2xl ${activity.bgColor} ${activity.color} shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
                  <activity.icon className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <div className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1.5">{activity.category}</div>
                  <CardTitle className="group-hover:text-primary transition-colors text-xl font-extrabold tracking-tight">{activity.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pb-10 pt-4">
                <CardDescription className="text-sm leading-relaxed mb-6 font-medium text-slate-500">{activity.description}</CardDescription>
                <div className="flex items-center text-primary text-xs font-black uppercase tracking-widest group-hover:translate-x-2 transition-transform">
                    Enter Module <ArrowRight className="ml-2 h-4 w-4" />
                </div>
              </CardContent>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </Card>
          </Link>
        ))}
      </div>

      {user?.role === 'admin' && (
        <div className="pt-16 border-t">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                <ShieldCheck className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
                <h2 className="text-2xl font-black tracking-tight">System Administration</h2>
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Global Governance Controls</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
             <Link href="/anc/admin">
              <Button variant="outline" className="w-full justify-start h-auto py-8 px-6 rounded-2xl group border-2 border-muted hover:border-primary/50 bg-background shadow-sm hover:shadow-md transition-all">
                <div className="p-3 bg-slate-100 rounded-xl mr-5 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    <Users className="h-6 w-6" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-extrabold text-lg tracking-tight">Staff Access Manager</div>
                  <div className="text-xs text-muted-foreground font-medium">Verify credentials and manage RA permissions</div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
