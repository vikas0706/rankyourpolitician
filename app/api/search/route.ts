import { NextRequest, NextResponse } from 'next/server';
import { searchAll } from '@/lib/search';

export const runtime = 'nodejs';
export const revalidate = 300;

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') || '';
  const results = await searchAll(q);
  return NextResponse.json(results, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
  });
}
