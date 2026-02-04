
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { LogOut, User, Home } from 'lucide-react';
import { ThemeToggleButton } from '@/components/layout/theme-toggle-button';
import Link from 'next/link';

export function AncHeader() {
    const router = useRouter();
    const { toast } = useToast();
    const [currentUser, setCurrentUser] = useState<{ id: string, name: string } | null>(null);

    useEffect(() => {
        const userStr = localStorage.getItem('ancUser');
        if (userStr) {
            setCurrentUser(JSON.parse(userStr));
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('ancUser');
        toast({ title: "Logged Out", description: "You have been successfully logged out." });
        router.push('/anc/login');
    };

    return (
        <header className="flex justify-between items-center mb-6 pb-4 border-b border-blue-200 dark:border-slate-700">
            <h1 className="text-xl font-bold text-blue-900 dark:text-blue-100">PartoMa Project Cohort</h1>
            <div className="flex items-center gap-2 sm:gap-4">
                {currentUser && (
                    <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span>{currentUser.name}</span>
                    </div>
                )}
                 <Link href="/anc" passHref>
                    <Button variant="ghost" size="icon" aria-label="Home">
                        <Home className="h-5 w-5" />
                    </Button>
                </Link>
                <ThemeToggleButton />
                <Button variant="outline" size="sm" onClick={handleLogout}>
                    <LogOut className="mr-0 sm:mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Logout</span>
                </Button>
            </div>
        </header>
    );
}
