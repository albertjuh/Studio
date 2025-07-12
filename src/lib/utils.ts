import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { addMonths } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Calculates the expiry date by adding a specified number of months to a production date.
 * @param productionDate The date of production.
 * @param monthsToAdd The number of months to add for expiry (defaults to 24).
 * @returns The calculated expiry date.
 */
export function calculateExpiryDate(productionDate: Date, monthsToAdd: number = 24): Date {
    return addMonths(productionDate, monthsToAdd);
}
