import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const TELEGRAM_BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

export async function POST(req: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    
    // Get user profile with telegram_chat_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('telegram_chat_id, telegram_username')
      .eq('id', supabase.auth.getUser(token).then(r => r.data.user?.id))
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (!profile.telegram_chat_id) {
      return NextResponse.json({ error: 'Telegram not connected' }, { status: 400 });
    }

    // Send test message
    const message = "🎉 Your Pulsed agent is connected! Send me a message to get started.";
    
    const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: profile.telegram_chat_id,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Telegram API error:', error);
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Test message error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}