import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { decrypt } from '@/lib/encryption';

export const maxDuration = 300; // 5 min max for cron

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Vercel cron auth
function verifyCron(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) return true;
  // Also allow in development
  if (process.env.NODE_ENV === 'development') return true;
  return false;
}

function calculateNextRun(schedule: string, fromDate: Date = new Date()): Date {
  const s = schedule.toLowerCase();
  
  if (s === 'daily-9am' || s === 'daily') {
    const next = new Date(fromDate);
    next.setDate(next.getDate() + 1);
    next.setHours(9, 0, 0, 0);
    return next;
  }
  if (s.startsWith('weekly-')) {
    const next = new Date(fromDate);
    next.setDate(next.getDate() + 7);
    next.setHours(9, 0, 0, 0);
    return next;
  }
  if (s.startsWith('every-')) {
    const match = s.match(/every-(\d+)h/);
    if (match) {
      const hours = parseInt(match[1]);
      return new Date(fromDate.getTime() + hours * 60 * 60 * 1000);
    }
  }
  // Default: 24h
  return new Date(fromDate.getTime() + 24 * 60 * 60 * 1000);
}

async function runAgentTask(userId: string, taskPrompt: string): Promise<string> {
  // Get user's API key
  const { data: keys } = await supabaseAdmin
    .from('api_keys' as any)
    .select('provider, encrypted_key')
    .eq('user_id', userId)
    .limit(1);
  
  if (!keys || keys.length === 0) return 'Error: No API key configured';
  
  const keyRow = keys[0] as any;
  let apiKey: string;
  try {
    apiKey = decrypt(keyRow.encrypted_key);
  } catch {
    return 'Error: Failed to decrypt API key';
  }
  
  // Get user profile for context
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('full_name, role, industry, current_focus')
    .eq('id', userId)
    .single();
  
  const name = (profile as any)?.full_name || 'User';
  
  // Call the LLM with the task prompt (no tools for cron tasks — keep it simple and fast)
  const isAnthropic = keyRow.provider === 'anthropic';
  
  try {
    if (isAnthropic) {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-20250514',
          max_tokens: 2048,
          system: `You are a Pulsed AI Agent running a scheduled task for ${name}. Be concise and actionable. Deliver results directly — no preamble.`,
          messages: [{ role: 'user', content: taskPrompt }],
        }),
      });
      
      if (!res.ok) {
        const err = await res.text();
        return `Error calling Anthropic: ${err.slice(0, 200)}`;
      }
      
      const data = await res.json();
      return data.content?.map((c: any) => c.text).join('') || 'No response';
    } else {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          messages: [
            { role: 'system', content: `You are a Pulsed AI Agent running a scheduled task for ${name}. Be concise and actionable.` },
            { role: 'user', content: taskPrompt },
          ],
          max_tokens: 2048,
        }),
      });
      
      if (!res.ok) {
        const err = await res.text();
        return `Error calling OpenAI: ${err.slice(0, 200)}`;
      }
      
      const data = await res.json();
      return data.choices?.[0]?.message?.content || 'No response';
    }
  } catch (err: any) {
    return `Error: ${err.message}`;
  }
}

async function deliverViaTelegram(userId: string, message: string): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return;
  
  // Get user's telegram chat ID
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('telegram_chat_id')
    .eq('id', userId)
    .single();
  
  const chatId = (profile as any)?.telegram_chat_id;
  if (!chatId) return;
  
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: `🤖 Scheduled Task Result:\n\n${message.slice(0, 4000)}`,
        parse_mode: 'HTML',
      }),
    });
  } catch {
    // Best effort
  }
}

export async function GET(req: NextRequest) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const now = new Date().toISOString();
  
  // Get due tasks
  const { data: tasks, error } = await supabaseAdmin
    .from('scheduled_tasks' as any)
    .select('*')
    .eq('enabled', true)
    .lte('next_run', now)
    .limit(20);
  
  if (error || !tasks || tasks.length === 0) {
    return NextResponse.json({ processed: 0 });
  }
  
  let processed = 0;
  
  for (const task of tasks as any[]) {
    try {
      // Run the agent task
      const result = await runAgentTask(task.user_id, task.task_prompt);
      
      // Save notification
      await supabaseAdmin.from('agent_notifications' as any).insert({
        user_id: task.user_id,
        message: `**${task.name}**\n\n${result}`,
        type: 'task_result',
        source: 'scheduled_task',
        source_id: task.id,
      } as any);
      
      // Calculate next run
      const nextRun = calculateNextRun(task.schedule);
      
      // Update task
      await supabaseAdmin
        .from('scheduled_tasks' as any)
        .update({
          last_run: now,
          next_run: nextRun.toISOString(),
          last_result: result.slice(0, 5000),
        } as any)
        .eq('id', task.id);
      
      // Deliver via configured channel
      if (task.delivery === 'telegram') {
        await deliverViaTelegram(task.user_id, `${task.name}:\n${result}`);
      }
      
      processed++;
    } catch (err: any) {
      console.error(`Task ${task.id} failed:`, err.message);
    }
  }
  
  return NextResponse.json({ processed, total: tasks.length });
}
