import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/server-auth'
import { executeTool, type ToolContext } from '@/lib/agent-tools'

// Universal tool execution endpoint for Ultron agents
// POST /api/tools { tool: "build_app", args: { name: "...", html: "..." } }
// Auth: Bearer JWT (browser) or X-Ultron-Secret + X-User-Id (Ultron agent)

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { tool, args } = body

  if (!tool || typeof tool !== 'string') {
    return NextResponse.json({ error: 'tool field required' }, { status: 400 })
  }

  const toolCtx: ToolContext = {
    userId: user.id,
    userOpenAIKey: undefined, // Ultron agents use their own keys
  }

  try {
    const result = await executeTool(tool, args || {}, toolCtx)
    
    // Parse the result to return structured JSON
    try {
      const parsed = JSON.parse(result)
      return NextResponse.json(parsed)
    } catch {
      return NextResponse.json({ result })
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// GET /api/tools — list available tools
export async function GET() {
  const tools = [
    'pulsed_research', 'create_artifact', 'update_artifact', 'list_artifacts',
    'web_search', 'memory_save', 'memory_recall', 'schedule_task', 'send_notification',
    'crm_manage_contacts', 'crm_manage_deals', 'crm_log_activity',
    'set_monitor', 'generate_content', 'build_app', 'run_automation',
    'generate_image', 'deploy_app', 'update_app',
  ]
  return NextResponse.json({ tools, count: tools.length })
}
