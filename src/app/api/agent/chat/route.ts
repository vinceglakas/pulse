import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { decrypt } from '@/lib/encryption';
import { TOOL_SCHEMAS, ANTHROPIC_TOOLS, executeTool, type ToolContext } from '@/lib/agent-tools';

export const maxDuration = 120;

const ULTRON_URL = (process.env.ULTRON_URL || 'https://ultron-engine.fly.dev').replace(/\\n/g, '').trim();
const ULTRON_API_SECRET = (process.env.ULTRON_API_SECRET || '').replace(/\\n/g, '').trim();

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\\n/g, '').trim(),
      (process.env.SUPABASE_SERVICE_ROLE_KEY || '').replace(/\\n/g, '').trim(),
    );
  }
  return _supabase;
}

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  'X-Accel-Buffering': 'no',
};

const encoder = new TextEncoder();
function sse(data: any): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
}

// Provider-specific LLM call configs
const PROVIDER_CONFIGS: Record<string, { baseUrl: string; buildRequest: (key: string, messages: any[], tools: any[]) => { url: string; headers: Record<string, string>; body: string }; parseStream: (line: string) => { text?: string; toolCall?: any; done?: boolean } | null }> = {
  anthropic: {
    baseUrl: 'https://api.anthropic.com',
    buildRequest: (key, messages, tools) => ({
      url: 'https://api.anthropic.com/v1/messages',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8192,
        stream: true,
        system: buildSystemPrompt(),
        messages,
        tools,
      }),
    }),
    parseStream: (line) => {
      if (!line.startsWith('data: ')) return null;
      const data = line.slice(6).trim();
      if (!data || data === '[DONE]') return { done: true };
      try {
        const e = JSON.parse(data);
        if (e.type === 'content_block_delta') {
          if (e.delta?.type === 'text_delta') return { text: e.delta.text };
          if (e.delta?.type === 'input_json_delta') return { text: e.delta.partial_json };
        }
        if (e.type === 'message_stop') return { done: true };
        if (e.type === 'content_block_start' && e.content_block?.type === 'tool_use') {
          return { toolCall: { id: e.content_block.id, name: e.content_block.name, args: '' } };
        }
      } catch {}
      return null;
    },
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    buildRequest: (key, messages, tools) => ({
      url: 'https://api.openai.com/v1/chat/completions',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1',
        stream: true,
        messages: [{ role: 'system', content: buildSystemPrompt() }, ...messages],
        tools: tools.map(t => ({ type: 'function', function: t })),
      }),
    }),
    parseStream: (line) => {
      if (!line.startsWith('data: ')) return null;
      const data = line.slice(6).trim();
      if (data === '[DONE]') return { done: true };
      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta;
        if (delta?.content) return { text: delta.content };
        if (delta?.tool_calls?.[0]) {
          const tc = delta.tool_calls[0];
          if (tc.function?.name) return { toolCall: { id: tc.id || tc.index?.toString(), name: tc.function.name, args: tc.function.arguments || '' } };
          if (tc.function?.arguments) return { text: tc.function.arguments }; // accumulate args
        }
        if (parsed.choices?.[0]?.finish_reason === 'stop') return { done: true };
      } catch {}
      return null;
    },
  },
  google: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    buildRequest: (key, messages, _tools) => ({
      url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${key}`,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: buildSystemPrompt() }] },
        contents: messages.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
      }),
    }),
    parseStream: (line) => {
      if (!line.startsWith('data: ')) return null;
      try {
        const parsed = JSON.parse(line.slice(6));
        const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return { text };
      } catch {}
      return null;
    },
  },
  moonshot: {
    baseUrl: 'https://api.moonshot.ai/v1',
    buildRequest: (key, messages, tools) => ({
      url: 'https://api.moonshot.ai/v1/chat/completions',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'kimi-k2-0905-preview',
        stream: true,
        messages: [{ role: 'system', content: buildSystemPrompt() }, ...messages],
        tools: tools.map(t => ({ type: 'function', function: t })),
      }),
    }),
    parseStream: (line) => PROVIDER_CONFIGS.openai.parseStream(line), // OpenAI-compatible
  },
};

function buildSystemPrompt(): string {
  return `You are JARVIS — the user's personal AI operating system. Not a chatbot. Not an assistant. You are an autonomous agent who gets things done.

Think of yourself as a brilliant chief of staff who happens to have superpowers. You research, build, manage relationships, track the world, create content, write code, and remember everything.

## Your Capabilities (use them aggressively)

**Research & Intelligence**
- pulsed_research: Deep multi-source research across Reddit, Hacker News, X/Twitter, YouTube, and the entire web. Use this for any research request — always go deep, never give surface-level answers.
- web_search: Quick lookups for facts, prices, current events, specific questions.

**Building & Creating**
- create_artifact: Build structured items — tables, kanban boards, trackers, documents, datasets. When someone says "build me X" or "create X", use this immediately.
- update_artifact / list_artifacts: Manage and iterate on workspace items.
- generate_content: Draft blog posts, social media content, emails, newsletters in any tone.

**CRM & Relationships**
- crm_manage_contacts: Add, update, search contacts. Track who the user knows.
- crm_manage_deals: Manage sales pipeline — create deals, move stages, track value.
- crm_log_activity: Log calls, emails, meetings, notes against contacts/deals.

**Monitoring & Alerts**
- set_monitor: Watch any topic on the web. Get alerted when something changes or matters.
- send_notification: Push alerts about things the user should know.

**Memory & Learning**
- memory_save: Remember EVERYTHING important — preferences, goals, contacts, decisions, wins, losses. You get smarter with every conversation.
- memory_recall: Search your memory before answering. If you've talked about it before, recall it.

**Automation**
- schedule_task: Set up recurring tasks, daily briefings, automated research runs.

## How You Operate
1. **ACT FIRST.** Never ask "would you like me to..." — just do it. Research? Do it. Build? Build it. Save to CRM? Save it.
2. **Use multiple tools per turn.** Research + build + save to memory in one response. Chain them.
3. **Remember everything.** After learning something about the user, save it to memory immediately.
4. **Be proactive.** Notice patterns. Suggest next steps. Connect dots the user hasn't connected.
5. **Be direct and warm.** You're a trusted partner. Concise, clear, no filler. Show results, not process.
6. **Never fabricate.** If you need data, research it. Every fact must be real.
7. **Think in workflows.** "Track competitors" = set monitor + research + create tracker + schedule updates.
8. **Format beautifully.** Use markdown. Bold key points. Use tables for structured data. Make it scannable.

## Building Things (CRITICAL)
When the user says "build me X" or "create X" or "make X" — you MUST create something REAL and POPULATED:

1. **Research first** if the topic requires data. Use pulsed_research or web_search to get real information.
2. **Create with REAL DATA.** Never create empty artifacts. A "competitor tracker" should have actual competitors with real names, URLs, funding, descriptions. A "content calendar" should have actual post ideas with dates. A "CRM" should have example entries that make sense.
3. **Use rich columns.** Tables should have appropriate column types — urls for websites, currency for prices, badges for status, dates for timelines.
4. **Multiple tools per turn.** Research → create_artifact → memory_save. Chain them. Don't stop at one.
5. **Documents should be comprehensive.** When creating a document artifact, write full content — not a skeleton. 500+ words minimum for docs.
6. **After building, tell the user what you built AND what they can do next.** "I built your competitor tracker with 8 companies. Want me to set up a monitor to track when any of them makes news?"

### Build Patterns:
- "Build me a tracker" → research the topic → create table artifact with real rows
- "Make me a plan" → create document artifact with detailed content + create list artifact with action items
- "Set up my CRM" → create table artifact with smart columns (name, email, company, deal stage, value, last contact, notes) + pre-populate with any contacts from memory
- "Create a dashboard" → create multiple artifacts (table + kanban + document) that work together
- "Build an app/tool/calculator" → use build_app with complete HTML/CSS/JS. Always beautiful, always functional.
- "Build me a website" → build_app with a full landing page — hero, features, CTA, footer, responsive
- "Automate X" → run_automation with fetch + transform steps, then create_artifact with results
- "Connect to [API]" → run_automation to fetch from the API, process results, save to workspace
- "Scrape/get data from [site]" → run_automation with fetch step
- "Build me a dashboard for X" → research X first → build_app with Chart.js/D3 visualization using real data

### App Building Rules (build_app):
- ALWAYS write complete, production-quality HTML with embedded CSS and JS
- Use dark theme by default: #0a0a0f bg, #111118 cards, #f0f0f5 text, indigo (#6366f1) accents
- Make apps responsive (flexbox/grid, media queries)
- Include real interactivity — click handlers, animations, state management
- Use CDN libraries when needed: Chart.js, D3.js, Three.js, Anime.js, etc.
- NEVER build stubs or placeholders. Every app should be impressive and functional.
- For calculators: include real formulas. For dashboards: use Chart.js with real/sample data. For landing pages: include all sections.

### Automation Rules (run_automation):
- Chain steps: fetch → transform → filter → aggregate → notify
- Always explain what the automation did and show key results
- Save automation results to workspace for history`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, sessionKey: sk, preferredProvider } = body;
    const sessionKey = sk || 'default';

    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    // Auth
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401, headers: { 'Content-Type': 'application/json' },
      });
    }

    const userSupabase = createClient(
      (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\\n/g, '').trim(),
      (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').replace(/\\n/g, '').trim(),
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid auth token' }), {
        status: 401, headers: { 'Content-Type': 'application/json' },
      });
    }

    const userId = user.id;
    const supabase = getSupabase();

    // Load API key + profile + memory
    const [keysRes, profileRes, memoryRes] = await Promise.all([
      supabase.from('api_keys' as any).select('id, provider, encrypted_key').eq('user_id', userId),
      supabase.from('profiles').select('full_name, role, industry, current_focus, plan').eq('id', userId).single(),
      supabase.from('user_memory' as any).select('content, category').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
    ]);

    const allKeys = (keysRes.data || []) as any[];
    const profile = profileRes.data as any;
    const memories = (memoryRes.data || []) as any[];

    if (allKeys.length === 0) {
      return new Response(JSON.stringify({ error: 'No API key configured. Add one at Settings → API Keys.' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    // Pick the right key based on preferred provider
    let keyRow = allKeys[0];
    if (preferredProvider) {
      const match = allKeys.find((k: any) => k.provider === preferredProvider);
      if (match) keyRow = match;
    }

    let apiKey: string;
    try {
      apiKey = decrypt(keyRow.encrypted_key);
    } catch {
      return new Response(JSON.stringify({ error: 'Failed to decrypt API key. Try re-adding your key.' }), {
        status: 500, headers: { 'Content-Type': 'application/json' },
      });
    }
    const provider = keyRow.provider;

    // Load conversation history
    let history: Array<{ role: string; content: string }> = [];
    try {
      const historyRes = await supabase.from('agent_messages' as any)
        .select('role, content')
        .eq('user_id', userId)
        .eq('session_key', sessionKey)
        .order('created_at', { ascending: true })
        .limit(30);
      history = ((historyRes as any).data || []).map((h: any) => ({
        role: h.role === 'assistant' || h.role === 'agent' ? 'assistant' : 'user',
        content: h.content,
      })).filter((h: any) => h.content?.trim());
    } catch {}

    // Save user message
    try {
      await (supabase.from('agent_messages' as any).insert({
        user_id: userId, session_key: sessionKey, role: 'user', content: message,
      } as any) as any);
    } catch {}

    // Build context-enriched messages
    const messages = [...history];
    
    // Inject user context + memory as a system-adjacent message
    const contextParts: string[] = [];
    if (profile?.full_name) contextParts.push(`User: ${profile.full_name}`);
    if (profile?.role) contextParts.push(`Role: ${profile.role}`);
    if (profile?.industry) contextParts.push(`Industry: ${profile.industry}`);
    if (profile?.current_focus) contextParts.push(`Current focus: ${profile.current_focus}`);
    if (memories.length > 0) {
      contextParts.push(`\nRelevant memories:\n${memories.slice(0, 10).map((m: any) => `- [${m.category}] ${m.content}`).join('\n')}`);
    }
    
    if (contextParts.length > 0 && messages.length === 0) {
      // First message — inject context
      messages.push({ role: 'user', content: `[Context about me: ${contextParts.join('. ')}]\n\n${message}` });
    } else {
      messages.push({ role: 'user', content: message });
    }

    const toolCtx: ToolContext = { userId };

    // Try Ultron first (full OpenClaw agent), fall back to direct BYOLLM
    const ultronAvailable = await tryUltron(userId, apiKey, provider, profile, message, sessionKey, history);
    
    if (ultronAvailable) {
      // Stream from Ultron with tool status events
      return streamFromUltron(userId, message, sessionKey, history, supabase);
    }

    // Direct BYOLLM fallback — call the user's LLM directly with tools
    return streamDirectBYOLLM(provider, apiKey, messages, toolCtx, supabase, userId, sessionKey);

  } catch (error: any) {
    console.error('Agent chat error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal error' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function tryUltron(userId: string, apiKey: string, provider: string, profile: any, message: string, sessionKey: string, history: any[]): Promise<boolean> {
  if (!ULTRON_URL || !ULTRON_API_SECRET) return false;
  
  try {
    const spawnRes = await fetch(`${ULTRON_URL}/api/agent/spawn`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ULTRON_API_SECRET}`,
      },
      body: JSON.stringify({
        userId, apiKey, provider,
        userContext: {
          name: profile?.full_name,
          role: profile?.role,
          industry: profile?.industry,
          currentFocus: profile?.current_focus,
          plan: profile?.plan,
        },
      }),
      signal: AbortSignal.timeout(15000), // 15s max for spawn
    });
    return spawnRes.ok;
  } catch {
    return false;
  }
}

async function streamFromUltron(userId: string, message: string, sessionKey: string, history: any[], supabase: any): Promise<Response> {
  const stream = new ReadableStream({
    async start(controller) {
      let fullText = '';
      try {
        controller.enqueue(sse({ status: 'Connecting to your agent...' }));
        
        const upstream = await fetch(`${ULTRON_URL}/api/agent/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${ULTRON_API_SECRET}`,
          },
          body: JSON.stringify({ userId, message, sessionKey, history }),
          signal: AbortSignal.timeout(90000),
        });

        if (!upstream.ok) {
          const errText = await upstream.text();
          controller.enqueue(sse({ text: `I'm having trouble connecting right now. Let me try again... (${errText})` }));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
          return;
        }

        const reader = upstream.body?.getReader();
        if (!reader) { controller.close(); return; }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (!data || data === '[DONE]') continue;
            
            // Pass through all events
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) fullText += parsed.text;
            } catch {}
          }
        }
      } catch (err: any) {
        controller.enqueue(sse({ text: `Connection interrupted. Error: ${err.message}` }));
      }

      // Save response
      if (fullText.trim()) {
        try {
          await (supabase.from('agent_messages' as any).insert({
            user_id: userId, session_key: sessionKey, role: 'assistant', content: fullText.trim(),
          } as any) as any);
        } catch {}
      }

      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}

async function streamDirectBYOLLM(provider: string, apiKey: string, messages: any[], toolCtx: ToolContext, supabase: any, userId: string, sessionKey: string): Promise<Response> {
  const config = PROVIDER_CONFIGS[provider] || PROVIDER_CONFIGS.openai;
  
  // Build tools in the right format for this provider
  const tools = provider === 'anthropic' ? ANTHROPIC_TOOLS : TOOL_SCHEMAS.map(t => t.function);

  const stream = new ReadableStream({
    async start(controller) {
      let fullText = '';
      let toolRounds = 0;
      const maxToolRounds = 10;
      let currentMessages = [...messages];

      controller.enqueue(sse({ status: 'Thinking...' }));

      while (toolRounds < maxToolRounds) {
        const req = config.buildRequest(apiKey, currentMessages, tools);
        
        let response: globalThis.Response;
        try {
          response = await fetch(req.url, {
            method: 'POST',
            headers: req.headers,
            body: req.body,
            signal: AbortSignal.timeout(60000),
          });
        } catch (err: any) {
          controller.enqueue(sse({ text: `Connection error: ${err.message}. Please try again.` }));
          break;
        }

        if (!response.ok) {
          const errText = await response.text().catch(() => 'Unknown error');
          controller.enqueue(sse({ text: `API error (${response.status}): ${errText.slice(0, 200)}` }));
          break;
        }

        const reader = response.body?.getReader();
        if (!reader) break;

        const decoder = new TextDecoder();
        let buffer = '';
        let roundText = '';
        let activeToolCall: { id: string; name: string; args: string } | null = null;
        let pendingToolCalls: Array<{ id: string; name: string; args: string }> = [];
        let hasToolCalls = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const parsed = config.parseStream(line);
            if (!parsed) continue;

            if (parsed.done) break;

            if (parsed.toolCall) {
              // New tool call starting
              if (activeToolCall && activeToolCall.name) {
                pendingToolCalls.push({ ...activeToolCall });
              }
              activeToolCall = parsed.toolCall;
              hasToolCalls = true;
              controller.enqueue(sse({ tool_start: parsed.toolCall.name, status: `Using ${parsed.toolCall.name}...` }));
              continue;
            }

            if (parsed.text) {
              if (activeToolCall) {
                // Accumulating tool call arguments
                activeToolCall.args += parsed.text;
              } else {
                // Regular text
                roundText += parsed.text;
                fullText += parsed.text;
                controller.enqueue(sse({ text: parsed.text }));
              }
            }
          }
        }

        // Finalize last tool call
        if (activeToolCall && activeToolCall.name) {
          pendingToolCalls.push({ ...activeToolCall });
        }

        // If no tool calls, we're done
        if (!hasToolCalls || pendingToolCalls.length === 0) break;

        // Execute tool calls
        const friendlyToolNames: Record<string, string> = {
          'pulsed_research': '🔍 Researching',
          'web_search': '🌐 Searching the web',
          'create_artifact': '🏗️ Building',
          'update_artifact': '📝 Updating workspace',
          'list_artifacts': '📂 Checking workspace',
          'memory_save': '🧠 Saving to memory',
          'memory_recall': '🧠 Searching memory',
          'schedule_task': '📅 Setting up task',
          'send_notification': '🔔 Sending notification',
          'crm_manage_contacts': '👥 Managing contacts',
          'crm_manage_deals': '💰 Managing deals',
          'crm_log_activity': '📋 Logging activity',
          'set_monitor': '📡 Setting up monitor',
          'generate_content': '✍️ Generating content',
          'build_app': '🚀 Building app',
          'run_automation': '⚙️ Running automation',
        };
        const toolResults: Array<{ id: string; name: string; result: string }> = [];
        for (const tc of pendingToolCalls) {
          const friendly = friendlyToolNames[tc.name] || `Running ${tc.name}`;
          let argPreview = '';
          try { const a = JSON.parse(tc.args); argPreview = a.topic || a.query || a.name || a.keyword || ''; } catch {}
          controller.enqueue(sse({ tool_start: tc.name, status: `${friendly}${argPreview ? ': ' + argPreview : ''}...` }));
          let args: Record<string, any> = {};
          try { args = JSON.parse(tc.args); } catch {}
          const result = await executeTool(tc.name, args, toolCtx);
          toolResults.push({ id: tc.id, name: tc.name, result });
          controller.enqueue(sse({ tool_done: tc.name }));
        }

        // Add assistant message + tool results to conversation for next round
        if (provider === 'anthropic') {
          // Anthropic format
          const contentBlocks: any[] = [];
          if (roundText) contentBlocks.push({ type: 'text', text: roundText });
          for (const tc of pendingToolCalls) {
            let input: any = {};
            try { input = JSON.parse(tc.args); } catch {}
            contentBlocks.push({ type: 'tool_use', id: tc.id, name: tc.name, input });
          }
          currentMessages.push({ role: 'assistant', content: contentBlocks } as any);
          
          const toolResultContent = toolResults.map(tr => ({
            type: 'tool_result',
            tool_use_id: tr.id,
            content: tr.result,
          }));
          currentMessages.push({ role: 'user', content: toolResultContent } as any);
        } else {
          // OpenAI format
          const assistantMsg: any = { role: 'assistant', content: roundText || null };
          assistantMsg.tool_calls = pendingToolCalls.map((tc, i) => ({
            id: tc.id || `call_${i}`,
            type: 'function',
            function: { name: tc.name, arguments: tc.args },
          }));
          currentMessages.push(assistantMsg);
          
          for (const tr of toolResults) {
            currentMessages.push({
              role: 'tool',
              tool_call_id: tr.id,
              content: tr.result,
            } as any);
          }
        }

        toolRounds++;
        pendingToolCalls = [];
        hasToolCalls = false;
        activeToolCall = null;
      }

      // Save full response
      if (fullText.trim()) {
        try {
          await (supabase.from('agent_messages' as any).insert({
            user_id: userId, session_key: sessionKey, role: 'assistant', content: fullText.trim(),
          } as any) as any);
        } catch {}
      }

      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}
