
"use client";

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, FilePlus, Users } from 'lucide-react';
import { AncHeader } from '@/components/anc/anc-header';

export default function AncHomePage() {
    return (
        <div className="min-h-screen bg-blue-50 dark:bg-slate-900 p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto">
                <AncHeader />
                <main className="mt-8">
                     <h1 className="text-3xl font-bold text-blue-900 dark:text-blue-100 mb-2">PartoMa Project Cohort Dashboard</h1>
                     <p className="text-muted-foreground mb-8">Welcome. Please choose an option below to continue.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <Link href="/anc/register">
                            <Card className="hover:border-primary transition-colors h-full flex flex-col shadow-lg">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                <FilePlus className="h-6 w-6 text-primary" />
                                New Registration
                                </CardTitle>
                                <CardDescription>
                                Add a new participant to the cohort study.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <p className="text-sm text-muted-foreground">
                                Use the bilingual form to enter all required details for a new participant.
                                </p>
                            </CardContent>
                            <div className="p-6 pt-0 text-primary font-semibold flex items-center">
                                Open Registration Form <ArrowRight className="ml-2 h-4 w-4" />
                            </div>
                            </Card>
                        </Link>

                        <Link href="/anc/admin">
                            <Card className="hover:border-primary transition-colors h-full flex flex-col shadow-lg">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                <Users className="h-6 w-6 text-primary" />
                                View Data
                                </CardTitle>
                                <CardDescription>
                                Search and view all registered participants.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <p className="text-sm text-muted-foreground">
                                Access the secure admin panel to browse, search, and review the collected data.
                                </p>
                            </CardContent>
                            <div className="p-6 pt-0 text-primary font-semibold flex items-center">
                                Open Data Panel <ArrowRight className="ml-2 h-4 w-4" />
                            </div>
                            </Card>
                        </Link>
                    </div>
                </main>
            </div>
        </div>
    );
}
