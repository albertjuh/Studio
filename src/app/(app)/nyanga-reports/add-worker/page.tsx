
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AddNyangaWorkerForm } from "@/components/data-entry/add-nyanga-worker-form";
import { UserPlus } from "lucide-react";

export default function AddNyangaWorkerPage() {
    return (
        <div className="container mx-auto py-6">
             <div className="max-w-2xl mx-auto">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           <UserPlus className="h-6 w-6 text-primary" />
                           Add New Nyanga Worker
                        </CardTitle>
                        <CardDescription>
                            Add a new worker to the Nyanga team. They will then be available to select when creating a production report.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                       <AddNyangaWorkerForm onFormSubmit={() => {}} onFormDirtyChange={() => {}} />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

    