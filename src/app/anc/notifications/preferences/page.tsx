
"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Bell, 
  Settings, 
  ShieldCheck, 
  ArrowLeft,
  Smartphone,
  Mail,
  Moon,
  Volume2
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

export default function NotificationPreferences() {
  const { toast } = useToast();
  const [prefs, setPrefs] = useState({
    push: true,
    email: false,
    critical: true,
    high: true,
    digest: true,
    quiet: true,
  });

  const savePreferences = () => {
    toast({ title: "Preferences Synced", description: "Your study alert configuration has been updated.", variant: "success" });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-24 lg:pb-12 pt-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="rounded-xl h-11 w-11">
            <Link href="/anc/notifications"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div>
          <h1 className="text-4xl font-black tracking-tighter">Preferences</h1>
          <p className="text-sm font-medium text-muted-foreground">Configure your intelligence delivery settings.</p>
        </div>
      </div>

      <div className="grid gap-6">
        <Card className="border-none ring-1 ring-border shadow-none rounded-[2.5rem] overflow-hidden">
          <CardHeader className="bg-primary/5 p-8 border-b">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                    <Smartphone className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-2xl font-black tracking-tight">Delivery Channels</CardTitle>
            </div>
            <CardDescription className="font-medium">Choose how you want to receive study alerts.</CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="flex items-center justify-between group">
              <div className="space-y-1">
                <Label className="text-base font-black tracking-tight cursor-pointer" htmlFor="push">Browser Push Notifications</Label>
                <p className="text-xs font-medium text-muted-foreground">Real-time alerts directly to your device desktop or home screen.</p>
              </div>
              <Switch id="push" checked={prefs.push} onCheckedChange={(v) => setPrefs({...prefs, push: v})} />
            </div>
            <Separator />
            <div className="flex items-center justify-between group">
              <div className="space-y-1">
                <Label className="text-base font-black tracking-tight cursor-pointer" htmlFor="email">Email Reports</Label>
                <p className="text-xs font-medium text-muted-foreground">Comprehensive daily and weekly summaries sent to your inbox.</p>
              </div>
              <Switch id="email" checked={prefs.email} onCheckedChange={(v) => setPrefs({...prefs, email: v})} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none ring-1 ring-border shadow-none rounded-[2.5rem] overflow-hidden">
          <CardHeader className="bg-amber-500/5 p-8 border-b">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                    <ShieldCheck className="h-5 w-5 text-amber-600" />
                </div>
                <CardTitle className="text-2xl font-black tracking-tight">Alert Criticality</CardTitle>
            </div>
            <CardDescription className="font-medium">Filter intelligence based on urgency levels.</CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="flex items-center justify-between opacity-60">
              <div className="space-y-1">
                <Label className="text-base font-black tracking-tight">Critical Alerts</Label>
                <p className="text-xs font-medium text-muted-foreground">Immediate vulnerabilities (Overdue pregnancies, data breaches).</p>
              </div>
              <Badge variant="outline" className="font-black text-[10px] uppercase tracking-widest border-2">Always On</Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base font-black tracking-tight cursor-pointer" htmlFor="high">High Priority</Label>
                <p className="text-xs font-medium text-muted-foreground">Important events (Window openings, survey deadlines).</p>
              </div>
              <Switch id="high" checked={prefs.high} onCheckedChange={(v) => setPrefs({...prefs, high: v})} />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base font-black tracking-tight cursor-pointer" htmlFor="digest">Daily AI Digest</Label>
                <p className="text-xs font-medium text-muted-foreground">Every morning at 7:00 AM EAT.</p>
              </div>
              <Switch id="digest" checked={prefs.digest} onCheckedChange={(v) => setPrefs({...prefs, digest: v})} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none ring-1 ring-border shadow-none rounded-[2.5rem] overflow-hidden">
          <CardHeader className="bg-slate-500/5 p-8 border-b">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                    <Moon className="h-5 w-5 text-slate-600" />
                </div>
                <CardTitle className="text-2xl font-black tracking-tight">Focus & Quiet Hours</CardTitle>
            </div>
            <CardDescription className="font-medium">Maintain balance by scheduling non-critical silences.</CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
             <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base font-black tracking-tight cursor-pointer" htmlFor="quiet">Do Not Disturb (DND)</Label>
                <p className="text-xs font-medium text-muted-foreground">Silence all non-critical alerts between 10 PM and 6 AM.</p>
              </div>
              <Switch id="quiet" checked={prefs.quiet} onCheckedChange={(v) => setPrefs({...prefs, quiet: v})} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end pt-4">
            <Button onClick={savePreferences} className="h-14 px-12 rounded-2xl font-black uppercase tracking-widest bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20">
                Update Settings
            </Button>
        </div>
      </div>
    </div>
  );
}
