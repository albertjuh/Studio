
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
  FileText
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
      role: ["clinician", "admin"]
    },
    {
      title: "Recruitment Tracking",
      description: "Log daily recruitment activity and workload at facilities.",
      icon: ClipboardList,
      href: "/anc/recruitment",
      color: "text-green-600",
      bgColor: "bg-green-100",
      role: ["clinician", "admin"]
    },
    {
      title: "Study Metrics (Analysis)",
      description: "View high-level registration progress and facility performance.",
      icon: BarChart3,
      href: "/anc/admin",
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      role: ["admin"]
    },
    {
      title: "Recruitment Dashboard",
      description: "Comprehensive charts and analytics for recruitment tracking.",
      icon: LineChart,
      href: "/anc/admin/recruitment",
      color: "text-pink-600",
      bgColor: "bg-pink-100",
      role: ["admin"]
    },
    {
      title: "Recruitment Reports",
      description: "Detailed row-level data and exportable recruitment tables.",
      icon: FileText,
      href: "/anc/admin/recruitment/table",
      color: "text-amber-600",
      bgColor: "bg-amber-100",
      role: ["admin"]
    },
    {
      title: "Data Management",
      description: "Search, view, and manage participant records.",
      icon: Database,
      href: "/anc/dashboard",
      color: "text-indigo-600",
      bgColor: "bg-indigo-100",
      role: ["clinician", "admin"]
    }
  ];

  const filteredActivities = activities.filter(act => 
    !user || act.role.includes(user.role)
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Activities Hub</h1>
        <p className="text-muted-foreground">Select a task or analysis module to get started.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredActivities.map((activity) => (
          <Link key={activity.href} href={activity.href} className="group">
            <Card className="h-full transition-all hover:shadow-md hover:border-primary/50">
              <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                <div className={`p-3 rounded-xl ${activity.bgColor} ${activity.color}`}>
                  <activity.icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <CardTitle className="group-hover:text-primary transition-colors text-lg">{activity.title}</CardTitle>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs">{activity.description}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {user?.role === 'admin' && (
        <div className="pt-8">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Admin Controls</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
             <Link href="/anc/admin">
              <Button variant="outline" className="w-full justify-start h-auto py-4">
                <Users className="mr-3 h-5 w-5 text-muted-foreground" />
                <div className="text-left">
                  <div className="font-semibold">User Management</div>
                  <div className="text-xs text-muted-foreground">Manage RA access and roles</div>
                </div>
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
