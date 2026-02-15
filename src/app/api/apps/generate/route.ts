import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { decrypt } from '@/lib/encryption';

export const maxDuration = 60;

const supabase = createClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\n/g, '').trim(),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || '').replace(/\n/g, '').trim(),
);

function errorHTML(msg: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#0a0a0f;color:#f0f0f5;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh}h1{font-size:1.5rem;margin-bottom:8px;color:#ef4444}p{color:#8b8b9e}.c{text-align:center}</style></head><body><div class="c"><h1>⚠️ Build Failed</h1><p>${msg}</p></div></body></html>`;
}

export async function POST(req: NextRequest) {
  const { artifactId, description, name, style, userId } = await req.json();
  
  // Verify this is an internal call (from our own tools)
  const secret = req.headers.get('x-internal-secret');
  if (secret !== process.env.ULTRON_API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Get user's API key
  const { data: keys } = await supabase.from('api_keys').select('provider, encrypted_key').eq('user_id', userId).limit(1);
  if (!keys?.length) {
    await supabase.from('artifacts').update({ 
      content: errorHTML('No API key configured'),
      schema: { isApp: true, status: 'error', columns: [] }
    }).eq('id', artifactId);
    return NextResponse.json({ error: 'No API key' });
  }
  
  const apiKey = decrypt(keys[0].encrypted_key);
  const provider = keys[0].provider;
  
  const prompt = `Generate a complete, production-quality HTML page (single file with embedded CSS and JS) for: ${description}

Name: ${name}
Style: ${style || 'Dark theme (#0a0a0f bg, #111118 cards, #f0f0f5 text, #6366f1 indigo accents), modern, responsive'}

Requirements:
- Complete HTML document with DOCTYPE
- All CSS in <style> tags, all JS in <script> tags
- Responsive, beautiful, modern UI with animations
- Real interactivity and content (never placeholder/lorem ipsum)
- Use CDN libs if needed (Chart.js, Three.js, etc)
- ONLY output HTML. No markdown. No code fences. No explanation.`;

  let html = '';
  
  try {
    if (provider === 'anthropic') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 8192, messages: [{ role: 'user', content: prompt }] }),
      });
      const data = await res.json();
      html = data.content?.[0]?.text || '';
    } else if (provider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model: 'gpt-4.1', messages: [{ role: 'user', content: prompt }], max_tokens: 8192 }),
      });
      const data = await res.json();
      html = data.choices?.[0]?.message?.content || '';
    } else if (provider === 'moonshot') {
      const res = await fetch('https://api.moonshot.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model: 'kimi-k2-0905-preview', messages: [{ role: 'user', content: prompt }], max_tokens: 8192 }),
      });
      const data = await res.json();
      html = data.choices?.[0]?.message?.content || '';
    } else if (provider === 'google') {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      });
      const data = await res.json();
      html = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }
    
    html = html.replace(/^```html?\n?/i, '').replace(/\n?```$/i, '').trim();
    
    if (html && html.includes('<')) {
      await supabase.from('artifacts').update({
        content: html,
        schema: { isApp: true, status: 'ready', framework: 'vanilla', columns: [] },
        updated_at: new Date().toISOString(),
      }).eq('id', artifactId);
      return NextResponse.json({ success: true });
    } else {
      await supabase.from('artifacts').update({
        content: errorHTML('Empty response from LLM'),
        schema: { isApp: true, status: 'error', columns: [] },
      }).eq('id', artifactId);
      return NextResponse.json({ error: 'Empty response' });
    }
  } catch (err: any) {
    await supabase.from('artifacts').update({
      content: errorHTML(err.message),
      schema: { isApp: true, status: 'error', columns: [] },
    }).eq('id', artifactId);
    return NextResponse.json({ error: err.message });
  }
}