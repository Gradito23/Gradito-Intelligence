import {
  buildCustomFieldsArray,
  buildInsertNotes,
  buildPvMetadataFields,
  inferServiceAreaFromAddressText,
  normalizePvEventForMapping,
  pvEventNeedsDetailFetch,
  parseClientNameFromPvEvent,
  pvMinutesToDisplayTime,
  resolveAreaFromPv,
  resolvePvRevenue,
} from './pvEventMapping.ts';

const lisaCapreFixture = {
  id: 'gradito-549acd345a29',
  name: 'Lisa Capre | Welcome Dinner in Florida Keys',
  group_size: 30,
  amount: 0,
  budget: 0,
  start_time: 990,
  end_time: 1260,
  status: 'confirmed',
  event_type: 'Other',
};

Deno.test('parseClientNameFromPvEvent splits contact from title', () => {
  const name = parseClientNameFromPvEvent(lisaCapreFixture, null);
  if (name !== 'Lisa Capre') {
    throw new Error(`Expected "Lisa Capre", got ${JSON.stringify(name)}`);
  }
});

Deno.test('parseClientNameFromPvEvent prefers contact record', () => {
  const name = parseClientNameFromPvEvent(lisaCapreFixture, {
    first_name: 'Lisa',
    last_name: 'Capre',
  });
  if (name !== 'Lisa Capre') {
    throw new Error(`Expected contact name, got ${JSON.stringify(name)}`);
  }
});

Deno.test('buildInsertNotes formats client and title', () => {
  const notes = buildInsertNotes('Lisa Capre', lisaCapreFixture.name);
  if (notes !== 'Lisa Capre — Welcome Dinner in Florida Keys') {
    throw new Error(`Unexpected notes: ${JSON.stringify(notes)}`);
  }
});

Deno.test('pvMinutesToDisplayTime converts minutes from midnight', () => {
  if (pvMinutesToDisplayTime(990) !== '16:30') throw new Error('990 should be 16:30');
  if (pvMinutesToDisplayTime(1260) !== '21:00') throw new Error('1260 should be 21:00');
});

Deno.test('resolvePvRevenue uses amount in cents', () => {
  if (resolvePvRevenue({ amount: 1770000 }) !== 17700) {
    throw new Error('amount cents conversion failed');
  }
});

Deno.test('resolvePvRevenue falls back to budget', () => {
  if (resolvePvRevenue({ amount: 0, budget: 50000 }) !== 500) {
    throw new Error('budget fallback failed');
  }
});

const lisaWithAddress = {
  ...lisaCapreFixture,
  custom_field_values: [
    {
      label: 'Event Address',
      value: 'The Moorings, Islamorada (the Keys)',
    },
  ],
};

Deno.test('resolveAreaFromPv maps event address custom field to roster market', () => {
  const area = resolveAreaFromPv(lisaWithAddress, { pvAccountVenueName: 'Gradito' });
  if (area !== 'Miami') {
    throw new Error(`Unexpected area: ${JSON.stringify(area)}`);
  }
});

Deno.test('inferServiceAreaFromAddressText maps NYC street to Manhattan', () => {
  const area = inferServiceAreaFromAddressText('1365 York Avenue New York, NY');
  if (area !== 'Manhattan') throw new Error(`Expected Manhattan, got ${area}`);
});

Deno.test('normalizePvEventForMapping expands official custom object', () => {
  const ev = normalizePvEventForMapping(
    {
      id: 'gradito-e423563b5dbe',
      custom: { event_address: '1365 York Avenue New York, NY' },
    },
    {
      custom_fields: [{ key: 'event_address', name: 'Event Address' }],
    },
  );
  const rows = buildCustomFieldsArray(ev);
  if (!rows.some((r) => r.label === 'Event Address' && r.value.includes('York Avenue'))) {
    throw new Error(`custom object not merged: ${JSON.stringify(rows)}`);
  }
  const meta = buildPvMetadataFields(ev, {});
  if (!meta.event_address?.includes('York Avenue')) {
    throw new Error('metadata missing event_address from custom');
  }
  const area = resolveAreaFromPv(ev, { pvAccountVenueName: 'Gradito' });
  if (area !== 'Manhattan') throw new Error(`Expected Manhattan from PV custom, got ${area}`);
});

Deno.test('resolveAreaFromPv parses region from title when no address', () => {
  const area = resolveAreaFromPv(lisaCapreFixture, {});
  if (area !== 'Miami') throw new Error(`Expected Miami (Florida Keys), got ${area}`);
});

Deno.test('buildCustomFieldsArray captures PV intake', () => {
  const rows = buildCustomFieldsArray(lisaWithAddress);
  if (rows.length !== 1 || !rows[0].label.includes('Address')) {
    throw new Error('custom fields not captured');
  }
});

Deno.test('pvEventNeedsDetailFetch false after custom normalized', () => {
  const ev = normalizePvEventForMapping(
    { custom: { event_address: '1365 York Avenue New York, NY' } },
    { custom_fields: [{ key: 'event_address', name: 'Event Address' }] },
  );
  if (pvEventNeedsDetailFetch(ev)) throw new Error('should not need detail after custom merge');