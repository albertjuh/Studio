import { NextResponse } from 'next/server';

/**
 * DEPRECATED: Staff Planner daily update job has been disabled.
 */
export async function GET() {
  return NextResponse.json({ message: "Feature decommissioned" }, { status: 410 });
}
