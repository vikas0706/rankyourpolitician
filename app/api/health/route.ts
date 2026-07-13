import { NextResponse } from 'next/server';
import { getDataSource } from '@/lib/data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Lightweight liveness endpoint. (Firebase Firestore does not auto-pause like
// some free Postgres tiers, so no keep-alive cron is required — this is just a
// health check.)
export async function GET() {
  const source = await getDataSource();
  return NextResponse.json({ ok: true, source, ts: new Date().toISOString() });
}
