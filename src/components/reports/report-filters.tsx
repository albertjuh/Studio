
"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from '@/components/ui/input';
import { CalendarIcon, FilterIcon, Search } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import type { ReportFilterState } from '@/types';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';

interface ReportFiltersProps {
  onFilterChange: (filters: ReportFilterState) => void;
  isLoading: boolean;
}

export function ReportFilters({ onFilterChange, isLoading }: ReportFiltersProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [reportType, setReportType] = useState<ReportFilterState['reportType']>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const handleApplyFilters = () => {
    onFilterChange({
      startDate: dateRange?.from,
      endDate: dateRange?.to,
      reportType: reportType,
      searchQuery: searchQuery,
    });
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleApplyFilters();
    }
  };

  return (
    <div className="flex flex-col gap-4 mb-6 p-4 border rounded-lg bg-card shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
                <Label htmlFor="date-range">Date Range</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="date-range"
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal mt-2",
                        !dateRange && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "LLL dd, y")} -{" "}
                            {format(dateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(dateRange.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Pick a date range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
            </div>
             <div>
                <Label htmlFor="search-query">Search</Label>
                <div className="relative mt-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="search-query"
                        placeholder="Search by lot, item, supplier..."
                        className="pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={handleSearchKeyDown}
                    />
                </div>
            </div>

            <div>
                 <Label>Report Type</Label>
                <RadioGroup
                  value={reportType}
                  onValueChange={(value: ReportFilterState['reportType']) => setReportType(value)}
                  className="flex flex-row gap-4 mt-2 h-10 items-center"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="all" id="all" />
                    <Label htmlFor="all">All</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="production" id="production" />
                    <Label htmlFor="production">Production</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="inventory" id="inventory" />
                    <Label htmlFor="inventory">Inventory</Label>
                  </div>
                </RadioGroup>
            </div>
      </div>
      <div className="flex justify-end">
        <Button onClick={handleApplyFilters} className="w-full sm:w-auto" disabled={isLoading}>
          <FilterIcon className="mr-2 h-4 w-4" /> Apply Filters
        </Button>
      </div>
    </div>
  );
}
