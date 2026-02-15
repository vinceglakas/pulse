import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getUserFromRequest } from '@/lib/server-auth';

// POST /api/marketplace/install - Install/clone a template into user's workspace
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
    const { template_id } = body;
    
    if (!template_id) {
      return NextResponse.json(
        { error: 'Missing required field: template_id' },
        { status: 400 }
      );
    }
    
    // Fetch the template
    const { data: template, error: templateError } = await supabase
      .from('marketplace_templates')
      .select('*')
      .eq('id', template_id)
      .single();
    
    if (templateError || !template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }
    
    // Determine where to save based on category
    let insertData = {
      user_id: user.id,
      name: template.title,
      description: template.description,
      config: template.config,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    let tableName: string;
    let errorMessage: string;
    
    switch (template.category) {
      case 'workflow':
        tableName = 'workflows';
        errorMessage = 'Failed to install workflow';
        break;
      case 'research':
        tableName = 'research_configs';
        errorMessage = 'Failed to install research configuration';
        break;
      case 'monitor':
        tableName = 'monitors';
        errorMessage = 'Failed to install monitor';
        break;
      case 'automation':
        tableName = 'automations';
        errorMessage = 'Failed to install automation';
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid template category' },
          { status: 400 }
        );
    }
    
    // Insert the cloned configuration
    const { data: clonedItem, error: insertError } = await supabase
      .from(tableName)
      .insert(insertData)
      .select()
      .single();
    
    if (insertError) {
      console.error(`Error installing template:`, insertError);
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }
    
    // Increment install count
    await supabase.rpc('increment_install_count', { template_id });
    
    return NextResponse.json({
      message: 'Template installed successfully',
      item: clonedItem,
      category: template.category
    });
  } catch (error) {
    console.error('Error in marketplace install route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}