import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'

export const runtime = 'nodejs'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (!id || !UUID_REGEX.test(id)) {
    return new Response('Invalid ID', { status: 400 })
  }

  const { data } = await supabase
    .from('briefs')
    .select('topic, sources')
    .eq('id', id)
    .single()

  const topic = data?.topic ?? 'Research Brief'
  const sourceCount = Array.isArray(data?.sources) ? data.sources.length : 0

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '60px 70px',
          background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #a855f7 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Top: branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              color: 'white',
              fontWeight: 700,
            }}
          >
            P
          </div>
          <span style={{ fontSize: '28px', fontWeight: 700, color: 'white' }}>
            Pulsed
          </span>
        </div>

        {/* Middle: topic */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              fontSize: topic.length > 60 ? '42px' : '52px',
              fontWeight: 800,
              color: 'white',
              lineHeight: 1.15,
              maxWidth: '1000px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {topic.length > 100 ? topic.slice(0, 97) + '...' : topic}
          </div>
        </div>

        {/* Bottom: source count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(255,255,255,0.15)',
              borderRadius: '9999px',
              padding: '8px 20px',
              fontSize: '18px',
              color: 'rgba(255,255,255,0.9)',
              fontWeight: 600,
            }}
          >
            AI-powered intelligence brief
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
