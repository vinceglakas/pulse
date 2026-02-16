import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const ULTRON_URL = (process.env.ULTRON_URL || 'https://ultron-engine.fly.dev').replace(/\\n/g, '').trim();
const ULTRON_API_SECRET = (process.env.ULTRON_API_SECRET || '').replace(/\\n/g, '').trim();

async function getUser(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return null;
  const supabase = createClient(
    (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\\n/g, '').trim(),
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').replace(/\\n/g, '').trim(),
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

// List cron jobs
export async function GET(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  try {
    const res = await fetch(`${ULTRON_URL}/api/agent/${user.id}/cron`, {
      headers: { Authorization: `Bearer ${ULTRON_API_SECRET}` },
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch cron jobs' }, { status: 502 });
  }
}

// Create cron job
export async function POST(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await req.json();
  try {
    const res = await fetch(`${ULTRON_URL}/api/agent/${user.id}/cron`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ULTRON_API_SECRET}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create cron job' }, { status: 502 });
  }
}

// Delete cron job
export async function DELETE(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { jobId } = await req.json();
  if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 });

  try {
    const res = await fetch(`${ULTRON_URL}/api/agent/${user.id}/cron/${jobId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ULTRON_API_SECRET}` },
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete cron job' }, { status: 502 });
  }
}

// Update cron job (enable/disable)
export async function PATCH(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { jobId, ...patch } = await req.json();
  if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 });

  try {
    const res = await fetch(`${ULTRON_URL}/api/agent/${user.id}/cron/${jobId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ULTRON_API_SECRET}`,
      },
      body: JSON.stringify(patch),
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update cron job' }, { status: 502 });
  }
}
