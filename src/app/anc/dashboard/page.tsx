
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from '@tanstack/react-query';
import { getAncRegistrationsAction } from '@/lib/anc-actions';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2, Users, UserPlus, Search } from 'lucide-react';
import Link from "next/link";
import { format, subDays } from 'date-fns';
import type { AncRegistration } from "@/types";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

function AncDashboardClient() {
    const { data: registrations, isLoading, isError, error } = useQuery<AncRegistration[]>({
        queryKey: ['ancRegistrations'],
        queryFn: () => getAncRegistrationsAction(),
        refetchInterval: 60000,
    });
    
    const [searchTerm, setSearchTerm] = useState('');

    const filteredRegistrations = useMemo(() => {
        if (!registrations) return [];
        if (!searchTerm) return registrations;

        const lowercasedFilter = searchTerm.toLowerCase();

        return registrations.filter(reg =>
            reg.name.toLowerCase().includes(lowercasedFilter) ||
            reg.participantId.toLowerCase().includes(lowercasedFilter) ||
            reg.phoneNumber?.toLowerCase().includes(lowercasedFilter)
        );
    }, [registrations, searchTerm]);

    const registrationsThisWeek = registrations?.filter(r => new Date(r.createdAt) > subDays(new Date(), 7)).length || 0;
    
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    if (isError) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error Loading Data</AlertTitle>
                <AlertDescription>
                    Could not load registration data. Error: {(error as Error).message}
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Participants</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{registrations?.length || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Registrations (Last 7 Days)</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">+{registrationsThisWeek}</div>
                    </CardContent>
                </Card>
            </div>
            
            <Card>
                 <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <CardTitle>Participants Data View</CardTitle>
                            <CardDescription>Search and view all registered study participants.</CardDescription>
                        </div>
                         <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name, ID, or phone..."
                                className="pl-10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[400px]">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Participant ID</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Health Facility</TableHead>
                                    <TableHead>Phone Number</TableHead>
                                    <TableHead>Registered On</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredRegistrations && filteredRegistrations.length > 0 ? (
                                    filteredRegistrations.map((reg) => (
                                        <TableRow key={reg.id}>
                                            <TableCell className="font-mono">{reg.participantId}</TableCell>
                                            <TableCell className="font-medium">{reg.name}</TableCell>
                                            <TableCell>{reg.healthFacility}</TableCell>
                                            <TableCell>{reg.phoneNumber}</TableCell>
                                            <TableCell>{format(new Date(reg.createdAt), 'PP p')}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            {searchTerm ? "No participants match your search." : "No participants registered yet."}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}

export default function AncDashboardPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Dashboard</h1>
                    <p className="text-muted-foreground">Overview of the ANC cohort study progress.</p>
                </div>
                <Button asChild>
                    <Link href="/anc/register">
                        <UserPlus className="mr-2 h-4 w-4" />
                        Register Participant
                    </Link>
                </Button>
            </div>
            <AncDashboardClient />
        </div>
    );
}
