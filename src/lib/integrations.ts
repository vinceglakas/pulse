import { createClient } from '@supabase/supabase-js';
import { encrypt, decrypt, maskKey } from '@/lib/encryption';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export type SupportedProvider = 'vercel' | 'github' | 'google';

export async function getIntegration(userId: string, provider: SupportedProvider) {
  const { data, error } = await supabaseAdmin
    .from('user_integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', provider)
    .single();

  if (error || !data) return null;
  
  return {
    ...data,
    maskedKey: maskKey(getDecryptedCredential(data)),
  };
}

export async function listIntegrations(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('user_integrations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error || !data) return [];
  
  return data.map(record => ({
    ...record,
    maskedKey: maskKey(getDecryptedCredential(record)),
  }));
}

export async function upsertIntegration(
  userId: string,
  provider: SupportedProvider,
  token: string,
  metadata: Record<string, unknown>,
) {
  const encrypted = encrypt(token);
  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('user_integrations')
    .upsert(
      {
        user_id: userId,
        provider,
        credentials_enc: encrypted,
        metadata,
        status: 'connected',
        updated_at: now,
      },
      { onConflict: 'user_id,provider' },
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

export function getDecryptedCredential(record: { credentials_enc: string }): string {
  return decrypt(record.credentials_enc);
}
