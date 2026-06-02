"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AncRegistrationForm } from "@/app/anc/components/registration-form";
import { Button } from "@/components/ui/button";
import { X, UserPlus } from "lucide-react";
import Link from "next/link";

export default function AncRegisterPage() {
    return (
        <div className="max-w-4xl mx-auto space-y-8 md:space-y-12">
            <div className="flex items-center justify-between px-2">
                <div className="space-y-1">
                    <div className="flex items-center gap-3 text-primary font-black uppercase tracking-[0.3em] text-[10px]">
                        <UserPlus className="h-4 w-4" /> Enrollment Unit
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tighter">New Participant</h1>
                </div>
                <Button variant="ghost" size="icon" asChild className="rounded-xl h-11 w-11 hover:bg-rose-50 text-muted-foreground hover:text-rose-600 transition-all">
                    <Link href="/anc/activities"><X className="h-6 w-6" /></Link>
                </Button>
            </div>

            <Card className="border-none shadow-sm ring-1 ring-border/50 rounded-[2rem] overflow-hidden bg-white dark:bg-card">
                <CardHeader className="bg-primary/[0.03] border-b p-8 md:p-10">
                    <div className="space-y-2">
                        <CardTitle className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Andikisha Mshiriki</CardTitle>
                        <CardDescription className="text-sm font-medium text-muted-foreground uppercase tracking-widest opacity-60">
                            Please fill in all clinical and contact metrics. Fields with * are required.
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="p-8 md:p-10">
                   <AncRegistrationForm />
                </CardContent>
            </Card>
        </div>
    );
}
