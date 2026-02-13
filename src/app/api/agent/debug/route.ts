import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { decrypt } from '@/lib/encryption';
import { ANTHROPIC_TOOLS, executeTool, ToolContext } from '@/lib/agent-tools';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const steps: string[] = [];
  try {
    const secret = req.headers.get('x-ultron-secret')?.trim();
    if (secret !== process.env.ULTRON_API_SECRET?.trim()) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, test } = await req.json();
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    );

    // Step 1: Load profile
    steps.push('Loading profile...');
    const { data: profile, error: profileErr } = await supabase
      .from('profiles').select('*').eq('id', userId).single();
    if (profileErr) throw new Error(`Profile: ${profileErr.message}`);
    steps.push(`Profile loaded: ${profile.full_name}, plan: ${profile.plan}`);

    // Step 2: Load API key
    steps.push('Loading API key...');
    const { data: keys } = await supabase
      .from('api_keys' as any).select('*').eq('user_id', userId);
    if (!keys?.length) throw new Error('No API keys');
    steps.push(`Found ${keys.length} key(s), provider: ${(keys[0] as any).provider}`);

    // Step 3: Decrypt key
    steps.push('Decrypting key...');
    const apiKey = decrypt((keys[0] as any).encrypted_key);
    steps.push(`Key decrypted: ${apiKey.slice(0, 8)}...${apiKey.slice(-4)}`);

    // Step 4: Test Anthropic API (simple, no tools)
    if (test === 'anthropic' || test === 'all') {
      steps.push('Testing Anthropic API (no tools)...');
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 50,
          messages: [{ role: 'user', content: 'Say "hello" and nothing else.' }],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(`Anthropic ${res.status}: ${JSON.stringify(data).slice(0, 300)}`);
      steps.push(`Anthropic OK: ${JSON.stringify(data.content?.[0]?.text || data).slice(0, 100)}`);
    }

    // Step 5: Test Anthropic with tools
    if (test === 'tools' || test === 'all') {
      steps.push('Testing Anthropic API WITH tools...');
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 200,
          messages: [{ role: 'user', content: 'Just say hello, don\'t use any tools.' }],
          tools: ANTHROPIC_TOOLS,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(`Anthropic+tools ${res.status}: ${JSON.stringify(data).slice(0, 300)}`);
      steps.push(`Anthropic+tools OK: ${JSON.stringify(data.content?.[0]?.text || data).slice(0, 100)}`);
    }

    // Step 6: Test web_search tool
    if (test === 'websearch' || test === 'all') {
      steps.push('Testing web_search tool...');
      const ctx: ToolContext = { userId };
      const result = await executeTool('web_search', { query: 'test' }, ctx);
      steps.push(`web_search OK: ${result.slice(0, 200)}`);
    }

    // Step 7: Test memory tables
    if (test === 'memory' || test === 'all') {
      steps.push('Testing user_memory table...');
      const { data: mem, error: memErr } = await (supabase.from('user_memory' as any)
        .select('id, content').eq('user_id', userId).limit(1) as any);
      if (memErr) throw new Error(`user_memory: ${memErr.message}`);
      steps.push(`user_memory OK: ${mem?.length || 0} rows`);
    }

    return Response.json({ ok: true, steps });
  } catch (err: any) {
    steps.push(`FAILED: ${err.message}`);
    return Response.json({ ok: false, steps, error: err.message }, { status: 500 });
  }
}
