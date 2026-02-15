import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/server-auth';
import { getIntegration, upsertIntegration, type SupportedProvider } from '@/lib/integrations';
import { decrypt, maskKey } from '@/lib/encryption';

const SUPPORTED_PROVIDERS: SupportedProvider[] = ['vercel', 'github', 'google'];

type ProviderParams = { params: Promise<{ provider: string }> };

type VercelUserResponse = {
  user?: {
    id?: string;
    uid?: string;
    name?: string;
    username?: string;
    email?: string;
  };
};

type VercelTeamsResponse = {
  teams?: Array<{ id: string; slug: string; name: string }>;
};

async function resolveVercelMetadata(token: string) {
  const headers = { Authorization: `Bearer ${token}` };

  const userRes = await fetch('https://api.vercel.com/v2/user', { headers });
  if (!userRes.ok) return null;
  const userData = (await userRes.json()) as VercelUserResponse;

  const teamsRes = await fetch('https://api.vercel.com/v2/teams', { headers });
  let teams: Array<{ id: string; slug: string; name: string }> = [];
  if (teamsRes.ok) {
    const teamsJson = (await teamsRes.json()) as VercelTeamsResponse;
    teams = (teamsJson.teams || []).map((team) => ({
      id: team.id,
      slug: team.slug,
      name: team.name,
    }));
  }

  return {
    account: {
      id: userData.user?.id || userData.user?.uid || 'unknown',
      name: userData.user?.name || userData.user?.username || 'Unknown',
      email: userData.user?.email || 'unknown',
    },
    teams,
    linkedAt: new Date().toISOString(),
  };
}

function ensureProvider(value: string): value is SupportedProvider {
  return SUPPORTED_PROVIDERS.includes(value as SupportedProvider);
}

export async function GET(req: NextRequest, ctx: ProviderParams) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { provider } = await ctx.params;
  if (!ensureProvider(provider)) {
    return NextResponse.json({ error: `Unsupported provider: ${provider}` }, { status: 400 });
  }

  const record = await getIntegration(user.id, provider);
  if (!record) {
    return NextResponse.json({ provider, connected: false });
  }

  let masked = '••••••••';
  try {
    masked = maskKey(decrypt(record.credentials_enc));
  } catch {}

  return NextResponse.json({
    provider,
    connected: true,
    connectedAt: record.created_at,
    metadata: record.metadata,
    maskedKey: masked,
  });
}

export async function POST(req: NextRequest, ctx: ProviderParams) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { provider } = await ctx.params;
  if (!ensureProvider(provider)) {
    return NextResponse.json({ error: `Unsupported provider: ${provider}` }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const token = typeof body?.token === 'string' ? body.token.trim() : '';
  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 });
  }

  let metadata: Record<string, unknown> | null = {};
  if (provider === 'vercel') {
    metadata = await resolveVercelMetadata(token);
  } else if (provider === 'github') {
    metadata = await resolveGitHubMetadata(token);
  } else if (provider === 'google') {
    metadata = await resolveGoogleMetadata(token);
  }

  if (!metadata) {
    return NextResponse.json({ error: 'Failed to validate credentials.' }, { status: 400 });
  }

  const record = await upsertIntegration(user.id, provider, token, metadata);

  return NextResponse.json({
    provider: record.provider,
    connected: true,
    metadata: record.metadata,
    connectedAt: record.created_at,
    maskedKey: maskKey(token),
  });
}

async function resolveGitHubMetadata(token: string) {
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' };
  
  const userRes = await fetch('https://api.github.com/user', { headers });
  if (!userRes.ok) return null;
  const userData = await userRes.json();
  
  return {
    account: {
      id: userData.id,
      login: userData.login,
      name: userData.name,
      email: userData.email,
    },
    linkedAt: new Date().toISOString(),
  };
}

async function resolveGoogleMetadata(token: string) {
  const headers = { Authorization: `Bearer ${token}` };
  
  const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers });
  if (!userRes.ok) return null;
  const userData = await userRes.json();
  
  return {
    account: {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      picture: userData.picture,
    },
    linkedAt: new Date().toISOString(),
  };
}
