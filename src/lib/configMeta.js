export const CONFIG_TYPES = {
  service_areas: {
    label: 'Service Areas',
    slug: 'service-areas',
    columns: [
      { key: 'name', label: 'Name', required: true },
      { key: 'region', label: 'Region' },
      { key: 'active', label: 'Active', type: 'boolean', default: true },
    ],
  },
  holidays: {
    label: 'Holidays',
    slug: 'holidays',
    icon: 'Calendar',
    columns: [
      { key: 'name', label: 'Name', required: true },
      { key: 'month', label: 'Month', type: 'number', formHidden: true },
      { key: 'day', label: 'Day', type: 'number', formHidden: true },
      { key: 'recurring', label: 'Recurring', type: 'boolean', default: true },
      { key: 'active', label: 'Active', type: 'boolean', default: true },
    ],
  },
  cuisines: {
    label: 'Cuisines',
    slug: 'cuisines',
    columns: [
      { key: 'name', label: 'Name', required: true },
      { key: 'active', label: 'Active', type: 'boolean', default: true },
    ],
  },
  experience_types: {
    label: 'Experience Types',
    slug: 'experience-types',
    columns: [
      { key: 'name', label: 'Name', required: true },
      { key: 'active', label: 'Active', type: 'boolean', default: true },
    ],
  },
  dietary_specialties: {
    label: 'Dietary Specialties',
    slug: 'dietary-specialties',
    columns: [
      { key: 'name', label: 'Name', required: true },
      { key: 'active', label: 'Active', type: 'boolean', default: true },
    ],
  },
  languages: {
    label: 'Languages',
    slug: 'languages',
    columns: [
      { key: 'name', label: 'Name', required: true },
      { key: 'active', label: 'Active', type: 'boolean', default: true },
    ],
  },
  event_types: {
    label: 'Event Types',
    slug: 'event-types',
    columns: [
      { key: 'name', label: 'Name', required: true },
      { key: 'active', label: 'Active', type: 'boolean', default: true },
    ],
  },
  package_types: {
    label: 'Package Types',
    slug: 'package-types',
    columns: [
      { key: 'name', label: 'Name', required: true },
      { key: 'pricing_formula', label: 'Pricing Formula (JSON)', type: 'json' },
      { key: 'active', label: 'Active', type: 'boolean', default: true },
    ],
  },
  menu_tiers: {
    label: 'Menu Tiers',
    slug: 'menu-tiers',
    columns: [
      { key: 'name', label: 'Name', required: true },
      { key: 'price_per_guest', label: 'Price Per Guest', type: 'number' },
      { key: 'active', label: 'Active', type: 'boolean', default: true },
    ],
  },
  lead_types: {
    label: 'Lead Types',
    slug: 'lead-types',
    columns: [
      { key: 'name', label: 'Name', required: true },
      { key: 'closer_pct', label: 'Closer %', type: 'number', default: 0 },
      { key: 'facilitator_pct', label: 'Facilitator %', type: 'number', default: 0 },
      { key: 'active', label: 'Active', type: 'boolean', default: true },
    ],
  },
};

export const CONFIG_TYPE_LIST = Object.entries(CONFIG_TYPES).map(([key, meta]) => ({
  key,
  ...meta,
}));

export function getConfigBySlug(slug) {
  return CONFIG_TYPE_LIST.find((c) => c.slug === slug) ?? null;
}

export function getConfigByKey(key) {
  return CONFIG_TYPES[key] ? { key, ...CONFIG_TYPES[key] } : null;
}
