import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { deepResearch } from '@/lib/deep-research';

const ULTRON_SECRET = (process.env.ULTRON_API_SECRET || '').trim();

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  // Validate internal secret
  const secret = req.headers.get('x-ultron-secret');
  if (!secret || secret !== ULTRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { userId, topic, persona } = await req.json();
  if (!userId || !topic) {
    return NextResponse.json({ error: 'userId and topic required' }, { status: 400 });
  }

  // Run research (no quota — internal agent use)
  const result = await deepResearch(topic.trim(), undefined, persona);

  if (result.sources.length === 0) {
    return NextResponse.json({ error: 'No results found', brief: null }, { status: 200 });
  }

  // Save brief
  const { data: saved, error } = await supabaseAdmin
    .from('briefs')
    .insert({
      topic: topic.trim(),
      brief_text: result.brief,
      sources: result.sources,
      raw_data: { stats: result.stats, agent_triggered: true },
      user_id: userId,
    })
    .select('id, topic, brief_text, sources, created_at')
    .single();

  return NextResponse.json({
    id: saved?.id || null,
    topic: topic.trim(),
    brief: result.brief,
    sourceCount: result.sources.length,
    created_at: saved?.created_at || new Date().toISOString(),
  });
}
