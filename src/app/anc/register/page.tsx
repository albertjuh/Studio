
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AncRegistrationForm } from "@/app/anc/components/registration-form";

export default function AncRegisterPage() {
    return (
        <div className="max-w-3xl mx-auto">
            <Card className="border-none shadow-xl ring-1 ring-border">
                <CardHeader className="bg-primary/5 rounded-t-xl">
                    <CardTitle className="text-2xl font-black tracking-tighter">Andikisha Mshiriki / Register Participant</CardTitle>
                    <CardDescription className="font-medium text-muted-foreground">
                       Please fill in the details below. Fields with * are required.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-8">
                   <AncRegistrationForm />
                </CardContent>
            </Card>
        </div>
    );
}
