import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { decrypt } from '@/lib/encryption';
import { TOOL_SCHEMAS, ANTHROPIC_TOOLS, executeTool, type ToolContext } from '@/lib/agent-tools';

export const maxDuration = 60; // Vercel Hobby limit

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

// Model selection based on message complexity and user profile
function selectModel(message: string, profile: any, allKeys: any[]): { provider: string; model: string; key: string } | null {
  // Simple heuristic: if message is short (<100 chars) and looks like a quick task, use worker
  // Otherwise use brain model
  const isQuickTask = message.length < 100 && !message.match(/research|analyze|build|create|deploy|compare|strategy/i);
  
  const targetModel = isQuickTask ? profile?.worker_model : profile?.brain_model;
  
  if (targetModel) {
    // Parse "provider/model" format e.g. "anthropic/claude-opus-4"
    const [provider] = targetModel.split('/');
    const matchKey = allKeys.find((k: any) => k.provider === provider);
    if (matchKey) {
      const modelName = targetModel.split('/')[1];
      return { provider, model: mapModelName(modelName), key: decrypt(matchKey.encrypted_key) };
    }
  }
  
  // Fallback chain
  const fallbacks = profile?.fallback_models || [];
  for (const fm of fallbacks) {
    const [provider] = fm.split('/');
    const matchKey = allKeys.find((k: any) => k.provider === provider);
    if (matchKey) {
      const modelName = fm.split('/')[1];
      return { provider, model: mapModelName(modelName), key: decrypt(matchKey.encrypted_key) };
    }
  }
  
  return null; // Will fall through to existing logic
}

// Map user-friendly model names to actual API model IDs
function mapModelName(modelName: string): string {
  const modelMap: Record<string, string> = {
    // Anthropic models
    'claude-opus-4': 'claude-opus-4-20250514',
    'claude-sonnet-4': 'claude-sonnet-4-20250514',
    'claude-haiku-4': 'claude-haiku-4-20250514',
    // OpenAI models
    'gpt-4.1': 'gpt-4.1',
    'gpt-4.1-mini': 'gpt-4.1-mini',
    'gpt-5.1-codex': 'gpt-5.1-codex',
    // Google models
    'gemini-2.5-pro': 'gemini-2.5-pro',
    'gemini-2.5-flash': 'gemini-2.5-flash',
    // Moonshot models
    'kimi-k2': 'kimi-k2-0905-preview',
  };
  
  return modelMap[modelName] || modelName;
}

// Provider-specific LLM call configs
const PROVIDER_CONFIGS: Record<string, { baseUrl: string; buildRequest: (key: string, messages: any[], tools: any[], modelOverride?: string) => { url: string; headers: Record<string, string>; body: string }; parseStream: (line: string) => { text?: string; toolCall?: any; done?: boolean } | null }> = {
  anthropic: {
    baseUrl: 'https://api.anthropic.com',
    buildRequest: (key, messages, tools, modelOverride) => ({
      url: 'https://api.anthropic.com/v1/messages',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: modelOverride || 'claude-sonnet-4-20250514',
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
    buildRequest: (key, messages, tools, modelOverride) => ({
      url: 'https://api.openai.com/v1/chat/completions',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: modelOverride || 'gpt-4.1',
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
    buildRequest: (key, messages, _tools, modelOverride) => ({
      url: `https://generativelanguage.googleapis.com/v1beta/models/${modelOverride || 'gemini-2.5-flash'}:streamGenerateContent?alt=sse&key=${key}`,
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
    buildRequest: (key, messages, tools, modelOverride) => ({
      url: 'https://api.moonshot.ai/v1/chat/completions',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: modelOverride || 'kimi-k2-0905-preview',
        stream: true,
        messages: [{ role: 'system', content: buildSystemPrompt() }, ...messages],
        tools: tools.map(t => ({ type: 'function', function: t })),
      }),
    }),
    parseStream: (line) => PROVIDER_CONFIGS.openai.parseStream(line), // OpenAI-compatible
  },
};

function buildSystemPrompt(): string {
  return `You are the user's personal AI agent — their own AI agent. You connect to their existing tools and make them radically more efficient.

You're not a chatbot. You're the connective tissue between everything they use — their email, calendar, CRM, code repos, project tools. You see across all of it and act across all of it.

## Your Personality
- Direct but warm. Never robotic.
- Have opinions. Push back on bad ideas. Celebrate wins.
- You're a partner, not a tool. The best chief of staff they never had.
- When you learn something, acknowledge it naturally. "Got it, I'll remember that" — not "Information saved to memory."

## Your Capabilities

**Memory & Context**
- memory_save: Remember EVERYTHING — preferences, goals, contacts, decisions, patterns. You get smarter every day.
- memory_recall: Always check memory before answering. If you've discussed it before, recall it.

**Research & Intelligence**
- pulsed_research: Deep multi-source research across Reddit, HN, X, YouTube, and the web.
- web_search: Quick lookups for facts, current events, specific questions.

**Integrations (when connected)**
- github_action: List repos, create issues, check PRs, review code.
- google_calendar: Check schedule, find availability, upcoming meetings.
- google_gmail: Read recent emails, search inbox.

**Content & Communication**
- generate_content: Draft emails, messages, posts, documents in any tone.
- send_notification: Alert the user about things that matter.

**Scheduling**
- schedule_task: Set up recurring tasks and workflows.

## CRITICAL: TIME LIMIT
You have a STRICT 50-second execution window. 3-4 tool calls max per turn.

## How You Operate
1. **Check memory first.** Before answering, recall what you know about the user.
2. **Use integrations.** When connected, pull real data — don't guess what's on their calendar or inbox.
3. **Think cross-tool.** "Prep for my meeting" = check calendar → find attendee emails → recall previous interactions → draft talking points.
4. **Be proactive.** "You have 3 meetings tomorrow. Want me to prep for any of them?"
5. **Remember everything.** After learning something, save it immediately.
6. **Be concise.** Show results, not process. Don't narrate what you're doing.
7. **Format cleanly.** Markdown, bold key points, tables for data. Scannable.
8. **Never fabricate.** If an integration isn't connected, say so and offer to help connect it.

## Cross-Tool Workflow Examples
- "Prep for my meeting with Sarah" → check calendar → search emails for context → recall memory → draft talking points
- "Follow up on yesterday's calls" → check calendar for meetings → draft follow-ups → offer to send
- "What should I focus on today?" → check calendar → check emails → recall goals → prioritize
- "Research X" → pulsed_research → memory_save key insights

## Rules
- When you don't know something about the user, ASK — then remember the answer.
- If someone asks you to connect a tool, guide them through it step by step — just like a friend would.
- Don't over-research. If you know the answer, give it.`;
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
      supabase.from('profiles').select('full_name, role, industry, current_focus, plan, brain_model, worker_model, subagent_model, heartbeat_model, fallback_models').eq('id', userId).single(),
      supabase.from('user_memory' as any).select('content, category').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
    ]);

    const allKeys = (keysRes.data || []) as any[];
    const profile = profileRes.data as any;
    const memories = (memoryRes.data || []) as any[];

    // Extract model routing config
    const brainModel = profile?.brain_model || null;
    const workerModel = profile?.worker_model || null;
    const fallbackModels = profile?.fallback_models || [];

    if (allKeys.length === 0) {
      return new Response(JSON.stringify({ error: 'No API key configured. Add one at Settings → API Keys.' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check plan limits for free tier
    const plan = profile?.plan || 'free';
    if (plan === 'free') {
      // Check daily message count
      const today = new Date().toISOString().split('T')[0];
      const { count } = await supabase
        .from('agent_messages')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('session_key', sessionKey)
        .gte('created_at', `${today}T00:00:00Z`);
      
      if ((count || 0) >= 10) {
        return new Response(
          `data: ${JSON.stringify({ text: "You've reached the free tier limit of 10 messages per day. Upgrade to Pro for unlimited access." })}\n\ndata: [DONE]\n\n`,
          { headers: SSE_HEADERS }
        );
      }
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
    let provider = keyRow.provider;

    // Smart model routing
    let selectedModel: string | undefined;
    if (!preferredProvider || preferredProvider === 'auto') {
      const routed = selectModel(message, profile, allKeys);
      if (routed) {
        provider = routed.provider;
        selectedModel = routed.model;
        apiKey = routed.key;
      }
    }

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

    // Pass user's decrypted API key for tools that need it (image gen, etc.)
    const userOpenAIKey = provider === 'openai' ? apiKey : undefined;
    const toolCtx: ToolContext = { userId, userOpenAIKey };

    // Check if Ultron agent is already running (fast status check, no spawn)
    let ultronRunning = false;
    try {
      const statusRes = await fetch(`${ULTRON_URL}/api/agent/status/${userId}`, {
        headers: { Authorization: `Bearer ${ULTRON_API_SECRET}` },
        signal: AbortSignal.timeout(3000),
      });
      const statusData = await statusRes.json();
      ultronRunning = statusData.running === true;
    } catch {}

    if (ultronRunning) {
      // Agent is warm — stream directly from real OpenClaw instance
      console.log(`[chat] Ultron agent warm for ${userId}, streaming from OpenClaw`);
      return streamFromUltron(userId, message, sessionKey, history, supabase);
    }

    // Agent not running — spawn it and wait, then stream through it
    console.log(`[chat] Spawning Ultron agent for ${userId}...`);
    const spawned = await tryUltron(userId, apiKey, provider, profile, message, sessionKey, history);
    
    if (spawned) {
      // Give OpenClaw a moment to initialize
      await new Promise(r => setTimeout(r, 2000));
      console.log(`[chat] Ultron spawned for ${userId}, streaming from OpenClaw`);
      return streamFromUltron(userId, message, sessionKey, history, supabase);
    }

    // Ultron failed — fall back to direct BYOLLM
    console.log(`[chat] Ultron spawn failed for ${userId}, falling back to BYOLLM`);
    return streamDirectBYOLLM(provider, apiKey, messages, toolCtx, supabase, userId, sessionKey, selectedModel);

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
      signal: AbortSignal.timeout(8000), // 8s max for spawn (leave room for response within 60s Vercel limit)
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
          signal: AbortSignal.timeout(55000),
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

async function streamDirectBYOLLM(provider: string, apiKey: string, messages: any[], toolCtx: ToolContext, supabase: any, userId: string, sessionKey: string, modelOverride?: string): Promise<Response> {
  const config = PROVIDER_CONFIGS[provider] || PROVIDER_CONFIGS.openai;
  
  // Build tools in the right format for this provider
  const tools = provider === 'anthropic' ? ANTHROPIC_TOOLS : TOOL_SCHEMAS.map(t => t.function);

  const stream = new ReadableStream({
    async start(controller) {
      let fullText = '';
      let toolRounds = 0;
      const maxToolRounds = 10;
      let currentMessages = [...messages];
      const startTime = Date.now();

      controller.enqueue(sse({ status: 'Thinking...' }));

      // Send model info at the start
      if (modelOverride) {
        controller.enqueue(sse({ status: `Using ${modelOverride}`, model: modelOverride }));
      }

      while (toolRounds < maxToolRounds) {
        const req = config.buildRequest(apiKey, currentMessages, tools, modelOverride);
        
        let response: globalThis.Response;
        try {
          response = await fetch(req.url, {
            method: 'POST',
            headers: req.headers,
            body: req.body,
            signal: AbortSignal.timeout(55000),
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
          'pulsed_research': 'Researching',
          'web_search': 'Searching the web',
          'memory_save': 'Saving to memory',
          'memory_recall': 'Searching memory',
          'generate_content': 'Drafting content',
          'schedule_task': 'Setting up task',
          'send_notification': 'Sending notification',
          'github_action': 'Checking GitHub',
          'google_calendar': 'Checking calendar',
          'google_gmail': 'Checking email',
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
          
          // Build user-visible summary of tool result
          let resultSummary = '';
          try {
            const parsed = JSON.parse(result);
            if (tc.name === 'generate_image' && parsed.url) {
              resultSummary = `![Generated image](${parsed.url})`;
            } else if (tc.name === 'create_artifact' && parsed.id) {
              resultSummary = `Created "${parsed.title || 'item'}" in workspace`;
            } else if (tc.name === 'web_search' || tc.name === 'pulsed_research') {
              resultSummary = ''; // Don't show raw search results inline
            } else if (tc.name === 'github_action' || tc.name === 'google_calendar' || tc.name === 'google_gmail') {
              resultSummary = '';
            } else if (tc.name === 'memory_save') {
              resultSummary = `Saved to memory`;
            }
          } catch {}
          
          if (resultSummary) {
            // Inject the summary into the text stream so it appears in the message AND gets saved
            fullText += '\n' + resultSummary + '\n';
            controller.enqueue(sse({ text: '\n' + resultSummary + '\n' }));
          }
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
        
        // Check timeout after each tool round
        const elapsed = Date.now() - startTime;
        if (elapsed > 45000) {
          // Inject time warning and break
          controller.enqueue(sse({ text: '\n\n*[Running low on time — wrapping up...]*\n\n' }));
          break;
        }
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
