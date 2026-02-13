/**
 * Agent Tools — Tool definitions + execution for Pulsed AI agents
 * 
 * Each tool has:
 * - schema: JSON Schema for LLM function calling (OpenAI/Anthropic format)
 * - execute: async function that runs the tool and returns a result string
 */

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// ─── Tool Schemas (OpenAI function calling format) ───

export const TOOL_SCHEMAS = [
  {
    type: 'function' as const,
    function: {
      name: 'pulsed_research',
      description: 'Run deep research on any topic. Searches Reddit, Hacker News, X/Twitter, YouTube, news, and the web. Returns a comprehensive executive brief with sources. Use this whenever the user asks to research, analyze, investigate, or learn about ANY topic.',
      parameters: {
        type: 'object',
        properties: {
          topic: { type: 'string', description: 'The topic to research' },
          persona: { 
            type: 'string', 
            enum: ['analyst', 'executive', 'journalist', 'researcher', 'investor'],
            description: 'Research perspective/style. Default: analyst'
          },
        },
        required: ['topic'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_artifact',
      description: 'Create a persistent data structure in the user workspace. Types: table (spreadsheet), kanban (drag-and-drop board), list (checklist with priorities), document (markdown doc). Use when user asks to BUILD, CREATE, or SET UP anything — CRMs, trackers, pipelines, dashboards, docs, boards, lists.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Name of the artifact' },
          type: { type: 'string', enum: ['table', 'kanban', 'list', 'document'], description: 'Type of artifact' },
          description: { type: 'string', description: 'What this artifact is for' },
          columns: {
            type: 'array',
            description: 'Column definitions (for table/kanban). Each has key, label, type (text|number|currency|date|select|badge|url|email|phone), and optional options array for select/badge types.',
            items: {
              type: 'object',
              properties: {
                key: { type: 'string' },
                label: { type: 'string' },
                type: { type: 'string', enum: ['text', 'number', 'currency', 'date', 'select', 'badge', 'url', 'email', 'phone'] },
                options: { type: 'array', items: { type: 'string' } },
              },
              required: ['key', 'label', 'type'],
            },
          },
          rows: {
            type: 'array',
            description: 'Initial data rows. Each row is an object with keys matching column keys, plus an "id" field.',
            items: { type: 'object' },
          },
          groupBy: { type: 'string', description: 'Column key to group by (for kanban boards)' },
          content: { type: 'string', description: 'Markdown content (for document type)' },
        },
        required: ['name', 'type'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_artifact',
      description: 'Update an existing artifact. Can update name, columns, rows, content, or description.',
      parameters: {
        type: 'object',
        properties: {
          artifactId: { type: 'string', description: 'ID of the artifact to update' },
          name: { type: 'string' },
          columns: { type: 'array', items: { type: 'object' } },
          rows: { type: 'array', items: { type: 'object' } },
          content: { type: 'string' },
          description: { type: 'string' },
        },
        required: ['artifactId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_artifacts',
      description: 'List all artifacts in the user workspace. Returns names, types, and IDs.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'web_search',
      description: 'Search the web using Brave Search API. Use for quick factual lookups, current events, or specific questions. For deep research across multiple sources, use pulsed_research instead.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          count: { type: 'number', description: 'Number of results (1-10, default 5)' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'memory_save',
      description: 'Save an important fact, preference, or learning about the user to long-term memory. Use this after learning something significant — user preferences, key context, project details, contact info, goals, lessons learned. This makes you smarter over time.',
      parameters: {
        type: 'object',
        properties: {
          content: { type: 'string', description: 'What to remember' },
          category: { 
            type: 'string', 
            enum: ['preference', 'fact', 'pattern', 'skill', 'lesson', 'general', 'contact', 'goal'],
            description: 'Category of memory'
          },
        },
        required: ['content', 'category'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'memory_recall',
      description: 'Search your memory for relevant context about the user. Use this when you need to remember something the user told you before, or when context from past conversations would help.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'What to search for in memory' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'schedule_task',
      description: 'Create a scheduled task that runs automatically. The agent will execute the task prompt on the specified schedule and deliver results. Use when user says "remind me", "check every", "monitor", "alert me when", "every Monday", etc.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Task name' },
          schedule: { type: 'string', description: 'Schedule: "daily-9am", "weekly-monday-9am", "every-4h", or cron expression' },
          taskPrompt: { type: 'string', description: 'What the agent should do when the task runs' },
          delivery: { type: 'string', enum: ['in_app', 'telegram', 'discord'], description: 'How to deliver results. Default: in_app' },
        },
        required: ['name', 'schedule', 'taskPrompt'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'send_notification',
      description: 'Send a notification or alert to the user via their configured channel.',
      parameters: {
        type: 'object',
        properties: {
          message: { type: 'string', description: 'Notification message' },
          type: { type: 'string', enum: ['info', 'alert', 'reminder', 'insight'], description: 'Notification type' },
        },
        required: ['message'],
      },
    },
  },
];

// Convert to Anthropic tool format
export const ANTHROPIC_TOOLS = TOOL_SCHEMAS.map(t => ({
  name: t.function.name,
  description: t.function.description,
  input_schema: t.function.parameters,
}));

// ─── Tool Execution ───

export interface ToolContext {
  userId: string;
  userOpenAIKey?: string;
}

async function generateEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  
  try {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text,
      }),
    });
    
    if (!res.ok) return null;
    const data = await res.json();
    return data.data?.[0]?.embedding || null;
  } catch {
    return null;
  }
}

export async function executeTool(
  name: string,
  args: Record<string, any>,
  ctx: ToolContext,
): Promise<string> {
  try {
    switch (name) {
      case 'pulsed_research':
        return await execResearch(args, ctx);
      case 'create_artifact':
        return await execCreateArtifact(args, ctx);
      case 'update_artifact':
        return await execUpdateArtifact(args, ctx);
      case 'list_artifacts':
        return await execListArtifacts(ctx);
      case 'web_search':
        return await execWebSearch(args);
      case 'memory_save':
        return await execMemorySave(args, ctx);
      case 'memory_recall':
        return await execMemoryRecall(args, ctx);
      case 'schedule_task':
        return await execScheduleTask(args, ctx);
      case 'send_notification':
        return await execSendNotification(args, ctx);
      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  } catch (err: any) {
    return JSON.stringify({ error: err.message || 'Tool execution failed' });
  }
}

// ─── Individual Tool Implementations ───

async function execResearch(args: Record<string, any>, ctx: ToolContext): Promise<string> {
  const { deepResearch } = await import('@/lib/deep-research');
  // Race against 60s timeout to avoid killing the whole function
  const result = await Promise.race([
    deepResearch(args.topic, undefined, args.persona || 'analyst'),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Research timed out after 60s — try web_search for faster results')), 60000)),
  ]);
  
  if (result.sources.length === 0) {
    return JSON.stringify({ error: 'No results found for this topic' });
  }
  
  // Save brief to DB
  const { data: saved } = await supabaseAdmin
    .from('briefs')
    .insert({
      topic: args.topic,
      brief_text: result.brief,
      sources: result.sources,
      raw_data: { stats: result.stats, agent_triggered: true },
      user_id: ctx.userId,
    })
    .select('id')
    .single();
  
  return JSON.stringify({
    brief: result.brief,
    sourceCount: result.sources.length,
    briefId: saved?.id,
    message: `Research complete: ${result.sources.length} sources analyzed.`,
  });
}

async function execCreateArtifact(args: Record<string, any>, ctx: ToolContext): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from('artifacts')
    .insert({
      user_id: ctx.userId,
      name: args.name,
      type: args.type,
      description: args.description || null,
      schema: { columns: args.columns || [] },
      data: args.rows || [],
      group_by: args.groupBy || null,
      content: args.content || null,
    })
    .select('id, name, type')
    .single();
  
  if (error) return JSON.stringify({ error: error.message });
  return JSON.stringify({
    success: true,
    artifactId: data.id,
    name: data.name,
    type: data.type,
    message: `Created ${data.type} "${data.name}". It's now visible in the workspace.`,
  });
}

async function execUpdateArtifact(args: Record<string, any>, ctx: ToolContext): Promise<string> {
  const updates: any = { updated_at: new Date().toISOString() };
  if (args.name) updates.name = args.name;
  if (args.columns) updates.schema = { columns: args.columns };
  if (args.rows) updates.data = args.rows;
  if (args.content) updates.content = args.content;
  if (args.description) updates.description = args.description;
  
  const { data, error } = await supabaseAdmin
    .from('artifacts')
    .update(updates)
    .eq('id', args.artifactId)
    .eq('user_id', ctx.userId)
    .select('id, name, type')
    .single();
  
  if (error) return JSON.stringify({ error: error.message });
  return JSON.stringify({
    success: true,
    artifactId: data.id,
    message: `Updated "${data.name}".`,
  });
}

async function execListArtifacts(ctx: ToolContext): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from('artifacts')
    .select('id, name, type, description, updated_at')
    .eq('user_id', ctx.userId)
    .order('updated_at', { ascending: false });
  
  if (error) return JSON.stringify({ error: error.message });
  if (!data || data.length === 0) return JSON.stringify({ artifacts: [], message: 'No artifacts yet. Ask me to build something!' });
  
  return JSON.stringify({
    artifacts: data.map((a: any) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      description: a.description,
      updatedAt: a.updated_at,
    })),
    message: `Found ${data.length} artifact(s) in workspace.`,
  });
}

async function execWebSearch(args: Record<string, any>): Promise<string> {
  const apiKey = process.env.BRAVE_API_KEY;
  if (!apiKey) return JSON.stringify({ error: 'Web search not configured' });
  
  try {
    const count = Math.min(args.count || 5, 10);
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(args.query)}&count=${count}`;
    const res = await fetch(url, {
      headers: { 'X-Subscription-Token': apiKey, Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    
    if (!res.ok) return JSON.stringify({ error: `Search failed: ${res.status}` });
    const data = await res.json();
    
    const results = (data.web?.results || []).slice(0, count).map((r: any) => ({
      title: r.title,
      url: r.url,
      snippet: r.description,
    }));
    
    return JSON.stringify({ results, query: args.query });
  } catch (err: any) {
    return JSON.stringify({ error: err.message });
  }
}

async function execMemorySave(args: Record<string, any>, ctx: ToolContext): Promise<string> {
  const embedding = await generateEmbedding(args.content);
  
  const insertData: any = {
    user_id: ctx.userId,
    content: args.content,
    category: args.category || 'general',
  };
  if (embedding) insertData.embedding = JSON.stringify(embedding);
  
  const { error } = await supabaseAdmin
    .from('user_memory' as any)
    .insert(insertData as any);
  
  if (error) return JSON.stringify({ error: error.message });
  return JSON.stringify({ success: true, message: 'Saved to memory.' });
}

async function execMemoryRecall(args: Record<string, any>, ctx: ToolContext): Promise<string> {
  const embedding = await generateEmbedding(args.query);
  
  if (embedding) {
    // Vector similarity search
    const { data, error } = await supabaseAdmin.rpc('match_user_memory', {
      query_embedding: JSON.stringify(embedding),
      match_user_id: ctx.userId,
      match_threshold: 0.5,
      match_count: 10,
    });
    
    if (!error && data && data.length > 0) {
      return JSON.stringify({
        memories: data.map((m: any) => ({
          content: m.content,
          category: m.category,
          similarity: Math.round(m.similarity * 100) + '%',
          date: m.created_at,
        })),
      });
    }
  }
  
  // Fallback: text search
  const { data } = await supabaseAdmin
    .from('user_memory' as any)
    .select('content, category, created_at')
    .eq('user_id', ctx.userId)
    .ilike('content', `%${args.query}%`)
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (!data || data.length === 0) {
    return JSON.stringify({ memories: [], message: 'No matching memories found.' });
  }
  
  return JSON.stringify({
    memories: (data as any[]).map((m: any) => ({
      content: m.content,
      category: m.category,
      date: m.created_at,
    })),
  });
}

function parseScheduleToNextRun(schedule: string): Date {
  const now = new Date();
  const s = schedule.toLowerCase();
  
  if (s === 'daily-9am' || s === 'daily') {
    const next = new Date(now);
    next.setHours(9, 0, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    return next;
  }
  if (s.startsWith('weekly-')) {
    const days: Record<string, number> = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
    const parts = s.replace('weekly-', '').split('-');
    const dayName = parts[0];
    const targetDay = days[dayName] ?? 1;
    const next = new Date(now);
    next.setHours(9, 0, 0, 0);
    const daysUntil = (targetDay - now.getDay() + 7) % 7 || 7;
    next.setDate(now.getDate() + daysUntil);
    return next;
  }
  if (s.startsWith('every-')) {
    const match = s.match(/every-(\d+)h/);
    if (match) {
      const hours = parseInt(match[1]);
      return new Date(now.getTime() + hours * 60 * 60 * 1000);
    }
  }
  // Default: 24h from now
  return new Date(now.getTime() + 24 * 60 * 60 * 1000);
}

async function execScheduleTask(args: Record<string, any>, ctx: ToolContext): Promise<string> {
  const nextRun = parseScheduleToNextRun(args.schedule);
  
  const { data, error } = await supabaseAdmin
    .from('scheduled_tasks' as any)
    .insert({
      user_id: ctx.userId,
      name: args.name,
      schedule: args.schedule,
      task_prompt: args.taskPrompt,
      next_run: nextRun.toISOString(),
      delivery: args.delivery || 'in_app',
      enabled: true,
    } as any)
    .select('id, name, next_run')
    .single();
  
  if (error) return JSON.stringify({ error: error.message });
  return JSON.stringify({
    success: true,
    taskId: (data as any)?.id,
    name: args.name,
    nextRun: (data as any)?.next_run,
    message: `Scheduled "${args.name}" — next run: ${nextRun.toLocaleString()}.`,
  });
}

async function execSendNotification(args: Record<string, any>, ctx: ToolContext): Promise<string> {
  const { error } = await supabaseAdmin
    .from('agent_notifications' as any)
    .insert({
      user_id: ctx.userId,
      message: args.message,
      type: args.type || 'info',
      source: 'agent',
    } as any);
  
  if (error) return JSON.stringify({ error: error.message });
  return JSON.stringify({ success: true, message: 'Notification sent.' });
}
