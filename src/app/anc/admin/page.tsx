"use client";

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAncRegistrationsAction } from '../actions';
import type { AncRegistration } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from '@/components/ui/input';
import { Loader2, AlertCircle, Search, Users, LogOut, FilePlus } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export default function AncAdminPage() {
    const router = useRouter();
    const { toast } = useToast();
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

    const handleLogout = () => {
        localStorage.removeItem('ancUser');
        toast({ title: "Logged Out", description: "You have been successfully logged out." });
        router.push('/anc/login');
    };


    return (
        <div className="min-h-screen bg-blue-50 dark:bg-slate-900 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div className="flex items-center gap-3">
                         <Users className="h-8 w-8 text-blue-800" />
                        <div>
                             <h1 className="text-3xl font-bold text-blue-900 dark:text-blue-100">ANC Registrations</h1>
                             <p className="text-muted-foreground">Search and view participant data.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link href="/anc/register">
                           <Button variant="outline"><FilePlus className="mr-2 h-4 w-4" /> New Registration</Button>
                        </Link>
                        <Button variant="secondary" onClick={handleLogout}><LogOut className="mr-2 h-4 w-4"/> Logout</Button>
                    </div>
                </header>

                <Card className="shadow-lg">
                    <CardHeader>
                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name, ID, phone..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                         <ScrollArea className="h-[75vh]">
                            <Table>
                                 <TableHeader className="sticky top-0 bg-card z-10">
                                    <TableRow>
                                        <TableHead>Participant ID</TableHead>
                                        <TableHead>Full Name</TableHead>
                                        <TableHead>Age</TableHead>
                                        <TableHead>Phone Number</TableHead>
                                        <TableHead>Facility</TableHead>
                                        <TableHead>First ANC Visit</TableHead>
                                        <TableHead>Registered By</TableHead>
                                        <TableHead>Registered On</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading && (
                                        <TableRow>
                                            <TableCell colSpan={8} className="h-24 text-center">
                                                <div className="flex justify-center items-center gap-2">
                                                    <Loader2 className="h-6 w-6 animate-spin" />
                                                    <p>Loading registrations...</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {isError && (
                                        <TableRow>
                                            <TableCell colSpan={8} className="h-24 text-center">
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
                                            <TableCell colSpan={8} className="h-24 text-center">
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
                                            <TableCell>{reg.facility}</TableCell>
                                            <TableCell>{format(new Date(reg.firstAncDate), 'PPP')}</TableCell>
                                            <TableCell className="text-xs font-mono">{reg.registeredById || 'N/A'}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground">{format(new Date(reg.createdAt), 'PP p')}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                         </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
