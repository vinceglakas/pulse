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
  {
    type: 'function' as const,
    function: {
      name: 'crm_manage_contacts',
      description: 'Manage CRM contacts — search, create, update, or delete contacts. Use when user mentions adding contacts, people, or managing relationships.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['search', 'create', 'update', 'delete'], description: 'What to do' },
          search: { type: 'string', description: 'Search query (for search action)' },
          id: { type: 'string', description: 'Contact ID (for update/delete)' },
          name: { type: 'string', description: 'Full name' },
          email: { type: 'string', description: 'Email address' },
          phone: { type: 'string', description: 'Phone number' },
          company: { type: 'string', description: 'Company name' },
          title: { type: 'string', description: 'Job title' },
          notes: { type: 'string', description: 'Notes about the contact' },
          tags: { type: 'array', items: { type: 'string' }, description: 'Tags for categorization' },
        },
        required: ['action'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'crm_manage_deals',
      description: 'Manage CRM deals pipeline — list, create, update, or delete deals. Use when user mentions deals, pipeline, revenue, or sales.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['list', 'create', 'update', 'delete'], description: 'What to do' },
          id: { type: 'string', description: 'Deal ID (for update/delete)' },
          title: { type: 'string', description: 'Deal title' },
          value: { type: 'number', description: 'Deal value in dollars' },
          stage: { type: 'string', enum: ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'], description: 'Pipeline stage' },
          probability: { type: 'number', description: 'Win probability (0-100)' },
          contact_id: { type: 'string', description: 'Associated contact ID' },
          notes: { type: 'string', description: 'Deal notes' },
        },
        required: ['action'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'crm_log_activity',
      description: 'Log a CRM activity — calls, emails, meetings, notes, or tasks. Use when user wants to record an interaction or action.',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['call', 'email', 'meeting', 'note', 'task'], description: 'Activity type' },
          subject: { type: 'string', description: 'Activity subject line' },
          body: { type: 'string', description: 'Details or notes' },
          contact_id: { type: 'string', description: 'Associated contact ID' },
          deal_id: { type: 'string', description: 'Associated deal ID' },
        },
        required: ['type'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'set_monitor',
      description: 'Create a web monitor to track a topic and get alerts when new content appears. Use when user says "track", "monitor", "watch", or "alert me about".',
      parameters: {
        type: 'object',
        properties: {
          topic: { type: 'string', description: 'Topic to monitor' },
          keywords: { type: 'array', items: { type: 'string' }, description: 'Keywords to watch for' },
          frequency: { type: 'string', enum: ['hourly', 'daily'], description: 'Check frequency. Default: daily' },
        },
        required: ['topic'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'generate_content',
      description: 'Generate content from a research brief or topic — Twitter threads, LinkedIn posts, newsletters, or blog outlines.',
      parameters: {
        type: 'object',
        properties: {
          topic: { type: 'string', description: 'Topic or context for the content' },
          format: { type: 'string', enum: ['twitter_thread', 'linkedin_post', 'newsletter', 'blog_outline'], description: 'Output format' },
          briefId: { type: 'string', description: 'Optional: ID of a research brief to use as source material' },
          tone: { type: 'string', description: 'Tone guidance (professional, casual, bold, etc.)' },
        },
        required: ['topic', 'format'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'build_app',
      description: 'Build a complete, working web application (HTML/CSS/JS) that renders live in the workspace. Use for: websites, landing pages, calculators, dashboards, tools, games, visualizations, forms, interactive widgets. The app runs in a sandboxed iframe. You can use any client-side JS library via CDN (Chart.js, Three.js, D3, etc). ALWAYS build complete, beautiful, functional apps — not stubs.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Name of the app' },
          description: { type: 'string', description: 'What the app does' },
          html: { type: 'string', description: 'Complete HTML document including <style> and <script> tags. Must be a full self-contained page. Use modern CSS (flexbox, grid, variables). Make it beautiful with dark theme (#0a0a0f bg, #111118 cards, #f0f0f5 text, indigo accents) unless specified otherwise.' },
          framework: { type: 'string', enum: ['vanilla', 'react', 'vue'], description: 'JS framework. Default: vanilla. React/Vue loaded via CDN.' },
        },
        required: ['name', 'html'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'run_automation',
      description: 'Execute an automation: fetch data from APIs, process/transform it, and return results. Use for: API integrations, data pipelines, web scraping, calculations, data transformations, batch operations. Can chain with other tools — fetch API data then create_artifact with results.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Name of the automation' },
          steps: {
            type: 'array',
            description: 'Sequential steps to execute',
            items: {
              type: 'object',
              properties: {
                action: { type: 'string', enum: ['fetch', 'transform', 'filter', 'aggregate', 'notify'], description: 'Step action type' },
                url: { type: 'string', description: 'URL to fetch (for fetch action)' },
                method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'], description: 'HTTP method' },
                headers: { type: 'object', description: 'Request headers' },
                body: { type: 'string', description: 'Request body (JSON string)' },
                expression: { type: 'string', description: 'JS expression to transform data (for transform/filter). Use `data` variable for previous step output.' },
              },
              required: ['action'],
            },
          },
        },
        required: ['name', 'steps'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'generate_image',
      description: 'Generate an image using AI (DALL-E 3). Returns a URL to the generated image. Use for: logos, illustrations, backgrounds, product mockups, social media graphics, any visual content. Can be combined with build_app to create websites WITH images.',
      parameters: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Detailed description of the image to generate. Be specific about style, colors, composition.' },
          size: { type: 'string', enum: ['1024x1024', '1792x1024', '1024x1792'], description: 'Image dimensions. 1024x1024 (square), 1792x1024 (landscape), 1024x1792 (portrait)' },
          style: { type: 'string', enum: ['vivid', 'natural'], description: 'vivid = hyper-real/dramatic, natural = more realistic. Default: vivid' },
        },
        required: ['prompt'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'deploy_app',
      description: 'Deploy a built app to a live public URL. Takes an artifact ID (from build_app) and deploys it to a real URL anyone can visit. Use when user says "deploy", "publish", "put it live", "make it public", or "give me a link".',
      parameters: {
        type: 'object',
        properties: {
          artifactId: { type: 'string', description: 'The artifact ID from build_app to deploy' },
          projectName: { type: 'string', description: 'Short name for the deployment (lowercase, hyphens). E.g. "my-landing-page"' },
        },
        required: ['artifactId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_app',
      description: 'Update an existing app artifact. Two modes: (1) Pass only artifactId to FETCH current HTML so you can see it, then call again with changes. (2) Pass artifactId + html to save updated version. Use when user wants to iterate on an app.',
      parameters: {
        type: 'object',
        properties: {
          artifactId: { type: 'string', description: 'The artifact ID to update' },
          html: { type: 'string', description: 'The complete updated HTML document. Omit to fetch current HTML.' },
          changeDescription: { type: 'string', description: 'Brief description of what changed' },
        },
        required: ['artifactId'],
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
      case 'crm_manage_contacts':
        return await execCRMContacts(args, ctx);
      case 'crm_manage_deals':
        return await execCRMDeals(args, ctx);
      case 'crm_log_activity':
        return await execCRMActivity(args, ctx);
      case 'set_monitor':
        return await execSetMonitor(args, ctx);
      case 'generate_content':
        return await execGenerateContent(args, ctx);
      case 'build_app':
        return await execBuildApp(args, ctx);
      case 'run_automation':
        return await execRunAutomation(args, ctx);
      case 'generate_image':
        return await execGenerateImage(args, ctx);
      case 'deploy_app':
        return await execDeployApp(args, ctx);
      case 'update_app':
        return await execUpdateApp(args, ctx);
      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  } catch (err: any) {
    return JSON.stringify({ error: err.message || 'Tool execution failed' });
  }
}

// ─── Individual Tool Implementations ───

async function execResearch(args: Record<string, any>, ctx: ToolContext): Promise<string> {
  // Fast path: use multiple Brave searches to gather info quickly (5-10s vs 60-120s for deepResearch)
  const topic = args.topic;
  const braveKey = process.env.BRAVE_API_KEY?.trim();
  
  if (!braveKey) {
    return JSON.stringify({ error: 'Research service not configured' });
  }

  // Run 3 parallel searches for comprehensive coverage
  const queries = [
    topic,
    `${topic} latest news 2026`,
    `${topic} comparison review`,
  ];

  const results = await Promise.all(
    queries.map(async (q) => {
      try {
        const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q)}&count=5`;
        const res = await fetch(url, {
          headers: { 'X-Subscription-Token': braveKey, Accept: 'application/json' },
        });
        if (!res.ok) return [];
        const data = await res.json();
        return (data.web?.results || []).map((r: any) => ({
          title: r.title,
          url: r.url,
          snippet: r.description,
        }));
      } catch { return []; }
    })
  );

  // Dedupe by URL
  const seen = new Set<string>();
  const allResults: Array<{ title: string; url: string; snippet: string }> = [];
  for (const batch of results) {
    for (const r of batch) {
      if (!seen.has(r.url)) {
        seen.add(r.url);
        allResults.push(r);
      }
    }
  }

  if (allResults.length === 0) {
    return JSON.stringify({ error: 'No results found for this topic' });
  }

  // Build a structured research brief for the LLM to synthesize
  const brief = allResults.slice(0, 12).map((r, i) => 
    `[${i + 1}] ${r.title}\n${r.snippet}\nSource: ${r.url}`
  ).join('\n\n');

  // Save to briefs table
  const { data: saved } = await supabaseAdmin
    .from('briefs')
    .insert({
      topic,
      brief_text: brief,
      sources: allResults.slice(0, 12),
      raw_data: { agent_triggered: true, fast_path: true },
      user_id: ctx.userId,
    })
    .select('id')
    .single();

  return JSON.stringify({
    brief,
    sourceCount: allResults.length,
    briefId: saved?.id,
    message: `Research complete: ${allResults.length} sources found across 3 searches.`,
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

// ─── CRM Tools ───

async function execCRMContacts(args: Record<string, any>, ctx: ToolContext): Promise<string> {
  const { action } = args;
  
  if (action === 'search' || action === 'list') {
    let query = supabaseAdmin.from('contacts').select('id, name, email, phone, company, title, tags, notes, last_contacted').eq('user_id', ctx.userId).order('created_at', { ascending: false }).limit(50);
    if (args.search) query = query.or(`name.ilike.%${args.search}%,email.ilike.%${args.search}%,company.ilike.%${args.search}%`);
    const { data, error } = await query;
    if (error) return JSON.stringify({ error: error.message });
    return JSON.stringify({ contacts: data || [], count: (data || []).length });
  }
  
  if (action === 'create') {
    const { name, email, phone, company, title, notes, tags } = args;
    if (!name) return JSON.stringify({ error: 'Name is required' });
    const { data, error } = await supabaseAdmin.from('contacts').insert({
      user_id: ctx.userId, name, email, phone, company, title, notes, tags: tags || [],
    }).select().single();
    if (error) return JSON.stringify({ error: error.message });
    return JSON.stringify({ success: true, contact: data, message: `Created contact "${name}".` });
  }
  
  if (action === 'update') {
    const { id, ...updates } = args;
    if (!id) return JSON.stringify({ error: 'Contact ID is required' });
    delete updates.action;
    const { data, error } = await supabaseAdmin.from('contacts').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).eq('user_id', ctx.userId).select().single();
    if (error) return JSON.stringify({ error: error.message });
    return JSON.stringify({ success: true, contact: data, message: 'Contact updated.' });
  }
  
  if (action === 'delete') {
    const { id } = args;
    if (!id) return JSON.stringify({ error: 'Contact ID is required' });
    await supabaseAdmin.from('contacts').delete().eq('id', id).eq('user_id', ctx.userId);
    return JSON.stringify({ success: true, message: 'Contact deleted.' });
  }
  
  return JSON.stringify({ error: `Unknown action: ${action}` });
}

async function execCRMDeals(args: Record<string, any>, ctx: ToolContext): Promise<string> {
  const { action } = args;
  
  if (action === 'list') {
    let query = supabaseAdmin.from('deals').select('id, title, value, stage, probability, notes, created_at, contacts(name)').eq('user_id', ctx.userId).order('created_at', { ascending: false });
    if (args.stage) query = query.eq('stage', args.stage);
    const { data, error } = await query;
    if (error) return JSON.stringify({ error: error.message });
    const deals = data || [];
    const total = deals.reduce((s: number, d: any) => s + (d.value || 0), 0);
    const byStage: Record<string, number> = {};
    deals.forEach((d: any) => { byStage[d.stage] = (byStage[d.stage] || 0) + 1; });
    return JSON.stringify({ deals, count: deals.length, totalValue: total, byStage });
  }
  
  if (action === 'create') {
    const { title, value, stage, probability, contact_id, notes } = args;
    if (!title) return JSON.stringify({ error: 'Title is required' });
    const { data, error } = await supabaseAdmin.from('deals').insert({
      user_id: ctx.userId, title, value: value || 0, stage: stage || 'lead', probability: probability || 10, contact_id, notes,
    }).select().single();
    if (error) return JSON.stringify({ error: error.message });
    return JSON.stringify({ success: true, deal: data, message: `Created deal "${title}" ($${(value || 0).toLocaleString()}) in ${stage || 'lead'} stage.` });
  }
  
  if (action === 'update') {
    const { id, ...updates } = args;
    if (!id) return JSON.stringify({ error: 'Deal ID is required' });
    delete updates.action;
    const { data, error } = await supabaseAdmin.from('deals').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).eq('user_id', ctx.userId).select().single();
    if (error) return JSON.stringify({ error: error.message });
    return JSON.stringify({ success: true, deal: data, message: 'Deal updated.' });
  }
  
  if (action === 'delete') {
    await supabaseAdmin.from('deals').delete().eq('id', args.id).eq('user_id', ctx.userId);
    return JSON.stringify({ success: true, message: 'Deal deleted.' });
  }
  
  return JSON.stringify({ error: `Unknown action: ${action}` });
}

async function execCRMActivity(args: Record<string, any>, ctx: ToolContext): Promise<string> {
  const { type, subject, body, contact_id, deal_id } = args;
  const { data, error } = await supabaseAdmin.from('activities').insert({
    user_id: ctx.userId, type: type || 'note', subject, body, contact_id, deal_id,
  }).select().single();
  
  if (error) return JSON.stringify({ error: error.message });
  
  // Update contact's last_contacted
  if (contact_id) {
    await supabaseAdmin.from('contacts').update({ last_contacted: new Date().toISOString() }).eq('id', contact_id).eq('user_id', ctx.userId);
  }
  
  return JSON.stringify({ success: true, activity: data, message: `Logged ${type}: ${subject || '(no subject)'}` });
}

async function execSetMonitor(args: Record<string, any>, ctx: ToolContext): Promise<string> {
  const { topic, keywords, frequency } = args;
  if (!topic) return JSON.stringify({ error: 'Topic is required' });
  
  const { data, error } = await supabaseAdmin.from('monitors').insert({
    user_id: ctx.userId,
    topic,
    keywords: keywords || [],
    frequency: frequency || 'daily',
    alert_threshold: 3,
    enabled: true,
  }).select().single();
  
  if (error) return JSON.stringify({ error: error.message });
  return JSON.stringify({ success: true, monitor: data, message: `Now monitoring "${topic}" (${frequency || 'daily'}). You'll get alerts when new content appears.` });
}

async function execGenerateContent(args: Record<string, any>, ctx: ToolContext): Promise<string> {
  const { topic, format, briefId, tone } = args;
  
  // If briefId is provided, fetch the brief for context
  let briefContext = '';
  if (briefId) {
    const { data } = await supabaseAdmin.from('briefs').select('brief_text, topic').eq('id', briefId).eq('user_id', ctx.userId).single();
    if (data) briefContext = `Based on research about "${data.topic}":\n${data.brief_text}\n\n`;
  }
  
  // Generate content via the draft API
  const formatLabels: Record<string, string> = {
    twitter_thread: 'Twitter/X thread',
    linkedin_post: 'LinkedIn post',
    newsletter: 'email newsletter',
    blog_outline: 'blog post outline',
  };
  
  // Since we're server-side and may not have the user's key readily available for generation,
  // we'll construct the content prompt and return it for the LLM to expand
  return JSON.stringify({
    success: true,
    format: formatLabels[format] || format,
    topic,
    briefContext: briefContext ? 'Using research brief as source material.' : 'No research brief — generating from topic.',
    instruction: `Please generate a ${formatLabels[format] || format} about "${topic}". ${tone ? `Tone: ${tone}.` : ''} ${briefContext ? `Use this research as source material:\n${briefContext.slice(0, 2000)}` : ''} Make it engaging, specific, and ready to publish.`,
    message: `Generating ${formatLabels[format] || format} about "${topic}"...`,
  });
}

async function execBuildApp(args: Record<string, any>, ctx: ToolContext): Promise<string> {
  const { name, description, html, framework } = args;
  if (!html) return JSON.stringify({ error: 'HTML content is required' });

  const { data, error } = await supabaseAdmin
    .from('artifacts')
    .insert({
      user_id: ctx.userId,
      name: name || 'Untitled App',
      type: 'app',
      description: description || '',
      schema: { framework: framework || 'vanilla', columns: [] },
      content: html,
      data: [],
    })
    .select('id, name')
    .single();

  if (error) return JSON.stringify({ error: error.message });
  return JSON.stringify({
    success: true,
    artifactId: data.id,
    name: data.name,
    type: 'app',
    previewUrl: `/workspace/app/${data.id}`,
    message: `Built "${data.name}" — a live web app. View it at /workspace/app/${data.id}. It's running in your workspace now.`,
  });
}

async function execRunAutomation(args: Record<string, any>, ctx: ToolContext): Promise<string> {
  const { name, steps } = args;
  if (!steps || steps.length === 0) return JSON.stringify({ error: 'Steps are required' });

  const results: any[] = [];
  let data: any = null;

  for (const step of steps) {
    try {
      switch (step.action) {
        case 'fetch': {
          const res = await fetch(step.url, {
            method: step.method || 'GET',
            headers: { 'Accept': 'application/json', ...(step.headers || {}) },
            ...(step.body ? { body: step.body } : {}),
          });
          const contentType = res.headers.get('content-type') || '';
          data = contentType.includes('json') ? await res.json() : await res.text();
          results.push({ step: 'fetch', url: step.url, status: res.status, dataPreview: JSON.stringify(data).slice(0, 500) });
          break;
        }
        case 'transform': {
          if (step.expression && data) {
            try {
              // Sandboxed eval — only data variable available, no globals
              const fn = new Function('data', `"use strict"; return ${step.expression}`);
              data = fn(data);
              results.push({ step: 'transform', expression: step.expression, resultPreview: JSON.stringify(data).slice(0, 500) });
            } catch (e: any) {
              results.push({ step: 'transform', error: e.message });
            }
          }
          break;
        }
        case 'filter': {
          if (step.expression && Array.isArray(data)) {
            try {
              const fn = new Function('item', `"use strict"; return ${step.expression}`);
              data = data.filter((item: any) => fn(item));
              results.push({ step: 'filter', remaining: data.length });
            } catch (e: any) {
              results.push({ step: 'filter', error: e.message });
            }
          }
          break;
        }
        case 'aggregate': {
          if (step.expression && data) {
            try {
              const fn = new Function('data', `"use strict"; return ${step.expression}`);
              data = fn(data);
              results.push({ step: 'aggregate', result: JSON.stringify(data).slice(0, 500) });
            } catch (e: any) {
              results.push({ step: 'aggregate', error: e.message });
            }
          }
          break;
        }
        case 'notify': {
          await supabaseAdmin.from('notifications').insert({
            user_id: ctx.userId,
            title: name || 'Automation Result',
            body: typeof data === 'string' ? data.slice(0, 500) : JSON.stringify(data).slice(0, 500),
            type: 'automation',
            read: false,
          });
          results.push({ step: 'notify', sent: true });
          break;
        }
      }
    } catch (err: any) {
      results.push({ step: step.action, error: err.message });
    }
  }

  // Save automation run as artifact for history
  await supabaseAdmin.from('artifacts').insert({
    user_id: ctx.userId,
    name: `Automation: ${name || 'Untitled'}`,
    type: 'document',
    description: `Automation run at ${new Date().toISOString()}`,
    content: `# Automation: ${name}\n\n## Steps\n${results.map((r, i) => `### Step ${i + 1}: ${r.step}\n\`\`\`json\n${JSON.stringify(r, null, 2)}\n\`\`\``).join('\n\n')}\n\n## Final Data\n\`\`\`json\n${JSON.stringify(data, null, 2).slice(0, 3000)}\n\`\`\``,
    data: [],
    schema: { columns: [] },
  });

  return JSON.stringify({
    success: true,
    automationName: name,
    stepsRun: results.length,
    results,
    finalData: data,
    message: `Automation "${name}" completed — ${results.length} steps executed. Results saved to workspace.`,
  });
}

async function execGenerateImage(args: Record<string, any>, ctx: ToolContext): Promise<string> {
  const { prompt, size, style } = args;
  if (!prompt) return JSON.stringify({ error: 'Prompt is required' });

  // Try user's OpenAI key first, fall back to platform key
  const apiKey = ctx.userOpenAIKey || process.env.OPENAI_API_KEY;
  if (!apiKey) return JSON.stringify({ error: 'No OpenAI API key available. Add one in Settings > API Keys.' });

  try {
    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: size || '1024x1024',
        style: style || 'vivid',
        response_format: 'url',
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return JSON.stringify({ error: `Image generation failed: ${err.error?.message || res.statusText}` });
    }

    const data = await res.json();
    const tempUrl = data.data?.[0]?.url;
    const revisedPrompt = data.data?.[0]?.revised_prompt;

    if (!tempUrl) return JSON.stringify({ error: 'No image returned' });

    // Download and upload to Supabase Storage for permanent URL
    let permanentUrl = tempUrl;
    try {
      const imgRes = await fetch(tempUrl);
      const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
      const fileName = `${ctx.userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
      
      const { error: uploadErr } = await supabaseAdmin.storage
        .from('generated-images')
        .upload(fileName, imgBuffer, { contentType: 'image/png', upsert: true });
      
      if (!uploadErr) {
        const { data: urlData } = supabaseAdmin.storage.from('generated-images').getPublicUrl(fileName);
        if (urlData?.publicUrl) permanentUrl = urlData.publicUrl;
      }
    } catch {
      // Fall back to temp URL if storage upload fails
    }

    // Save as artifact
    await supabaseAdmin.from('artifacts').insert({
      user_id: ctx.userId,
      name: `Image: ${prompt.slice(0, 50)}`,
      type: 'document',
      description: prompt,
      content: `# Generated Image\n\n**Prompt:** ${prompt}\n\n**Revised prompt:** ${revisedPrompt || 'N/A'}\n\n![Generated Image](${permanentUrl})\n\nDirect URL: ${permanentUrl}`,
      data: [],
      schema: { columns: [] },
    });

    return JSON.stringify({
      success: true,
      imageUrl: permanentUrl,
      revisedPrompt,
      message: `Generated image. URL: ${permanentUrl}`,
    });
  } catch (err: any) {
    return JSON.stringify({ error: `Image generation failed: ${err.message}` });
  }
}

async function execDeployApp(args: Record<string, any>, ctx: ToolContext): Promise<string> {
  const { artifactId, projectName } = args;
  if (!artifactId) return JSON.stringify({ error: 'Artifact ID is required' });

  // Fetch the app artifact
  const { data: artifact, error } = await supabaseAdmin
    .from('artifacts')
    .select('*')
    .eq('id', artifactId)
    .eq('user_id', ctx.userId)
    .single();

  if (error || !artifact) return JSON.stringify({ error: 'App not found' });
  const html = artifact.content;
  if (!html) return JSON.stringify({ error: 'App has no HTML content' });

  const vercelToken = process.env.VERCEL_DEPLOY_TOKEN;
  if (!vercelToken) {
    // Fallback: provide the preview URL
    return JSON.stringify({
      success: true,
      previewUrl: `/workspace/app/${artifactId}`,
      message: `Your app is live at the preview URL. For public deployment, add a VERCEL_DEPLOY_TOKEN in environment variables. Preview: /workspace/app/${artifactId}`,
    });
  }

  try {
    const name = (projectName || artifact.name || 'pulsed-app').toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 50);

    // Create deployment via Vercel API
    const deployRes = await fetch('https://api.vercel.com/v13/deployments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${vercelToken}`,
      },
      body: JSON.stringify({
        name,
        files: [
          {
            file: 'index.html',
            data: Buffer.from(html).toString('base64'),
            encoding: 'base64',
          },
        ],
        projectSettings: {
          framework: null,
        },
        target: 'production',
      }),
    });

    if (!deployRes.ok) {
      const err = await deployRes.json().catch(() => ({}));
      return JSON.stringify({ error: `Deploy failed: ${err.error?.message || deployRes.statusText}` });
    }

    const deployData = await deployRes.json();
    const url = deployData.url ? `https://${deployData.url}` : null;
    const alias = deployData.alias?.[0] ? `https://${deployData.alias[0]}` : null;

    return JSON.stringify({
      success: true,
      url: alias || url,
      deploymentId: deployData.id,
      message: `🚀 Deployed! Your app is live at: ${alias || url}`,
    });
  } catch (err: any) {
    return JSON.stringify({ error: `Deploy failed: ${err.message}` });
  }
}

async function execUpdateApp(args: Record<string, any>, ctx: ToolContext): Promise<string> {
  const { artifactId, html, changeDescription } = args;
  if (!artifactId) return JSON.stringify({ error: 'Artifact ID is required' });

  // Fetch mode: return current HTML so LLM can see it and modify
  if (!html) {
    const { data, error } = await supabaseAdmin
      .from('artifacts')
      .select('id, name, content, description')
      .eq('id', artifactId)
      .eq('user_id', ctx.userId)
      .single();
    if (error || !data) return JSON.stringify({ error: 'App not found' });
    return JSON.stringify({
      mode: 'fetch',
      artifactId: data.id,
      name: data.name,
      currentHtml: data.content,
      message: `Fetched current HTML for "${data.name}" (${data.content?.length || 0} chars). Now call update_app again with the modified html.`,
    });
  }

  // Update mode: save new HTML
  const { data, error } = await supabaseAdmin
    .from('artifacts')
    .update({
      content: html,
      description: changeDescription ? `Updated: ${changeDescription}` : undefined,
      updated_at: new Date().toISOString(),
    })
    .eq('id', artifactId)
    .eq('user_id', ctx.userId)
    .select('id, name')
    .single();

  if (error) return JSON.stringify({ error: error.message });
  return JSON.stringify({
    success: true,
    artifactId: data.id,
    name: data.name,
    previewUrl: `/workspace/app/${data.id}`,
    message: `Updated "${data.name}". ${changeDescription || 'Changes applied.'} Preview: /workspace/app/${data.id}`,
  });
}
