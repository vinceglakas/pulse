import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const userSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error } = await userSupabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  try {
    // Fetch saved briefs with brief details
    const { data: savedBriefs } = await supabaseAdmin
      .from('saved_briefs')
      .select('id, brief_id, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    // Try to enrich with brief topics
    let enrichedBriefs = savedBriefs || [];
    if (enrichedBriefs.length > 0) {
      const briefIds = enrichedBriefs.map(b => b.brief_id);
      const { data: briefs } = await supabaseAdmin
        .from('briefs')
        .select('id, topic, created_at, summary')
        .in('id', briefIds);

      if (briefs) {
        const briefMap = new Map(briefs.map(b => [b.id, b]));
        enrichedBriefs = enrichedBriefs.map(sb => ({
          ...sb,
          brief: briefMap.get(sb.brief_id) || null,
        }));
      }
    }

    return NextResponse.json({ briefs: enrichedBriefs });
  } catch (err: any) {
    // Tables might not exist
    if (err?.code === '42P01') {
      return NextResponse.json({ briefs: [] });
    }
    console.error('Workspace items error:', err);
    return NextResponse.json({ error: 'Failed to fetch workspace items' }, { status: 500 });
  }
}
