import {
  buildInsertNotes,
  parseClientNameFromPvEvent,
  pvMinutesToDisplayTime,
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