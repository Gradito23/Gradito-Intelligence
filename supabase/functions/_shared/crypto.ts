import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;

function encodeBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function decodeBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function generateDek(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    { name: ALGORITHM, length: KEY_LENGTH },
    true,
    ['encrypt', 'decrypt'],
  );
}

export async function exportDek(dek: CryptoKey): Promise<Uint8Array> {
  const raw = await crypto.subtle.exportKey('raw', dek);
  return new Uint8Array(raw);
}

export async function importDek(rawBytes: Uint8Array): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    'raw',
    rawBytes,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptSecret(
  plaintext: string,
  dek: CryptoKey,
): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);
  const encrypted = await crypto.subtle.encrypt({ name: ALGORITHM, iv }, dek, encoded);
  return {
    ciphertext: encodeBase64(new Uint8Array(encrypted)),
    iv: encodeBase64(iv),
  };
}

export async function decryptSecret(
  ciphertext: string,
  iv: string,
  dek: CryptoKey,
): Promise<string> {
  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv: decodeBase64(iv) },
    dek,
    decodeBase64(ciphertext),
  );
  return new TextDecoder().decode(decrypted);
}

export async function encryptDek(
  dekBytes: Uint8Array,
  kekBase64: string,
): Promise<{ encryptedDek: string; iv: string }> {
  const kekBytes = decodeBase64(kekBase64);
  const kek = await crypto.subtle.importKey(
    'raw',
    kekBytes,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt'],
  );
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encrypted = await crypto.subtle.encrypt({ name: ALGORITHM, iv }, kek, dekBytes);
  return {
    encryptedDek: encodeBase64(new Uint8Array(encrypted)),
    iv: encodeBase64(iv),
  };
}

export async function decryptDek(
  encryptedDekBase64: string,
  dekIvBase64: string,
  kekBase64: string,
): Promise<Uint8Array> {
  const kekBytes = decodeBase64(kekBase64);
  const kek = await crypto.subtle.importKey(
    'raw',
    kekBytes,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['decrypt'],
  );
  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv: decodeBase64(dekIvBase64) },
    kek,
    decodeBase64(encryptedDekBase64),
  );
  return new Uint8Array(decrypted);
}

export function getPlatformKek(): string {
  const kek = Deno.env.get('PLATFORM_KEK')?.trim();
  if (!kek) {
    throw new Error(
      'PLATFORM_KEK is not set. Generate with: openssl rand -base64 32 && npx supabase secrets set PLATFORM_KEK=<value>',
    );
  }
  return kek;
}

export async function ensureAppDek(adminClient: SupabaseClient): Promise<{ dekVersion: number }> {
  const { data: existing, error } = await adminClient
    .from('app_encryption_keys')
    .select('id, dek_version')
    .eq('id', 1)
    .maybeSingle();

  if (error) throw error;
  if (existing) return { dekVersion: existing.dek_version ?? 1 };

  const kek = getPlatformKek();
  const dek = await generateDek();
  const dekBytes = await exportDek(dek);
  const { encryptedDek, iv } = await encryptDek(dekBytes, kek);

  const { error: insertError } = await adminClient.from('app_encryption_keys').insert({
    id: 1,
    kek_mode: 'platform',
    encrypted_dek: encryptedDek,
    dek_iv: iv,
    dek_version: 1,
    algorithm: 'AES-256-GCM',
  });

  // Concurrent bootstrap: another request may have inserted the singleton first.
  if (insertError) {
    const { data: raced, error: readError } = await adminClient
      .from('app_encryption_keys')
      .select('dek_version')
      .eq('id', 1)
      .maybeSingle();
    if (readError) throw readError;
    if (raced) return { dekVersion: raced.dek_version ?? 1 };
    throw insertError;
  }
  return { dekVersion: 1 };
}

export async function getAppDek(adminClient: SupabaseClient): Promise<{
  dek: CryptoKey;
  dekVersion: number;
}> {
  await ensureAppDek(adminClient);

  const { data, error } = await adminClient
    .from('app_encryption_keys')
    .select('encrypted_dek, dek_iv, dek_version')
    .eq('id', 1)
    .single();

  if (error || !data) {
    throw new Error('App encryption key not found');
  }

  const kek = getPlatformKek();
  const dekBytes = await decryptDek(data.encrypted_dek, data.dek_iv, kek);
  const dek = await importDek(dekBytes);
  return { dek, dekVersion: data.dek_version ?? 1 };
}

/** Prefer ciphertext; fall back to legacy plaintext so existing installs keep working. */
export async function resolveSecret(
  adminClient: SupabaseClient,
  opts: {
    encrypted?: string | null;
    iv?: string | null;
    legacyPlaintext?: string | null;
  },
): Promise<string> {
  const encrypted = opts.encrypted?.trim() || '';
  const iv = opts.iv?.trim() || '';
  if (encrypted && iv) {
    const { dek } = await getAppDek(adminClient);
    return (await decryptSecret(encrypted, iv, dek)).trim();
  }
  return (opts.legacyPlaintext || '').trim();
}

export function hasStoredSecret(opts: {
  encrypted?: string | null;
  legacyPlaintext?: string | null;
}): boolean {
  return Boolean(opts.encrypted?.trim() || opts.legacyPlaintext?.trim());
}

export async function packSecret(
  adminClient: SupabaseClient,
  plaintext: string,
): Promise<{ encrypted: string; iv: string; dekVersion: number }> {
  const trimmed = plaintext.trim();
  if (!trimmed) throw new Error('Cannot encrypt empty secret');
  const { dek, dekVersion } = await getAppDek(adminClient);
  const { ciphertext, iv } = await encryptSecret(trimmed, dek);
  return { encrypted: ciphertext, iv, dekVersion };
}

/** Encrypt any remaining plaintext secrets into ciphertext columns (idempotent). */
export async function backfillIntegrationSecrets(adminClient: SupabaseClient): Promise<{
  openai: boolean;
  resend: boolean;
  smtp: number;
}> {
  const hasKek = Boolean(Deno.env.get('PLATFORM_KEK')?.trim());
  if (!hasKek) {
    return { openai: false, resend: false, smtp: 0 };
  }

  await ensureAppDek(adminClient);
  let openai = false;
  let resend = false;
  let smtp = 0;

  const { data: openaiRow } = await adminClient
    .from('integration_openai_settings')
    .select('api_key, encrypted_api_key, api_key_iv')
    .eq('id', 1)
    .maybeSingle();

  if (openaiRow?.api_key?.trim() && !openaiRow.encrypted_api_key?.trim()) {
    const packed = await packSecret(adminClient, openaiRow.api_key);
    await adminClient.from('integration_openai_settings').update({
      encrypted_api_key: packed.encrypted,
      api_key_iv: packed.iv,
      dek_version: packed.dekVersion,
      api_key: '',
    }).eq('id', 1);
    openai = true;
  }

  const { data: resendRow } = await adminClient
    .from('integration_resend_settings')
    .select('api_key, encrypted_api_key, api_key_iv')
    .eq('id', 1)
    .maybeSingle();

  if (resendRow?.api_key?.trim() && !resendRow.encrypted_api_key?.trim()) {
    const packed = await packSecret(adminClient, resendRow.api_key);
    await adminClient.from('integration_resend_settings').update({
      encrypted_api_key: packed.encrypted,
      api_key_iv: packed.iv,
      dek_version: packed.dekVersion,
      api_key: '',
    }).eq('id', 1);
    resend = true;
  }

  const { data: smtpRows } = await adminClient
    .from('custom_smtp_configs')
    .select('id, password, encrypted_password, password_iv');

  for (const row of smtpRows ?? []) {
    if (row.password?.trim() && !row.encrypted_password?.trim()) {
      const packed = await packSecret(adminClient, row.password);
      await adminClient.from('custom_smtp_configs').update({
        encrypted_password: packed.encrypted,
        password_iv: packed.iv,
        dek_version: packed.dekVersion,
        password: '',
      }).eq('id', row.id);
      smtp += 1;
    }
  }

  return { openai, resend, smtp };
}
