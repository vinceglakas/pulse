export type Persona = 'marketer' | 'creator' | 'sales' | 'product' | 'founder' | 'analyst'

export const PERSONAS: Record<Persona, { label: string; description: string; icon: string }> = {
  marketer: { label: 'Marketer', description: 'Campaigns, positioning, audience targeting', icon: 'M3 3h7v7H3V3zm11 0h7v7h-7V3zm-11 11h7v7H3v-7zm11 0h7v7h-7v-7z' },
  creator: { label: 'Content Creator', description: 'Hooks, viral angles, trending formats', icon: 'M12 19l7-7 3 3-7 7-3-3zm-5.5-2.5l-4-4 9-9 4 4-9 9zM2 22l1.5-4.5L7 21l-5 1z' },
  sales: { label: 'Sales', description: 'Talking points, prospect intel, objections', icon: 'M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6' },
  product: { label: 'Product Manager', description: 'Market gaps, user needs, feature ideas', icon: 'M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z' },
  founder: { label: 'Founder / Executive', description: 'Strategic signals, market direction', icon: 'M22 12h-4l-3 9L9 3l-3 9H2' },
  analyst: { label: 'Analyst / Researcher', description: 'Deep data, patterns, full landscape', icon: 'M18 20V10M12 20V4M6 20v-6' },
}

export interface SourcePost {
  title: string
  url: string
  source: 'reddit' | 'hackernews' | 'youtube' | 'web' | 'x'
  subreddit?: string
  score: number
  comments: number
  created_at: string
  body?: string
  comment_insights?: string[]
  upvote_ratio?: number
}

export interface ResearchRequest {
  topic: string
  apiKey?: string
  persona?: Persona
}

export interface ResearchStats {
  reddit_threads: number
  reddit_upvotes: number
  reddit_comments: number
  hn_stories: number
  hn_points: number
  youtube_videos: number
  web_pages: number
  x_posts: number
}

export interface ResearchResponse {
  id: string | null
  topic: string
  brief: string
  sources: SourcePost[]
  stats?: ResearchStats
  persona?: Persona
  created_at: string
}

export interface Brief {
  id: string
  topic: string
  brief_text: string
  sources: SourcePost[]
  raw_data: {
    stats: ResearchStats
  }
  user_id: string | null
  created_at: string
}

export interface StructuredBrief {
  executive_summary: string
  key_themes: string[]
  sentiment: { positive: number; neutral: number; negative: number }
  recommended_actions: string[]
  follow_up_queries: string[]
}
