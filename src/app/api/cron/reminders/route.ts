import { NextResponse } from 'next/server';
export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://studio-alberts-projects-e0254391.vercel.app'}/api/notifications/analyze`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trigger: 'reminder', requestedBy: 'cron' }),
  });
  return NextResponse.json(await res.json());
}
