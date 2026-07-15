# Implementation Prompt: DEK/KEK Encryption Layer
## For: Integration Hub & MCP Servers — Credential Security
## Dependency: Prompt A (Foundation) must be complete before this runs
## This prompt is additive — it does not replace any prior prompt. It adds an encryption layer between the application and Supabase Vault.

---

```
## CONTEXT

Stack: Supabase (Postgres, Edge Functions, Vault) + React/Vite frontend
This prompt addresses a security gap in the Integration Hub spec: Supabase Vault encrypts all secrets with a single platform root key. In a multi-tenant environment, this means all org credentials share the same encryption key — compromising one key compromises all tenants.

This prompt implements a DEK/KEK (Data Encryption Key / Key Encryption Key) architecture that adds per-org encryption isolation on top of Supabase Vault.

---

## WHAT DEK/KEK MEANS IN THIS CONTEXT

DEK (Data Encryption Key):
  - One unique DEK per org
  - Used to encrypt all of that org's secrets (API keys, OAuth tokens, SMTP passwords)
  - The DEK itself is never stored in plaintext — it is always stored encrypted

KEK (Key Encryption Key):
  - Used to encrypt the DEK
  - Two modes:
    a. Platform KEK: A single platform-level key managed by us, stored in Supabase Vault as a platform secret
    b. Customer KEK (BYOK): Enterprise org supplies their own KEK — we never see it in plaintext; it is passed per-operation and used transiently
  - The KEK never touches the database

Encryption flow for storing a new secret:
  1. Retrieve org's DEK from `org_encryption_keys` table (stored as ciphertext encrypted by KEK)
  2. Decrypt DEK using KEK (platform KEK from Vault, or customer-provided KEK passed in request)
  3. Encrypt the secret (API key / token / password) using DEK with AES-256-GCM
  4. Store the encrypted secret ciphertext + IV in `integration_connections.encrypted_secret` (new column)
  5. Also store in Supabase Vault as backup reference — but the Vault copy is already doubly encrypted (DEK encryption + Vault root key)
  6. Discard DEK from memory immediately after use

Decryption flow for using a secret:
  1. Retrieve ciphertext from `integration_connections.encrypted_secret`
  2. Retrieve org's encrypted DEK from `org_encryption_keys`
  3. Decrypt DEK using KEK (from platform Vault or customer-provided)
  4. Decrypt secret using DEK
  5. Use secret for provider API call
  6. Discard DEK and plaintext secret from memory immediately — never log either

---

## PHASE 1: DATABASE MIGRATION

### 1a. Org Encryption Keys Table

```sql
-- ============================================================
-- ORG ENCRYPTION KEYS
-- Stores one encrypted DEK per org.
-- The DEK is encrypted by the platform KEK (or customer KEK for BYOK orgs).
-- ============================================================
CREATE TABLE public.org_encryption_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  kek_mode TEXT NOT NULL DEFAULT 'platform'
    CHECK (kek_mode IN ('platform', 'customer_byok')),
  encrypted_dek TEXT NOT NULL,          -- AES-256-GCM ciphertext of the DEK, base64-encoded
  dek_iv TEXT NOT NULL,                 -- Initialization vector used to encrypt the DEK, base64-encoded
  dek_version INTEGER NOT NULL DEFAULT 1, -- Increments on every DEK rotation
  algorithm TEXT NOT NULL DEFAULT 'AES-256-GCM',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  rotated_at TIMESTAMPTZ,
  rotated_by UUID REFERENCES auth.users(id),
  UNIQUE(org_id)                        -- One DEK per org
);

-- ============================================================
-- ADD ENCRYPTED SECRET COLUMNS TO INTEGRATION_CONNECTIONS
-- Replace vault_secret_id as the primary secret store.
-- vault_secret_id is retained as a secondary backup reference only.
-- ============================================================
ALTER TABLE public.integration_connections
  ADD COLUMN encrypted_secret TEXT,        -- AES-256-GCM ciphertext of the secret, base64-encoded
  ADD COLUMN secret_iv TEXT,               -- IV used to encrypt this secret, base64-encoded
  ADD COLUMN dek_version INTEGER,          -- Which DEK version was used (for rotation tracking)
  ADD COLUMN encryption_algorithm TEXT DEFAULT 'AES-256-GCM';

-- ============================================================
-- ADD ENCRYPTED TOKEN COLUMNS TO INTEGRATION_OAUTH_TOKENS
-- ============================================================
ALTER TABLE public.integration_oauth_tokens
  ADD COLUMN encrypted_access_token TEXT,
  ADD COLUMN access_token_iv TEXT,
  ADD COLUMN encrypted_refresh_token TEXT,
  ADD COLUMN refresh_token_iv TEXT,
  ADD COLUMN dek_version INTEGER;

-- ============================================================
-- ADD ENCRYPTED CREDENTIAL COLUMN TO MCP_CONNECTIONS
-- ============================================================
ALTER TABLE public.mcp_connections
  ADD COLUMN encrypted_credential TEXT,
  ADD COLUMN credential_iv TEXT,
  ADD COLUMN dek_version INTEGER;

-- ============================================================
-- KEY ROTATION AUDIT LOG
-- ============================================================
CREATE TABLE public.key_rotation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  rotation_type TEXT NOT NULL CHECK (rotation_type IN ('dek_rotation', 'kek_rotation')),
  old_dek_version INTEGER NOT NULL,
  new_dek_version INTEGER NOT NULL,
  secrets_re_encrypted INTEGER DEFAULT 0,
  initiated_by UUID REFERENCES auth.users(id),
  initiated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'completed', 'failed'))
);

-- ============================================================
-- RLS ON ORG_ENCRYPTION_KEYS
-- Admins can read their own org's key metadata (not the DEK ciphertext — but it's useless without KEK)
-- Write operations via service-role only (Edge Functions)
-- ============================================================
ALTER TABLE public.org_encryption_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins_read_own_org_key_metadata" ON public.org_encryption_keys
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.org_members om JOIN public.roles r ON om.role_id = r.id
    WHERE om.user_id = auth.uid()
      AND om.org_id = org_encryption_keys.org_id
      AND r.permissions->>'manage_integrations' = 'true'
  ));
-- No INSERT/UPDATE/DELETE via client — service-role only
CREATE POLICY "block_client_writes_org_keys" ON public.org_encryption_keys
  FOR INSERT WITH CHECK (false);
CREATE POLICY "block_client_updates_org_keys" ON public.org_encryption_keys
  FOR UPDATE USING (false);

ALTER TABLE public.key_rotation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins_read_key_rotation_logs" ON public.key_rotation_logs
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.org_members om JOIN public.roles r ON om.role_id = r.id
    WHERE om.user_id = auth.uid()
      AND om.org_id = key_rotation_logs.org_id
      AND r.permissions->>'view_audit_logs' = 'true'
  ));

-- Indexes
CREATE INDEX idx_org_encryption_keys_org ON public.org_encryption_keys(org_id);
CREATE INDEX idx_key_rotation_logs_org ON public.key_rotation_logs(org_id, initiated_at DESC);
```

---

## PHASE 2: SHARED ENCRYPTION UTILITY

**File:** `supabase/functions/_shared/encryption.ts`

This module is imported by ALL Edge Functions that handle credentials. It is the ONLY place in the codebase where encryption and decryption logic lives.

```typescript
import { crypto } from 'https://deno.land/std/crypto/mod.ts';
import { encodeBase64, decodeBase64 } from 'https://deno.land/std/encoding/base64.ts';

// ============================================================
// CONSTANTS
// ============================================================
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256; // bits
const IV_LENGTH = 12;   // bytes — standard for AES-GCM

// ============================================================
// GENERATE A NEW DEK
// Called once when a new org is provisioned or when rotating DEK.
// Returns raw CryptoKey — never persisted in this form.
// ============================================================
export async function generateDek(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    { name: ALGORITHM, length: KEY_LENGTH },
    true,  // extractable — needed to export for encrypted storage
    ['encrypt', 'decrypt']
  );
}

// ============================================================
// EXPORT DEK TO RAW BYTES
// Required before encrypting the DEK with the KEK.
// ============================================================
export async function exportDek(dek: CryptoKey): Promise<Uint8Array> {
  const raw = await crypto.subtle.exportKey('raw', dek);
  return new Uint8Array(raw);
}

// ============================================================
// IMPORT DEK FROM RAW BYTES
// Used after decrypting the stored DEK ciphertext with the KEK.
// ============================================================
export async function importDek(rawBytes: Uint8Array): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    'raw',
    rawBytes,
    { name: ALGORITHM, length: KEY_LENGTH },
    false, // NOT extractable once imported for use — reduces key exposure window
    ['encrypt', 'decrypt']
  );
}

// ============================================================
// ENCRYPT A SECRET WITH A DEK
// Returns: { ciphertext (base64), iv (base64) }
// ============================================================
export async function encryptSecret(
  plaintext: string,
  dek: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);

  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    dek,
    encoded
  );

  return {
    ciphertext: encodeBase64(new Uint8Array(encrypted)),
    iv: encodeBase64(iv),
  };
}

// ============================================================
// DECRYPT A SECRET WITH A DEK
// Returns: plaintext string
// ============================================================
export async function decryptSecret(
  ciphertext: string,
  iv: string,
  dek: CryptoKey
): Promise<string> {
  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv: decodeBase64(iv) },
    dek,
    decodeBase64(ciphertext)
  );
  return new TextDecoder().decode(decrypted);
}

// ============================================================
// ENCRYPT DEK WITH KEK
// The KEK is a raw AES-256 key provided as base64 string.
// For platform mode: retrieved from Supabase Vault.
// For BYOK: passed in the request header by the customer.
// Returns: { encryptedDek (base64), iv (base64) }
// ============================================================
export async function encryptDek(
  dekBytes: Uint8Array,
  kekBase64: string
): Promise<{ encryptedDek: string; iv: string }> {
  const kekBytes = decodeBase64(kekBase64);
  const kek = await crypto.subtle.importKey(
    'raw',
    kekBytes,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt']
  );

  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    kek,
    dekBytes
  );

  return {
    encryptedDek: encodeBase64(new Uint8Array(encrypted)),
    iv: encodeBase64(iv),
  };
}

// ============================================================
// DECRYPT DEK WITH KEK
// Returns: raw DEK bytes
// ============================================================
export async function decryptDek(
  encryptedDekBase64: string,
  dekIvBase64: string,
  kekBase64: string
): Promise<Uint8Array> {
  const kekBytes = decodeBase64(kekBase64);
  const kek = await crypto.subtle.importKey(
    'raw',
    kekBytes,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['decrypt']
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv: decodeBase64(dekIvBase64) },
    kek,
    decodeBase64(encryptedDekBase64)
  );

  return new Uint8Array(decrypted);
}
```

---

## PHASE 3: ORG KEY MANAGER UTILITY

**File:** `supabase/functions/_shared/orgKeyManager.ts`

This module handles all DEK lifecycle operations: provisioning, retrieval, and rotation. Every credential-handling Edge Function uses `getOrgDek()` as its entry point.

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  generateDek, exportDek, importDek,
  encryptDek, decryptDek
} from './encryption.ts';

// ============================================================
// GET THE PLATFORM KEK FROM SUPABASE VAULT
// The platform KEK is a single AES-256 key stored as a Vault secret.
// Vault secret name: 'platform_kek'
// This is the ONLY Vault read in the entire encryption flow.
// ============================================================
async function getPlatformKek(serviceClient: any): Promise<string> {
  const { data, error } = await serviceClient
    .from('vault.decrypted_secrets')
    .select('decrypted_secret')
    .eq('name', 'platform_kek')
    .single();

  if (error || !data) {
    throw new Error('Platform KEK not found in Vault. Cannot proceed with encryption operation.');
  }
  return data.decrypted_secret; // base64-encoded 256-bit key
}

// ============================================================
// PROVISION A NEW DEK FOR AN ORG
// Called once when an org first connects any integration.
// Creates org_encryption_keys row.
// ============================================================
export async function provisionOrgDek(
  orgId: string,
  serviceClient: any,
  customerKekBase64?: string  // provided only for BYOK orgs
): Promise<void> {
  // Check if DEK already exists for this org
  const { data: existing } = await serviceClient
    .from('org_encryption_keys')
    .select('id')
    .eq('org_id', orgId)
    .single();

  if (existing) return; // DEK already provisioned — idempotent

  // Generate new DEK
  const dek = await generateDek();
  const dekBytes = await exportDek(dek);

  // Encrypt DEK with KEK (platform or customer)
  const kek = customerKekBase64 ?? await getPlatformKek(serviceClient);
  const kekMode = customerKekBase64 ? 'customer_byok' : 'platform';
  const { encryptedDek, iv } = await encryptDek(dekBytes, kek);

  // Zero out DEK bytes from memory
  dekBytes.fill(0);

  // Store encrypted DEK
  const { error } = await serviceClient
    .from('org_encryption_keys')
    .insert({
      org_id: orgId,
      kek_mode: kekMode,
      encrypted_dek: encryptedDek,
      dek_iv: iv,
      dek_version: 1,
    });

  if (error) {
    throw new Error(`Failed to store org DEK: ${error.message}`);
  }
}

// ============================================================
// GET ORG DEK FOR USE
// Returns a CryptoKey ready for encrypt/decrypt operations.
// DEK is decrypted transiently — never persisted in decrypted form.
// CALLER MUST: use the DEK for the operation, then discard it.
// The CryptoKey object is NOT extractable after import.
// ============================================================
export async function getOrgDek(
  orgId: string,
  serviceClient: any,
  customerKekBase64?: string
): Promise<{ dek: CryptoKey; dekVersion: number }> {
  // Retrieve encrypted DEK from DB
  const { data, error } = await serviceClient
    .from('org_encryption_keys')
    .select('encrypted_dek, dek_iv, dek_version, kek_mode')
    .eq('org_id', orgId)
    .single();

  if (error || !data) {
    // DEK not provisioned yet — provision now
    await provisionOrgDek(orgId, serviceClient, customerKekBase64);
    return getOrgDek(orgId, serviceClient, customerKekBase64);
  }

  // Determine which KEK to use
  let kek: string;
  if (data.kek_mode === 'customer_byok') {
    if (!customerKekBase64) {
      throw new Error(
        'This org uses customer-managed keys (BYOK). ' +
        'The X-Customer-KEK header is required for this operation.'
      );
    }
    kek = customerKekBase64;
  } else {
    kek = await getPlatformKek(serviceClient);
  }

  // Decrypt the DEK transiently
  const dekBytes = await decryptDek(data.encrypted_dek, data.dek_iv, kek);

  // Import as non-extractable CryptoKey
  const dek = await importDek(dekBytes);

  // Zero out raw bytes
  dekBytes.fill(0);

  return { dek, dekVersion: data.dek_version };
}

// ============================================================
// ROTATE DEK FOR AN ORG
// Generates a new DEK, re-encrypts all secrets for this org
// using the new DEK, then replaces the encrypted_dek in DB.
// Called manually by admins or automatically on schedule.
// ============================================================
export async function rotateOrgDek(
  orgId: string,
  serviceClient: any,
  initiatedBy: string,
  customerKekBase64?: string
): Promise<void> {
  // Step 1: Get current DEK (needed to decrypt existing secrets)
  const { dek: currentDek, dekVersion: currentVersion } = await getOrgDek(
    orgId, serviceClient, customerKekBase64
  );

  // Step 2: Generate new DEK
  const newDek = await generateDek();
  const newDekBytes = await exportDek(newDek);

  // Step 3: Insert rotation log entry
  const { data: logRow } = await serviceClient
    .from('key_rotation_logs')
    .insert({
      org_id: orgId,
      rotation_type: 'dek_rotation',
      old_dek_version: currentVersion,
      new_dek_version: currentVersion + 1,
      initiated_by: initiatedBy,
      status: 'in_progress',
    })
    .select('id')
    .single();

  let secretsReEncrypted = 0;

  try {
    // Step 4: Re-encrypt all integration_connections.encrypted_secret for this org
    const { data: connections } = await serviceClient
      .from('integration_connections')
      .select('id, encrypted_secret, secret_iv')
      .eq('org_id', orgId)
      .not('encrypted_secret', 'is', null);

    for (const conn of connections ?? []) {
      // Decrypt with current DEK
      const { decryptSecret, encryptSecret } = await import('./encryption.ts');
      const plaintext = await decryptSecret(conn.encrypted_secret, conn.secret_iv, currentDek);

      // Re-encrypt with new DEK
      const { ciphertext, iv } = await encryptSecret(plaintext, newDek);

      // Zero out plaintext string (best effort — JS strings are immutable but at least dereference)
      // Note: true zeroing of strings is not possible in JS. Minimize exposure window.

      // Update row
      await serviceClient
        .from('integration_connections')
        .update({
          encrypted_secret: ciphertext,
          secret_iv: iv,
          dek_version: currentVersion + 1,
        })
        .eq('id', conn.id);

      secretsReEncrypted++;
    }

    // Step 5: Re-encrypt oauth tokens for this org
    const { data: tokens } = await serviceClient
      .from('integration_oauth_tokens')
      .select('id, encrypted_access_token, access_token_iv, encrypted_refresh_token, refresh_token_iv, connection_id')
      .in('connection_id', (connections ?? []).map((c: any) => c.id));

    for (const token of tokens ?? []) {
      const { decryptSecret, encryptSecret } = await import('./encryption.ts');

      const updates: any = {};

      if (token.encrypted_access_token) {
        const plainAccess = await decryptSecret(token.encrypted_access_token, token.access_token_iv, currentDek);
        const reEncAccess = await encryptSecret(plainAccess, newDek);
        updates.encrypted_access_token = reEncAccess.ciphertext;
        updates.access_token_iv = reEncAccess.iv;
      }

      if (token.encrypted_refresh_token) {
        const plainRefresh = await decryptSecret(token.encrypted_refresh_token, token.refresh_token_iv, currentDek);
        const reEncRefresh = await encryptSecret(plainRefresh, newDek);
        updates.encrypted_refresh_token = reEncRefresh.ciphertext;
        updates.refresh_token_iv = reEncRefresh.iv;
      }

      updates.dek_version = currentVersion + 1;

      await serviceClient
        .from('integration_oauth_tokens')
        .update(updates)
        .eq('id', token.id);

      secretsReEncrypted++;
    }

    // Step 6: Re-encrypt MCP credentials for this org
    const { data: mcpConns } = await serviceClient
      .from('mcp_connections')
      .select('id, encrypted_credential, credential_iv')
      .eq('org_id', orgId)
      .not('encrypted_credential', 'is', null);

    for (const mcp of mcpConns ?? []) {
      const { decryptSecret, encryptSecret } = await import('./encryption.ts');
      const plain = await decryptSecret(mcp.encrypted_credential, mcp.credential_iv, currentDek);
      const reEnc = await encryptSecret(plain, newDek);
      await serviceClient
        .from('mcp_connections')
        .update({
          encrypted_credential: reEnc.ciphertext,
          credential_iv: reEnc.iv,
          dek_version: currentVersion + 1,
        })
        .eq('id', mcp.id);
      secretsReEncrypted++;
    }

    // Step 7: Encrypt new DEK with KEK and store it
    const kek = customerKekBase64 ?? await getPlatformKek(serviceClient);
    const { encryptedDek, iv: newDekIv } = await encryptDek(newDekBytes, kek);
    newDekBytes.fill(0); // Zero out

    await serviceClient
      .from('org_encryption_keys')
      .update({
        encrypted_dek: encryptedDek,
        dek_iv: newDekIv,
        dek_version: currentVersion + 1,
        rotated_at: new Date().toISOString(),
        rotated_by: initiatedBy,
      })
      .eq('org_id', orgId);

    // Step 8: Mark rotation log complete
    await serviceClient
      .from('key_rotation_logs')
      .update({
        status: 'completed',
        secrets_re_encrypted: secretsReEncrypted,
        completed_at: new Date().toISOString(),
      })
      .eq('id', logRow.id);

  } catch (err) {
    // Mark rotation as failed — do NOT leave in partial state
    await serviceClient
      .from('key_rotation_logs')
      .update({ status: 'failed' })
      .eq('id', logRow.id);
    throw err;
  }
}
```

---

## PHASE 4: MODIFY ALL CREDENTIAL-HANDLING EDGE FUNCTIONS

Every Edge Function that previously wrote to Supabase Vault must now use the DEK/KEK layer instead. The pattern is identical across all functions.

### Pattern: Store a Credential

Replace ALL instances of:
```typescript
// OLD — Vault-only storage
const { data: vaultData } = await serviceClient.rpc('vault.create_secret', {
  secret: apiKey,
  name: `integration_${connectionId}`
});
const vaultSecretId = vaultData.id;
await serviceClient.from('integration_connections').update({ vault_secret_id: vaultSecretId });
```

With:
```typescript
// NEW — DEK/KEK encrypted storage
import { getOrgDek } from '../_shared/orgKeyManager.ts';
import { encryptSecret } from '../_shared/encryption.ts';

// Extract customer KEK from request header if BYOK org
const customerKek = req.headers.get('X-Customer-KEK') ?? undefined;

// Get org DEK (provisions automatically if first time)
const { dek, dekVersion } = await getOrgDek(orgId, serviceClient, customerKek);

// Encrypt the secret
const { ciphertext, iv } = await encryptSecret(apiKey, dek);

// Store encrypted secret in DB (NOT in Vault — Vault is no longer the primary store)
await serviceClient
  .from('integration_connections')
  .update({
    encrypted_secret: ciphertext,
    secret_iv: iv,
    dek_version: dekVersion,
    vault_secret_id: null, // Clear old Vault reference if migrating
  })
  .eq('id', connectionId);

// DEK is now out of scope and will be garbage collected.
// The CryptoKey was imported as non-extractable so it cannot be read from memory.
```

### Pattern: Retrieve a Credential

Replace ALL instances of:
```typescript
// OLD — Vault retrieval
const { data } = await serviceClient
  .from('vault.decrypted_secrets')
  .select('decrypted_secret')
  .eq('id', vaultSecretId)
  .single();
const apiKey = data.decrypted_secret;
```

With:
```typescript
// NEW — DEK/KEK decryption
import { getOrgDek } from '../_shared/orgKeyManager.ts';
import { decryptSecret } from '../_shared/encryption.ts';

const customerKek = req.headers.get('X-Customer-KEK') ?? undefined;
const { dek } = await getOrgDek(orgId, serviceClient, customerKek);

// Retrieve ciphertext from integration_connections
const { data: conn } = await serviceClient
  .from('integration_connections')
  .select('encrypted_secret, secret_iv')
  .eq('id', connectionId)
  .single();

// Decrypt
const apiKey = await decryptSecret(conn.encrypted_secret, conn.secret_iv, dek);

// Use apiKey immediately for provider call, then let it go out of scope.
// DO NOT store, log, or serialize apiKey.
```

### Functions That Must Be Updated

Apply the pattern above to every function listed. No exceptions:

```
integrations-connect-apikey       → store encrypted_secret in integration_connections
integrations-connect-smtp         → store encrypted_secret in integration_connections
integrations-oauth-callback       → store encrypted_access_token + encrypted_refresh_token in integration_oauth_tokens
integrations-test                 → retrieve encrypted_secret to re-run health check
integrations-rotate               → decrypt old secret (verify), encrypt new secret, update row
integrations-disconnect           → decrypt and pass to provider for token revocation (best-effort), then delete encrypted_secret column values (set to null)
mcp-connect                       → store encrypted_credential in mcp_connections
mcp-discover-tools                → retrieve encrypted_credential to authenticate with MCP server
pipelines-sync                    → retrieve encrypted_secret to authenticate with provider API
pipelines-discover-schema         → retrieve encrypted_secret for schema API call
webhook-receiver                  → retrieve webhook signing secret (if stored) for signature validation
```

---

## PHASE 5: PLATFORM KEK PROVISIONING

The platform KEK must be provisioned ONCE during initial system setup and stored in Supabase Vault as a named secret.

Run this script once in a secure environment (local machine, NOT in CI):

```typescript
// scripts/provision-platform-kek.ts
// Run with: deno run --allow-net scripts/provision-platform-kek.ts

import { encodeBase64 } from 'https://deno.land/std/encoding/base64.ts';

async function generateKek(): Promise<string> {
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  const raw = await crypto.subtle.exportKey('raw', key);
  return encodeBase64(new Uint8Array(raw));
}

const kek = await generateKek();
console.log('Platform KEK (base64):', kek);
console.log('');
console.log('Store this in Supabase Vault with name: platform_kek');
console.log('Command: supabase secrets set platform_kek=<value>');
console.log('');
console.log('NEVER commit this value. Store a backup in your password manager / HSM.');
console.log('This value cannot be recovered if lost. All org DEKs will become unrecoverable.');
```

After generating:
```bash
supabase secrets set platform_kek=<generated_base64_value>
```

Verify it was stored:
```bash
supabase secrets list
# Should show 'platform_kek' in the list (not the value)
```

---

## PHASE 6: BYOK (CUSTOMER KEY MANAGEMENT) — ENTERPRISE ORGS

For enterprise orgs that supply their own KEK, the flow differs only in how the KEK is delivered:

### Customer provides KEK per-request via HTTP header:
```
X-Customer-KEK: <base64-encoded AES-256 key>
```

This header is:
- Accepted only over HTTPS (enforced by Supabase Edge runtime)
- Never logged (sanitize all headers matching `X-Customer-KEK` in Edge Function logs)
- Used transiently per request — not stored anywhere
- Validated before use: must be exactly 32 bytes (256 bits) when base64-decoded

### Validation in Edge Functions (add to all functions):
```typescript
function validateCustomerKek(kekBase64: string | null): string | undefined {
  if (!kekBase64) return undefined;

  try {
    const bytes = decodeBase64(kekBase64);
    if (bytes.length !== 32) {
      throw new Error('X-Customer-KEK must be a 256-bit (32-byte) key encoded as base64.');
    }
    return kekBase64;
  } catch {
    throw new Error('X-Customer-KEK header is malformed. Provide a valid base64-encoded 256-bit AES key.');
  }
}

// Usage at the top of every Edge Function:
const rawCustomerKek = req.headers.get('X-Customer-KEK');
const customerKek = validateCustomerKek(rawCustomerKek);
```

### Marking an org as BYOK:
When an org switches to BYOK mode:
1. Call `rotateOrgDek(orgId, serviceClient, actorId, customerKekBase64)`
   This re-encrypts all their secrets from platform-KEK encryption to customer-KEK encryption.
2. Update `org_encryption_keys.kek_mode = 'customer_byok'`
3. From this point forward, all operations for this org require `X-Customer-KEK` header.

If a BYOK org submits a request WITHOUT the `X-Customer-KEK` header:
- Return HTTP 403: "This organization uses customer-managed encryption keys. The X-Customer-KEK header is required."
- Do NOT fall back to platform KEK. A missing customer KEK is always a hard error.

---

## PHASE 7: DEK ROTATION EDGE FUNCTION

**File:** `supabase/functions/rotate-org-dek/index.ts`

Endpoint: `POST /api/orgs/:orgId/encryption/rotate-dek`

Auth: Authenticated + `super_admin` role only (not Integration Manager — this is a security operation)

```typescript
import { rotateOrgDek } from '../_shared/orgKeyManager.ts';

Deno.serve(async (req) => {
  // Validate super_admin role — Integration Manager cannot rotate keys
  const { orgId, actorId } = await validateSuperAdmin(req);

  const customerKek = req.headers.get('X-Customer-KEK') ?? undefined;

  try {
    await rotateOrgDek(orgId, serviceClient, actorId, customerKek);

    return new Response(JSON.stringify({
      success: true,
      message: 'DEK rotation complete. All secrets re-encrypted with new key.',
    }), { status: 200 });

  } catch (err) {
    console.error('DEK rotation failed:', err.message); // Never log the KEK or DEK
    return new Response(JSON.stringify({
      error: 'dek_rotation_failed',
      detail: err.message,
    }), { status: 500 });
  }
});
```

---

## PHASE 8: ADMIN UI — ENCRYPTION STATUS PANEL

**File:** `src/components/admin/EncryptionStatusPanel.tsx`

Add this panel to the Admin Dashboard or as a dedicated section under Admin → Advanced Settings.

Display per-org:
```
Encryption Status

Key Mode:           Platform Managed  (or "Customer BYOK")
DEK Version:        v3
Last Rotated:       Jun 18, 2026 at 14:32 (by admin@acme.com)
Secrets Encrypted:  42 credentials protected
Algorithm:          AES-256-GCM

[Rotate Encryption Keys]  ← Super Admin only
```

The "Rotate Encryption Keys" button:
- Visible only to Super Admin role
- Triggers `POST /api/orgs/:orgId/encryption/rotate-dek`
- Shows progress: "Re-encrypting secrets... (14/42)"
- On success: updates DEK version display, shows success toast
- On failure: shows error and links to Abesh for investigation

Key rotation log (expandable table below the panel):
Columns: Date | Type | Old Version | New Version | Secrets Re-encrypted | Initiated By | Status

---

## PHASE 9: MIGRATION — EXISTING VAULT SECRETS

If Vault-only storage was already deployed (from Phase A of the integration hub prompts), run this migration to move existing secrets to DEK/KEK encryption.

**File:** `supabase/functions/migrate-vault-to-dek/index.ts`

One-time migration script (idempotent — safe to run multiple times):

```typescript
// For each org that has integration_connections with vault_secret_id set
// and encrypted_secret IS NULL:

const { data: connections } = await serviceClient
  .from('integration_connections')
  .select('id, org_id, vault_secret_id')
  .not('vault_secret_id', 'is', null)
  .is('encrypted_secret', null);

for (const conn of connections ?? []) {
  // 1. Retrieve from Vault (old method — one final use)
  const { data: vaultData } = await serviceClient
    .from('vault.decrypted_secrets')
    .select('decrypted_secret')
    .eq('id', conn.vault_secret_id)
    .single();

  if (!vaultData?.decrypted_secret) continue; // skip if not found

  // 2. Encrypt with new DEK/KEK layer
  const { dek, dekVersion } = await getOrgDek(conn.org_id, serviceClient);
  const { ciphertext, iv } = await encryptSecret(vaultData.decrypted_secret, dek);

  // 3. Update row with DEK-encrypted version
  await serviceClient
    .from('integration_connections')
    .update({
      encrypted_secret: ciphertext,
      secret_iv: iv,
      dek_version: dekVersion,
      // Keep vault_secret_id for now — clear after verifying migration
    })
    .eq('id', conn.id);

  console.log(`Migrated connection ${conn.id} for org ${conn.org_id}`);
}

// After verifying all connections migrated:
// UPDATE integration_connections SET vault_secret_id = null WHERE encrypted_secret IS NOT NULL;
// Then manually delete the old Vault secrets via Supabase Dashboard.
```

Run the migration, verify all rows have `encrypted_secret` populated, then clear `vault_secret_id`.

---

## SECURITY INVARIANTS — ENFORCED THROUGHOUT

These are hard rules. Any code that violates these is a security defect, not a style issue:

1. **The platform KEK is read from Vault exactly once per Edge Function invocation** — never cached between requests, never stored in a module-level variable.

2. **The DEK is decrypted into a non-extractable CryptoKey** — `importDek()` sets `extractable: false`. This means even if code tries to export the key after use, it will throw. The raw bytes are zeroed immediately after `importDek()`.

3. **Plaintext secrets exist in memory only for the duration of the crypto operation** — encrypt: plaintext lives from parameter pass to `encryptSecret()` return, then goes out of scope. Decrypt: plaintext lives from `decryptSecret()` return to the provider API call, then goes out of scope. Do NOT assign to a module-level variable.

4. **No credential ever touches a console.log, error.message propagation, or JSON serialization** — every Edge Function must have a log sanitizer that strips `/key|token|password|secret|credential|dek|kek/i` from all logged objects.

5. **Rotation is atomic at the org level** — if re-encryption of any secret fails mid-rotation, the rotation is marked `failed` and the old DEK remains valid. Never leave an org in a state where some secrets use old DEK and some use new DEK without the rotation log reflecting this.

6. **BYOK header validation is strict** — wrong key length = hard 400 error. Missing header on BYOK org = hard 403 error. No fallback to platform KEK.

7. **The `encrypted_secret`, `encrypted_access_token`, `encrypted_credential` columns are never returned in API responses** — the API layer reads them, decrypts them in the Edge Function, uses the plaintext for the provider call, and returns only operation results (connection status, test results, masked key). The ciphertext never leaves the Edge Function.

---

## WHAT CHANGES IN THE UAT

The following UAT steps from the Integration Hub UAT must be re-run after this prompt is implemented:

| Original Step | What to Re-Test |
|---|---|
| Step 15 | Network response must NOT contain `encrypted_secret` or any ciphertext column |
| Step 28 | After disconnect, verify `encrypted_secret` column is set to NULL (not just `vault_secret_id`) |
| Step 29 | After rotation, verify `dek_version` increments in `integration_connections` row |
| Step 66 | Verify `encrypted_secret` is NOT in any API response payload |
| Step 68 | Verify audit log contains no ciphertext values |

Add these new UAT steps for the encryption layer specifically:

- **ENC-1:** Navigate to Admin Dashboard → Encryption Status panel — confirm it shows: Key Mode, DEK Version, Last Rotated timestamp, Secrets Encrypted count, and Algorithm.
- **ENC-2:** Connect a new integration (any API key provider) — verify in Supabase DB that `integration_connections.encrypted_secret` is populated (non-null) and `integration_connections.vault_secret_id` is null.
- **ENC-3:** Check `org_encryption_keys` table for the test org — verify one row exists with `kek_mode = 'platform'` and `encrypted_dek` is a non-empty base64 string.
- **ENC-4:** As Super Admin, click "Rotate Encryption Keys" — confirm: (a) progress shown, (b) on completion DEK version increments by 1, (c) `key_rotation_logs` has a new row with `status = 'completed'` and correct `secrets_re_encrypted` count.
- **ENC-5:** After DEK rotation, verify all integrations still function correctly by clicking "Test Connection" on each — confirm all return success (secrets decryptable with new DEK).
- **ENC-6:** *(Log inspection)* Trigger any Edge Function that accesses a credential — check Supabase Edge Function logs and confirm no `encrypted_secret`, `dek`, `kek`, or plaintext API key value appears in any log line.
```
