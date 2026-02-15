import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('telegram_chat_id, telegram_username')
      .eq('id', supabase.auth.getUser(token).then(r => r.data.user?.id))
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({
      linked: !!profile.telegram_chat_id,
      username: profile.telegram_username || null,
      chat_id: profile.telegram_chat_id || null,
    });
  } catch (error) {
    console.error('Telegram status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}