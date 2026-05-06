'use server';

/**
 * DEPRECATED: Staff Planner AI Engine has been disabled.
 */

export async function generateRaSchedule(input: any): Promise<any> {
  throw new Error("Feature decommissioned.");
}

export type RaScheduleOutput = {
  assignments: any[];
  summary: string;
};
