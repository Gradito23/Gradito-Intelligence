import { base44 } from '@/api/base44Client';

export function normalizeClientName(name) {
  return String(name || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function clientTypeFromEventType(eventType) {
  if (eventType === 'Corporate') return 'Corporate';
  return 'Private';
}

/**
 * Find an existing client by name (case-insensitive) or create one.
 * @returns {{ id: string, name: string } | null}
 */
export async function resolveClientByName(clientName, { eventType, clients } = {}) {
  const trimmed = String(clientName || '').trim();
  if (!trimmed) return null;

  const key = normalizeClientName(trimmed);
  let list = clients;
  if (!Array.isArray(list)) {
    list = await base44.entities.Client.list('name', 500);
  }

  const existing = list.find((c) => normalizeClientName(c.name) === key);
  if (existing) {
    return { id: existing.id, name: existing.name };
  }

  const created = await base44.entities.Client.create({
    name: trimmed,
    type: clientTypeFromEventType(eventType),
  });

  if (!created?.id) {
    throw new Error(`Failed to create client "${trimmed}"`);
  }

  return { id: created.id, name: created.name || trimmed };
}
