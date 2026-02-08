"use client";

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { OwnerSupervisorDashboard } from '@/app/boda/components/owner-supervisor-dashboard';
import { RiderDashboard } from '@/app/boda/components/rider-dashboard';

export default function BodaDashboardPage() {
    const [role, setRole] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const userStr = localStorage.getItem('bodaUser');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                setRole(user.role);
            } catch (e) {
                console.error("Failed to parse user data from localStorage", e);
            }
        }
        setIsLoading(false);
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (role === 'rider') {
        return <RiderDashboard />;
    }
    
    // Default to owner/supervisor view
    return <OwnerSupervisorDashboard />;
}
