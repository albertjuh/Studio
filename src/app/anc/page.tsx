"use client";

import Link from 'next/link';
import { FilePlus, Users } from 'lucide-react';

export default function AncHomePage() {
    return (
        <>
             <h1 className="text-3xl font-bold text-blue-900 dark:text-blue-100 mb-2">PartoMa Project Cohort Dashboard</h1>
             <p className="text-muted-foreground mb-8">Welcome. Please choose an option below to continue.</p>
            <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-8">
                <Link href="/anc/register" className="focus:outline-none focus:ring-2 focus:ring-primary rounded-lg">
                    <div className="group flex flex-col items-center justify-center p-8 text-center cursor-pointer transition-all duration-300 ease-in-out hover:bg-blue-100/50 dark:hover:bg-slate-800/50 rounded-lg">
                        <FilePlus className="h-16 w-16 text-primary mb-4 transition-transform group-hover:scale-110" />
                        <h2 className="text-xl font-semibold text-blue-900 dark:text-blue-100">New Registration</h2>
                        <p className="text-sm text-muted-foreground mt-2">Add a new participant to the cohort study.</p>
                    </div>
                </Link>

                <Link href="/anc/admin" className="focus:outline-none focus:ring-2 focus:ring-primary rounded-lg">
                     <div className="group flex flex-col items-center justify-center p-8 text-center cursor-pointer transition-all duration-300 ease-in-out hover:bg-blue-100/50 dark:hover:bg-slate-800/50 rounded-lg">
                        <Users className="h-16 w-16 text-primary mb-4 transition-transform group-hover:scale-110" />
                        <h2 className="text-xl font-semibold text-blue-900 dark:text-blue-100">View Data</h2>
                        <p className="text-sm text-muted-foreground mt-2">Search and view all registered participants.</p>
                    </div>
                </Link>
            </div>
        </>
    );
}
