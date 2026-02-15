import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { decrypt } from '@/lib/encryption';

const TELEGRAM_BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
const TELEGRAM_WEBHOOK_SECRET = (process.env.TELEGRAM_WEBHOOK_SECRET || '').trim();
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

const ULTRON_URL = process.env.ULTRON_URL || 'https://ultron-engine.fly.dev';
const ULTRON_SECRET = process.env.ULTRON_API_SECRET || '';

// ---------------------------------------------------------------------------
// Rate limiting — simple in-memory counter (resets on cold start, fine for v1)
// ---------------------------------------------------------------------------
const rateLimitMap = new Map<number, { count: number; windowStart: number }>();
const RATE_LIMIT_MAX = 10; // messages per window
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute

function isRateLimited(chatId: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(chatId);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(chatId, { count: 1, windowStart: now });
    return false;
  }

  entry.count += 1;
  if (entry.count > RATE_LIMIT_MAX) {
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Telegram helpers
// ---------------------------------------------------------------------------
async function sendTelegramMessage(chatId: number, text: string, parseMode = 'Markdown') {
  // Telegram limits messages to 4096 chars
  const chunks = splitMessage(text, 4096);
  for (const chunk of chunks) {
    const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: chunk,
        parse_mode: parseMode,
      }),
    });

    // If Markdown parse fails, retry without parse_mode
    if (!res.ok && parseMode === 'Markdown') {
      await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: chunk,
        }),
      });
    }
  }
}

function splitMessage(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining);
      break;
    }

    // Try to split at the last newline within the limit
    let splitIdx = remaining.lastIndexOf('\n', maxLen);
    if (splitIdx <= 0) {
      // Fall back to last space
      splitIdx = remaining.lastIndexOf(' ', maxLen);
    }
    if (splitIdx <= 0) {
      // Hard split
      splitIdx = maxLen;
    }

    chunks.push(remaining.slice(0, splitIdx));
    remaining = remaining.slice(splitIdx).trimStart();
  }

  return chunks;
}

async function sendTypingAction(chatId: number) {
  await fetch(`${TELEGRAM_API}/sendChatAction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, action: 'typing' }),
  }).catch(() => {}); // best-effort
}

// ---------------------------------------------------------------------------
// User lookup — matches by telegram_chat_id or telegram_username
// ---------------------------------------------------------------------------
interface UserProfile {
  id: string;
  plan: string;
  telegram_chat_id: number | null;
  telegram_username: string | null;
}

async function findUserByChatId(chatId: number): Promise<UserProfile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('id, plan, telegram_chat_id, telegram_username')
    .eq('telegram_chat_id', chatId)
    .single();

  return data as UserProfile | null;
}

async function findUserByUsername(username: string): Promise<UserProfile | null> {
  // Strip leading @ if present, and search case-insensitively
  const clean = username.replace(/^@/, '').toLowerCase();

  const { data } = await supabase
    .from('profiles')
    .select('id, plan, telegram_chat_id, telegram_username')
    .ilike('telegram_username', clean)
    .single();

  return data as UserProfile | null;
}

async function linkChatIdToProfile(profileId: string, chatId: number) {
  await supabase
    .from('profiles')
    .update({ telegram_chat_id: chatId })
    .eq('id', profileId);
}

// ---------------------------------------------------------------------------
// Agent interaction — calls Ultron (non-streaming for Telegram)
// ---------------------------------------------------------------------------
async function callAgent(userId: string, message: string): Promise<string> {
  // Get the user's API key
  const { data: keys } = await supabase
    .from('api_keys')
    .select('id, provider, encrypted_key')
    .eq('user_id', userId)
    .limit(1)
    .single();

  if (!keys) {
    return '⚠️ No API key configured. Add one at runpulsed.ai/settings/keys';
  }

  const apiKey = decrypt(keys.encrypted_key);
  const provider = keys.provider;

  // Check if agent is already running
  const statusRes = await fetch(`${ULTRON_URL}/api/agent/status/${userId}`, {
    headers: { Authorization: `Bearer ${ULTRON_SECRET}` },
  });
  const statusData = await statusRes.json().catch(() => ({ running: false }));

  // Spawn agent if not running
  if (!statusData.running) {
    const spawnRes = await fetch(`${ULTRON_URL}/api/agent/spawn`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ULTRON_SECRET}`,
      },
      body: JSON.stringify({ userId, apiKey, provider }),
    });

    if (!spawnRes.ok) {
      return '⚠️ Failed to start your agent. Please try again in a moment.';
    }

    // Give agent a moment to start
    await new Promise((r) => setTimeout(r, 3000));
  }

  // Send message to Ultron — this returns an SSE stream
  const chatRes = await fetch(`${ULTRON_URL}/api/agent/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ULTRON_SECRET}`,
    },
    body: JSON.stringify({ userId, message, sessionKey: 'telegram' }),
  });

  if (!chatRes.ok) {
    const errText = await chatRes.text().catch(() => 'Unknown error');
    console.error('Ultron chat error:', chatRes.status, errText);
    return '⚠️ Agent returned an error. Please try again.';
  }

  // Collect the full SSE stream into a single response
  return await collectSSEResponse(chatRes);
}

async function collectSSEResponse(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return '⚠️ No response from agent.';

  const decoder = new TextDecoder();
  let fullText = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });

      // Parse SSE events — format: "data: {...}\n\n"
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();

        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          // Handle different SSE event formats from Ultron
          if (parsed.content) {
            fullText += parsed.content;
          } else if (parsed.text) {
            fullText += parsed.text;
          } else if (parsed.delta?.content) {
            fullText += parsed.delta.content;
          } else if (typeof parsed === 'string') {
            fullText += parsed;
          }
        } catch {
          // Not JSON — might be a plain text chunk
          if (data && data !== '[DONE]') {
            fullText += data;
          }
        }
      }
    }
  } catch (err) {
    console.error('Error reading SSE stream:', err);
  } finally {
    reader.releaseLock();
  }

  return fullText.trim() || '⚠️ Agent returned an empty response.';
}

// ---------------------------------------------------------------------------
// Save messages to agent_messages for history continuity
// ---------------------------------------------------------------------------
async function saveMessage(userId: string, role: 'user' | 'assistant', content: string) {
  await supabase
    .from('agent_messages')
    .insert({
      user_id: userId,
      session_key: 'telegram',
      role,
      content,
    })
    .then(({ error }) => {
      if (error) console.error('Failed to save agent message:', error.message);
    });
}

// ---------------------------------------------------------------------------
// Command handlers
// ---------------------------------------------------------------------------
async function handleStart(chatId: number) {
  await sendTelegramMessage(
    chatId,
    `🤖 *Welcome to Pulsed AI!*\n\n` +
      `To connect your Telegram to your Pulsed account:\n\n` +
      `1️⃣ Go to [runpulsed.ai](https://www.runpulsed.ai) and sign up or log in\n` +
      `2️⃣ During onboarding (or in Settings), enter your Telegram username\n` +
      `3️⃣ Come back here and send any message — I'll auto-link your account!\n\n` +
      `Already set up? Just send /verify to check your connection.`
  );
}

async function handleHelp(chatId: number) {
  await sendTelegramMessage(
    chatId,
    `🤖 *Pulsed AI — Telegram Bot*\n\n` +
      `*Commands:*\n` +
      `/start — Get started & linking instructions\n` +
      `/verify — Check if your account is linked\n` +
      `/unlink — Disconnect your Telegram from Pulsed\n` +
      `/help — Show this message\n\n` +
      `*Chat:*\n` +
      `Just send any message to talk to your AI agent. ` +
      `Your agent remembers context from both web and Telegram.\n\n` +
      `*Requirements:*\n` +
      `• Agent or Ultra plan\n` +
      `• API key configured at runpulsed.ai/settings/keys`
  );
}

async function handleVerify(chatId: number, fromId: number, username?: string) {
  let user = await findUserByChatId(fromId);

  if (!user && username) {
    user = await findUserByUsername(username);
    if (user) {
      await linkChatIdToProfile(user.id, fromId);
    }
  }

  if (user) {
    await sendTelegramMessage(chatId, `✅ Your account is linked! Just send a message to chat with your agent.`);
  } else {
    await sendTelegramMessage(
      chatId,
      `❌ Account not found.\n\n` +
        `Make sure you've added your Telegram username in your Pulsed profile settings, ` +
        `then try /verify again.`
    );
  }
}

async function handleUnlink(chatId: number, fromId: number) {
  const user = await findUserByChatId(fromId);

  if (user) {
    await supabase
      .from('profiles')
      .update({ telegram_chat_id: null })
      .eq('id', user.id);

    await sendTelegramMessage(chatId, `✅ Your Telegram has been unlinked from Pulsed. Send /start to reconnect.`);
  } else {
    await sendTelegramMessage(chatId, `ℹ️ No linked account found.`);
  }
}

// ---------------------------------------------------------------------------
// Main webhook handler
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    // Verify webhook secret
    const url = new URL(req.url);
    const secret = url.searchParams.get('secret');
    if (TELEGRAM_WEBHOOK_SECRET && secret !== TELEGRAM_WEBHOOK_SECRET) {
      return new Response('Unauthorized', { status: 401 });
    }

    const update = await req.json();

    // Only handle text messages (ignore edits, callbacks, etc.)
    const message = update?.message;
    if (!message?.text || !message?.from?.id || !message?.chat?.id) {
      return new Response('OK', { status: 200 });
    }

    const chatId: number = message.chat.id;
    const fromId: number = message.from.id;
    const username: string | undefined = message.from.username;
    const text: string = message.text.trim();

    // Rate limiting
    if (isRateLimited(chatId)) {
      await sendTelegramMessage(chatId, '⏳ Slow down! You can send up to 10 messages per minute.');
      return new Response('OK', { status: 200 });
    }

    // Handle commands
    const command = text.split(' ')[0].toLowerCase();

    if (command === '/start') {
      await handleStart(chatId);
      return new Response('OK', { status: 200 });
    }

    if (command === '/help') {
      await handleHelp(chatId);
      return new Response('OK', { status: 200 });
    }

    if (command === '/verify') {
      await handleVerify(chatId, fromId, username);
      return new Response('OK', { status: 200 });
    }

    if (command === '/unlink') {
      await handleUnlink(chatId, fromId);
      return new Response('OK', { status: 200 });
    }

    // ----- Regular message → route to agent -----

    // 1. Look up user by telegram_chat_id
    let user = await findUserByChatId(fromId);

    // 2. If not found, try matching by username and auto-link
    if (!user && username) {
      user = await findUserByUsername(username);
      if (user) {
        await linkChatIdToProfile(user.id, fromId);
        await sendTelegramMessage(
          chatId,
          `🔗 Auto-linked your Telegram account! Your messages will now go to your Pulsed agent.`
        );
      }
    }

    // 3. Still not found → send linking instructions
    if (!user) {
      await sendTelegramMessage(
        chatId,
        `👋 You haven't linked your account yet.\n\n` +
          `Send /start to get setup instructions.`
      );
      return new Response('OK', { status: 200 });
    }

    // 4. Check plan
    if (user.plan !== 'pro' && user.plan !== 'agent' && user.plan !== 'ultra') {
      await sendTelegramMessage(
        chatId,
        `⚡ Telegram agent access requires a Pro, Agent, or Ultra plan.\n\n` +
          `Upgrade at [runpulsed.ai/pricing](https://www.runpulsed.ai/pricing)`
      );
      return new Response('OK', { status: 200 });
    }

    // 5. Send typing indicator & call agent
    await sendTypingAction(chatId);

    // Save user message to history
    await saveMessage(user.id, 'user', text);

    const agentResponse = await callAgent(user.id, text);

    // Save assistant response to history
    await saveMessage(user.id, 'assistant', agentResponse);

    // 6. Send response back to Telegram
    await sendTelegramMessage(chatId, agentResponse);

    return new Response('OK', { status: 200 });
  } catch (error: any) {
    console.error('Telegram webhook error:', error);
    // Always return 200 to Telegram to prevent retry loops
    return new Response('OK', { status: 200 });
  }
}
