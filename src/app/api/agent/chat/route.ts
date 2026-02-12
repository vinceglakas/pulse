import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const { message, sessionKey } = await req.json();

  if (!message || typeof message !== 'string') {
    return new Response(JSON.stringify({ error: 'Message is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Stub: stream back a placeholder response
  const responseText = `Agent coming soon — configuring your AI...\n\nYou said: "${message}"${sessionKey ? ` (session: ${sessionKey})` : ''}`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Simulate streaming by sending word by word
      const words = responseText.split(' ');
      for (const word of words) {
        const chunk = `data: ${JSON.stringify({ text: word + ' ' })}\n\n`;
        controller.enqueue(encoder.encode(chunk));
        await new Promise((r) => setTimeout(r, 40));
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
