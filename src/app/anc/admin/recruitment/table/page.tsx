
"use client";

import { useMemo, useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Download, ArrowLeft, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { type RecruitmentEntry } from '@/types';
import Link from 'next/link';

export default function RecruitmentDataTable() {
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');

  const recruitmentQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'recruitment_entries'), orderBy('date', 'desc'));
  }, [firestore]);

  const { data: entries, isLoading } = useCollection<RecruitmentEntry>(recruitmentQuery);

  const filteredEntries = useMemo(() => {
    if (!entries) return [];
    const lower = searchTerm.toLowerCase();
    return entries.filter(e => 
      e.ra_name.toLowerCase().includes(lower) || 
      e.facility.toLowerCase().includes(lower) || 
      e.reason.toLowerCase().includes(lower)
    );
  }, [entries, searchTerm]);

  const exportCSV = () => {
    if (!filteredEntries.length) return;
    const headers = ["Date", "Facility", "RA", "Providers", "Total ANC", "Eligible", "Interviewed", "Missed", "# Women", "Reason", "Notes", "First Row Flag"];
    const rows = filteredEntries.map(e => [
        e.date?.toDate ? format(e.date.toDate(), 'yyyy-MM-dd') : e.date,
        e.facility,
        e.ra_name,
        e.providers,
        e.total_anc,
        e.eligible,
        e.interviewed,
        e.missed,
        e.num_women,
        e.reason,
        `"${e.notes?.replace(/"/g, '""') || ''}"`,
        e.first_row_flag
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recruitment_table_export_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
            <Link href="/anc/admin/recruitment"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Raw Recruitment Data</h1>
          <p className="text-muted-foreground">Detailed row-level entries for study tracking.</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by RA, facility, or reason..." 
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={exportCSV} disabled={!filteredEntries.length}>
            <Download className="mr-2 h-4 w-4" /> Export Filtered
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Date</TableHead>
                  <TableHead>Facility</TableHead>
                  <TableHead>RA</TableHead>
                  <TableHead className="text-right">Eligible</TableHead>
                  <TableHead className="text-right">Recruited</TableHead>
                  <TableHead className="text-right"># Women</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Flag</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">Loading data...</TableCell>
                  </TableRow>
                ) : filteredEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">No matching entries found.</TableCell>
                  </TableRow>
                ) : (
                  filteredEntries.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {e.date?.toDate ? format(e.date.toDate(), 'dd/MM/yy') : e.date}
                      </TableCell>
                      <TableCell className="max-w-[120px] truncate text-xs font-medium">{e.facility}</TableCell>
                      <TableCell className="text-xs">{e.ra_name}</TableCell>
                      <TableCell className="text-right text-xs">{e.eligible}</TableCell>
                      <TableCell className="text-right text-xs font-bold text-green-600">{e.interviewed}</TableCell>
                      <TableCell className="text-right text-xs">{e.num_women}</TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="outline" className="font-normal text-[10px]">{e.reason}</Badge>
                      </TableCell>
                      <TableCell>
                        {e.first_row_flag === 1 && <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none text-[8px]">1st</Badge>}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
