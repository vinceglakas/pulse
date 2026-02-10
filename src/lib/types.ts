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
