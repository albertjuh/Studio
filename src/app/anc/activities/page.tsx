
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
  Activity
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

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
      title: "Participant Registration",
      description: "Enroll new ANC participants into the cohort study.",
      icon: UserPlus,
      href: "/anc/register",
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      role: ["clinician", "admin"],
      category: "Data Entry"
    },
    {
      title: "Recruitment Tracking",
      description: "Log daily recruitment activity and workload at facilities.",
      icon: ClipboardList,
      href: "/anc/recruitment",
      color: "text-green-600",
      bgColor: "bg-green-100",
      role: ["clinician", "admin"],
      category: "Data Entry"
    },
    {
      title: "Recruitment Analysis",
      description: "High-fidelity charts and performance metrics (The image-like Dashboard).",
      icon: LineChart,
      href: "/anc/admin/recruitment",
      color: "text-pink-600",
      bgColor: "bg-pink-100",
      role: ["admin"],
      category: "Analytics",
      featured: true
    },
    {
      title: "Study Progress",
      description: "Registration metrics and facility enrollment analysis.",
      icon: BarChart3,
      href: "/anc/admin",
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      role: ["admin"],
      category: "Analytics"
    },
    {
      title: "Raw Recruitment Data",
      description: "Detailed row-level tables and exportable CSV reports.",
      icon: FileText,
      href: "/anc/admin/recruitment/table",
      color: "text-amber-600",
      bgColor: "bg-amber-100",
      role: ["admin"],
      category: "Reports"
    },
    {
      title: "Data Management",
      description: "Search, view, and manage all participant records.",
      icon: Database,
      href: "/anc/dashboard",
      color: "text-indigo-600",
      bgColor: "bg-indigo-100",
      role: ["clinician", "admin"],
      category: "Management"
    }
  ];

  const filteredActivities = activities.filter(act => 
    !user || act.role.includes(user.role)
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-widest text-xs">
            <Activity className="h-4 w-4" /> Operations Control
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight">Activities Hub</h1>
        <p className="text-muted-foreground text-lg">Select a task or analysis module to manage study operations.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredActivities.map((activity) => (
          <Link key={activity.href} href={activity.href} className="group">
            <Card className={`h-full transition-all hover:shadow-xl hover:border-primary/50 relative overflow-hidden ${activity.featured ? 'ring-2 ring-primary ring-offset-2' : ''}`}>
              {activity.featured && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-tighter">
                    Featured Analysis
                </div>
              )}
              <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                <div className={`p-4 rounded-2xl ${activity.bgColor} ${activity.color} shadow-sm group-hover:scale-110 transition-transform`}>
                  <activity.icon className="h-7 w-7" />
                </div>
                <div className="flex-1">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{activity.category}</div>
                  <CardTitle className="group-hover:text-primary transition-colors text-xl font-bold">{activity.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pb-6">
                <CardDescription className="text-sm leading-relaxed mb-4">{activity.description}</CardDescription>
                <div className="flex items-center text-primary text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                    Open Module <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {user?.role === 'admin' && (
        <div className="pt-12 border-t">
          <div className="flex items-center gap-2 mb-6">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">Administrative Controls</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
             <Link href="/anc/admin">
              <Button variant="outline" className="w-full justify-start h-auto py-6 group">
                <Users className="mr-4 h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                <div className="text-left">
                  <div className="font-bold text-lg">User Access Manager</div>
                  <div className="text-xs text-muted-foreground">Monitor and manage RA access roles</div>
                </div>
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
