const PV_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isPerfectVenueApiUuid(value) {
  return typeof value === 'string' && PV_UUID_RE.test(value.trim());
}
