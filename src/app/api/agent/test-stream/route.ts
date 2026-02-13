import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { decrypt } from '@/lib/encryption';
import { ANTHROPIC_TOOLS, executeTool, ToolContext } from '@/lib/agent-tools';

export const maxDuration = 120;

const encoder = new TextEncoder();
function sseEvent(data: any): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
}

function toolDisplayName(name: string): string {
  const map: Record<string, string> = {
    pulsed_research: '🔍 Running deep research...',
    web_search: '🔍 Searching the web...',
    create_artifact: '🛠️ Building artifact...',
    update_artifact: '📝 Updating artifact...',
    list_artifacts: '📋 Loading artifacts...',
    memory_save: '💾 Saving to memory...',
    memory_recall: '🧠 Recalling memories...',
    schedule_task: '⏰ Scheduling task...',
    send_notification: '🔔 Sending notification...',
  };
  return map[name] || `Running ${name}...`;
}

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  'X-Accel-Buffering': 'no',
};

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-ultron-secret')?.trim();
  if (secret !== process.env.ULTRON_API_SECRET?.trim()) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { userId, message } = await req.json();
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  );

  // Load everything
  const [profileRes, keysRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('api_keys' as any).select('id, provider, encrypted_key').eq('user_id', userId),
  ]);

  const profile = profileRes.data as any;
  const keyRow = (keysRes.data as any)?.[0];
  const apiKey = decrypt(keyRow.encrypted_key);
  const name = profile?.full_name || 'there';

  const systemPrompt = `You are a helpful AI agent. The user's name is ${name}. Be concise.`;
  const messages = [{ role: 'user' as const, content: message }];
  const toolCtx: ToolContext = { userId };

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (data: Uint8Array) => {
        try { controller.enqueue(data); } catch (e) { console.error('enqueue failed:', e); }
      };

      try {
        enqueue(sseEvent({ status: 'Starting Anthropic stream...' }));
        
        // Call Anthropic with streaming
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4096,
            stream: true,
            system: systemPrompt,
            messages,
            tools: ANTHROPIC_TOOLS,
          }),
        });

        if (!res.ok) {
          const err = await res.text();
          enqueue(sseEvent({ text: `API Error (${res.status}): ${err.slice(0, 200)}` }));
          enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
          return;
        }

        enqueue(sseEvent({ status: 'Streaming response...' }));

        let fullText = '';
        let toolCalls: Array<{ id: string; name: string; input: any }> = [];
        let currentToolInputJson = '';
        let currentToolId = '';
        let currentToolName = '';
        let currentBlockType = '';
        let stopReason = 'end_turn';

        const reader = res.body!.getReader();
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
            const jsonStr = line.slice(6).trim();
            if (!jsonStr || jsonStr === '[DONE]') continue;

            let event: any;
            try { event = JSON.parse(jsonStr); } catch { continue; }

            switch (event.type) {
              case 'content_block_start': {
                const block = event.content_block;
                if (block.type === 'text') {
                  currentBlockType = 'text';
                } else if (block.type === 'tool_use') {
                  currentBlockType = 'tool_use';
                  currentToolId = block.id;
                  currentToolName = block.name;
                  currentToolInputJson = '';
                  enqueue(sseEvent({ tool_start: block.name, status: toolDisplayName(block.name) }));
                }
                break;
              }
              case 'content_block_delta': {
                if (event.delta?.type === 'text_delta') {
                  enqueue(sseEvent({ text: event.delta.text }));
                  fullText += event.delta.text;
                } else if (event.delta?.type === 'input_json_delta') {
                  currentToolInputJson += event.delta.partial_json;
                }
                break;
              }
              case 'content_block_stop': {
                if (currentBlockType === 'tool_use') {
                  let input = {};
                  try { input = JSON.parse(currentToolInputJson); } catch {}
                  toolCalls.push({ id: currentToolId, name: currentToolName, input });
                }
                currentBlockType = '';
                break;
              }
              case 'message_delta': {
                if (event.delta?.stop_reason) stopReason = event.delta.stop_reason;
                break;
              }
            }
          }
        }

        enqueue(sseEvent({ status: `Stream done. stop_reason: ${stopReason}, toolCalls: ${toolCalls.length}, text length: ${fullText.length}` }));

        // Execute tools if any
        if (toolCalls.length > 0 && stopReason === 'tool_use') {
          for (const tc of toolCalls) {
            enqueue(sseEvent({ status: `Executing tool: ${tc.name} with args: ${JSON.stringify(tc.input).slice(0, 200)}` }));
            try {
              const result = await executeTool(tc.name, tc.input, toolCtx);
              enqueue(sseEvent({ tool_done: tc.name, status: `Tool result (${result.length} chars)` }));
              enqueue(sseEvent({ status: `Result preview: ${result.slice(0, 300)}` }));
            } catch (err: any) {
              enqueue(sseEvent({ status: `Tool error: ${err.message}` }));
            }
          }
        }

      } catch (err: any) {
        enqueue(sseEvent({ status: `FATAL: ${err.message}` }));
      }

      enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}
