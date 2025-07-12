"use client";

import { useState, type Dispatch, type SetStateAction } from 'react';
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, FilterIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import type { ReportFilterState } from '@/types';

interface ReportFiltersProps {
  onFilterChange: (filters: ReportFilterState) => void;
}

export function ReportFilters({ onFilterChange }: ReportFiltersProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const handleApplyFilters = () => {
    onFilterChange({
      startDate: dateRange?.from,
      endDate: dateRange?.to,
    });
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-center mb-6 p-4 border rounded-lg bg-card shadow">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full sm:w-[300px] justify-start text-left font-normal",
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
      <Button onClick={handleApplyFilters} className="w-full sm:w-auto">
        <FilterIcon className="mr-2 h-4 w-4" /> Apply Filters
      </Button>
    </div>
  );
}
