
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Calendar, Sparkles, ShieldCheck, Activity, Users } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default function RAWeeklyScheduler() {
  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-24 lg:pb-12 pt-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-4 md:px-0">
        <div className="flex items-center gap-4">
          <Button variant="secondary" size="icon" asChild className="rounded-xl h-11 w-11">
            <Link href="/anc/activities"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-[10px] mb-1">
              <ShieldCheck className="h-4 w-4" /> Intelligence Unit
            </div>
            <h1 className="text-4xl font-black tracking-tighter">RA Weekly Scheduler</h1>
            <p className="text-sm font-medium text-muted-foreground">AI-optimized facility assignments for the upcoming week.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 px-4 md:px-0">
        <Card className="border-none ring-1 ring-border shadow-none rounded-[2.5rem] overflow-hidden bg-primary/5">
          <CardContent className="p-12 flex flex-col items-center text-center space-y-6">
            <div className="p-6 bg-white rounded-full shadow-sm">
              <Sparkles className="h-12 w-12 text-primary animate-pulse" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black tracking-tight">Optimization in Progress</h3>
              <p className="text-muted-foreground max-w-sm mx-auto font-medium">
                The AI engine is currently analyzing recruitment velocity and site-specific targets to generate the next weekly schedule.
              </p>
            </div>
            <div className="flex items-center gap-4 pt-4">
                <Badge variant="outline" className="bg-white border-primary/20 font-black text-[10px] uppercase tracking-widest px-4 py-1.5 rounded-full">
                    <Activity className="h-3 w-3 mr-2 text-primary" /> Analyzing Workload
                </Badge>
                <Badge variant="outline" className="bg-white border-primary/20 font-black text-[10px] uppercase tracking-widest px-4 py-1.5 rounded-full">
                    <Users className="h-3 w-3 mr-2 text-primary" /> Balancing Staff
                </Badge>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-none ring-1 ring-border shadow-none rounded-[2rem] bg-card">
                <CardHeader className="p-8">
                    <CardTitle className="text-xl font-black tracking-tight">Last Week's Coverage</CardTitle>
                    <CardDescription className="text-xs font-bold uppercase tracking-widest">Historical Performance</CardDescription>
                </CardHeader>
                <CardContent className="p-8 pt-0">
                    <div className="h-32 flex items-center justify-center border-2 border-dashed rounded-3xl text-muted-foreground font-bold italic text-sm">
                        Schedule archive loading...
                    </div>
                </CardContent>
            </Card>
            <Card className="border-none ring-1 ring-border shadow-none rounded-[2rem] bg-card">
                <CardHeader className="p-8">
                    <CardTitle className="text-xl font-black tracking-tight">Assignment Rules</CardTitle>
                    <CardDescription className="text-xs font-bold uppercase tracking-widest">Optimization Constraints</CardDescription>
                </CardHeader>
                <CardContent className="p-8 pt-0 space-y-4">
                    <div className="flex items-center gap-3 text-sm font-medium">
                        <div className="h-2 w-2 rounded-full bg-emerald-500" />
                        Prioritize facilities under 50% enrollment.
                    </div>
                    <div className="flex items-center gap-3 text-sm font-medium">
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                        Rotate staff every 14 days for data variety.
                    </div>
                    <div className="flex items-center gap-3 text-sm font-medium">
                        <div className="h-2 w-2 rounded-full bg-amber-500" />
                        Match staff language proficiency to site zones.
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
