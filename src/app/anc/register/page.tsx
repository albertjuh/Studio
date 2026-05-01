"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AncRegistrationForm } from "@/app/anc/components/registration-form";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import Link from "next/link";

export default function AncRegisterPage() {
    return (
        <div className="max-w-3xl mx-auto">
            <Card className="border-none shadow-xl ring-1 ring-border overflow-hidden">
                <CardHeader className="bg-primary/5 border-b relative">
                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <CardTitle className="text-2xl font-black tracking-tighter text-slate-900">Andikisha Mshiriki / Register Participant</CardTitle>
                            <CardDescription className="font-medium text-muted-foreground">
                                Please fill in the details below. Fields with * are required.
                            </CardDescription>
                        </div>
                        <Button variant="ghost" size="icon" asChild className="rounded-xl h-10 w-10 hover:bg-rose-50 text-muted-foreground hover:text-rose-600 transition-all">
                            <Link href="/anc/activities"><X className="h-5 w-5" /></Link>
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="pt-8">
                   <AncRegistrationForm />
                </CardContent>
            </Card>
        </div>
    );
}
