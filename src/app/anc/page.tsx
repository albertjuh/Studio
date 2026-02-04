"use client";

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, FilePlus, Users } from 'lucide-react';
import { AncHeader } from '@/components/anc/anc-header';

export default function AncHomePage() {
    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto">
                <AncHeader />
                <main className="mt-8">
                     <h1 className="text-3xl font-bold text-blue-900 dark:text-blue-100 mb-2">PartoMa Project Cohort Dashboard</h1>
                     <p className="text-muted-foreground mb-8">Welcome. Please choose an option below to continue.</p>
                    <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-8">
                        <Link href="/anc/register">
                            <div className="flex flex-col items-center justify-center p-8 border rounded-lg shadow-lg hover:shadow-xl hover:border-primary transition-all h-64 text-center cursor-pointer bg-card">
                                <FilePlus className="h-16 w-16 text-primary mb-4" />
                                <h2 className="text-xl font-semibold text-card-foreground">New Registration</h2>
                                <p className="text-sm text-muted-foreground mt-2">Add a new participant to the cohort study.</p>
                            </div>
                        </Link>

                        <Link href="/anc/admin">
                             <div className="flex flex-col items-center justify-center p-8 border rounded-lg shadow-lg hover:shadow-xl hover:border-primary transition-all h-64 text-center cursor-pointer bg-card">
                                <Users className="h-16 w-16 text-primary mb-4" />
                                <h2 className="text-xl font-semibold text-card-foreground">View Data</h2>
                                <p className="text-sm text-muted-foreground mt-2">Search and view all registered participants.</p>
                            </div>
                        </Link>
                    </div>
                </main>
            </div>
        </div>
    );
}
