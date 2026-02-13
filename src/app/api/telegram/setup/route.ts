import { NextRequest, NextResponse } from 'next/server';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || '';
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

const WEBHOOK_BASE_URL = 'https://www.runpulsed.ai/api/telegram/webhook';

export async function GET(req: NextRequest) {
  if (!TELEGRAM_BOT_TOKEN) {
    return NextResponse.json(
      { error: 'TELEGRAM_BOT_TOKEN is not configured' },
      { status: 500 }
    );
  }

  // Build webhook URL with secret query param for verification
  const webhookUrl = TELEGRAM_WEBHOOK_SECRET
    ? `${WEBHOOK_BASE_URL}?secret=${TELEGRAM_WEBHOOK_SECRET}`
    : WEBHOOK_BASE_URL;

  try {
    // Set the webhook
    const setRes = await fetch(`${TELEGRAM_API}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message'], // Only receive message updates
        drop_pending_updates: true,   // Don't process old messages on setup
      }),
    });

    const setData = await setRes.json();

    if (!setData.ok) {
      return NextResponse.json(
        { error: 'Failed to set webhook', details: setData },
        { status: 500 }
      );
    }

    // Get webhook info to confirm
    const infoRes = await fetch(`${TELEGRAM_API}/getWebhookInfo`);
    const infoData = await infoRes.json();

    return NextResponse.json({
      success: true,
      message: 'Webhook registered successfully',
      webhook: {
        url: WEBHOOK_BASE_URL, // Don't expose the secret in the response
        has_secret: !!TELEGRAM_WEBHOOK_SECRET,
        pending_update_count: infoData.result?.pending_update_count || 0,
      },
    });
  } catch (error: any) {
    console.error('Telegram setup error:', error);
    return NextResponse.json(
      { error: 'Failed to register webhook', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE handler to remove webhook (useful for debugging)
export async function DELETE() {
  if (!TELEGRAM_BOT_TOKEN) {
    return NextResponse.json(
      { error: 'TELEGRAM_BOT_TOKEN is not configured' },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(`${TELEGRAM_API}/deleteWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ drop_pending_updates: true }),
    });

    const data = await res.json();

    return NextResponse.json({
      success: data.ok,
      message: data.ok ? 'Webhook removed' : 'Failed to remove webhook',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to remove webhook', details: error.message },
      { status: 500 }
    );
  }
}
