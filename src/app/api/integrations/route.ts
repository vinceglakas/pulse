import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/server-auth';
import { listIntegrations } from '@/lib/integrations';
import { maskKey, decrypt } from '@/lib/encryption';

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const rows = await listIntegrations(user.id);

  const providers = rows.map((row) => {
    let maskedKey = '••••••••';
    try {
      const raw = decrypt(row.credentials_enc);
      maskedKey = maskKey(raw);
    } catch {}

    return {
      provider: row.provider,
      connected: row.status === 'connected',
      connectedAt: row.created_at,
      metadata: row.metadata,
      maskedKey,
    };
  });

  return NextResponse.json({ providers });
}
