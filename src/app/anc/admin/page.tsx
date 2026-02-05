"use client";

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAncRegistrationsAction } from '../actions';
import type { AncRegistration } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from '@/components/ui/input';
import { Loader2, AlertCircle, Search, Users } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AncHeader } from '@/components/anc/anc-header';

export default function AncAdminPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const { data: registrations, isLoading, isError, error } = useQuery<AncRegistration[]>({
        queryKey: ['ancRegistrations'],
        queryFn: getAncRegistrationsAction,
    });

    const filteredRegistrations = useMemo(() => {
        if (!registrations) return [];
        if (!searchTerm) return registrations;

        const lowercasedFilter = searchTerm.toLowerCase();
        return registrations.filter(item => {
            return Object.values(item).some(value =>
                String(value).toLowerCase().includes(lowercasedFilter)
            );
        });
    }, [registrations, searchTerm]);


    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <AncHeader />
                <main>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                        <div className="flex items-center gap-3">
                            <Users className="h-8 w-8 text-blue-800" />
                            <div>
                                <h1 className="text-3xl font-bold text-blue-900 dark:text-blue-100">View Registrations</h1>
                                <p className="text-muted-foreground">Search and view participant data.</p>
                            </div>
                        </div>
                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name, ID, phone..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>

                    <Card className="shadow-lg">
                        <CardContent className="p-0">
                             <ScrollArea className="h-[60vh]">
                                <Table>
                                     <TableHeader className="sticky top-0 bg-card z-10">
                                        <TableRow>
                                            <TableHead>Participant ID</TableHead>
                                            <TableHead>Full Name</TableHead>
                                            <TableHead>Age</TableHead>
                                            <TableHead>Phone Number</TableHead>
                                            <TableHead>Marital Status</TableHead>
                                            <TableHead>Location</TableHead>
                                            <TableHead>Facility</TableHead>
                                            <TableHead>First ANC Visit</TableHead>
                                            <TableHead>Prev. Pregnancies</TableHead>
                                            <TableHead>Planned</TableHead>
                                            <TableHead>Registered By</TableHead>
                                            <TableHead>Registered On</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoading && (
                                            <TableRow>
                                                <TableCell colSpan={12} className="h-24 text-center">
                                                    <div className="flex justify-center items-center gap-2">
                                                        <Loader2 className="h-6 w-6 animate-spin" />
                                                        <p>Loading registrations...</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                        {isError && (
                                            <TableRow>
                                                <TableCell colSpan={12} className="h-24 text-center">
                                                    <Alert variant="destructive" className="max-w-md mx-auto">
                                                        <AlertCircle className="h-4 w-4" />
                                                        <AlertTitle>Error Loading Data</AlertTitle>
                                                        <AlertDescription>{(error as Error)?.message}</AlertDescription>
                                                    </Alert>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                        {!isLoading && !isError && filteredRegistrations.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={12} className="h-24 text-center">
                                                    {searchTerm ? `No results found for "${searchTerm}".` : "No registrations found."}
                                                </TableCell>
                                            </TableRow>
                                        )}
                                        {!isLoading && !isError && filteredRegistrations.map((reg) => (
                                            <TableRow key={reg.id}>
                                                <TableCell className="font-mono text-xs">{reg.participantId}</TableCell>
                                                <TableCell className="font-medium">{reg.fullName}</TableCell>
                                                <TableCell>{reg.age}</TableCell>
                                                <TableCell>{reg.phoneNumber}</TableCell>
                                                <TableCell>{reg.maritalStatus}</TableCell>
                                                <TableCell className="text-xs">{`${reg.ward}, ${reg.street}`}</TableCell>
                                                <TableCell>{reg.facility}</TableCell>
                                                <TableCell>{format(new Date(reg.firstAncDate), 'PPP')}</TableCell>
                                                <TableCell>{reg.previousPregnancies || 'N/A'}</TableCell>
                                                <TableCell>{reg.isPlanned}</TableCell>
                                                <TableCell className="text-xs font-mono">{reg.registeredById || 'N/A'}</TableCell>
                                                <TableCell className="text-xs text-muted-foreground">{format(new Date(reg.createdAt), 'PP p')}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                             </ScrollArea>
                        </CardContent>
                    </Card>
                </main>
            </div>
        </div>
    );
}
