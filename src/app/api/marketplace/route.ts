import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getUserFromRequest } from '@/lib/server-auth';

// GET /api/marketplace - List all published templates (public, paginated)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    
    const offset = (page - 1) * limit;
    
    // Build query
    let query = supabase
      .from('marketplace_templates')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });
    
    // Filter by category if provided
    if (category && ['workflow', 'research', 'monitor', 'automation'].includes(category)) {
      query = query.eq('category', category);
    }
    
    // Search in title and description if provided
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }
    
    // Apply pagination
    query = query.range(offset, offset + limit - 1);
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('Error fetching marketplace templates:', error);
      return NextResponse.json(
        { error: 'Failed to fetch templates' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      templates: data,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Error in marketplace GET route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/marketplace - Publish a template (requires auth)
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { title, description, category, config } = body;
    
    // Validate required fields
    if (!title || !description || !category || !config) {
      return NextResponse.json(
        { error: 'Missing required fields: title, description, category, config' },
        { status: 400 }
      );
    }
    
    // Validate category
    const validCategories = ['workflow', 'research', 'monitor', 'automation'];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category. Must be one of: workflow, research, monitor, automation' },
        { status: 400 }
      );
    }
    
    // Insert template
    const { data, error } = await supabase
      .from('marketplace_templates')
      .insert({
        author_id: user.id,
        author_name: body.author_name || 'Anonymous',
        title,
        description,
        category,
        config
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error publishing template:', error);
      return NextResponse.json(
        { error: 'Failed to publish template' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ template: data }, { status: 201 });
  } catch (error) {
    console.error('Error in marketplace POST route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}