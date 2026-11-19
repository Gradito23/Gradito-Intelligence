import {
  parseClientNameFromPvEvent,
  buildInsertNotes,
  buildCustomFieldsArray,
  normalizePvEventForMapping,
  pvMinutesToDisplayTime,
  resolveAreaFromPv,
  resolvePvRevenue,
} from '../supabase/functions/_shared/pvEventMapping.ts';

const ev = {
  id: 'gradito-549acd345a29',
  name: 'Lisa Capre | Welcome Dinner in Florida Keys',
  amount: 0,
  budget: 0,
  start_time: 990,
  end_time: 1260,
};

const failures = [];
const check = (name, ok) => {
  if (!ok) failures.push(name);
};

check('client name', parseClientNameFromPvEvent(ev, null) === 'Lisa Capre');
check(
  'insert notes',
  buildInsertNotes('Lisa Capre', ev.name) === 'Lisa Capre — Welcome Dinner in Florida Keys',
);
check('start time', pvMinutesToDisplayTime(990) === '16:30');
check('end time', pvMinutesToDisplayTime(1260) === '21:00');
check('revenue cents', resolvePvRevenue({ amount: 1770000 }) === 17700);
check('revenue budget', resolvePvRevenue({ amount: 0, budget: 50000 }) === 500);
check(
  'area from title',
  resolveAreaFromPv(ev, {}) === 'Miami',
);
check(
  'area from custom address',
  resolveAreaFromPv(
    {
      ...ev,
      custom_field_values: [
        { label: 'Event Address', value: 'The Moorings, Islamorada (the Keys)' },
      ],
    },
    { pvAccountVenueName: 'Gradito' },
  ) === 'The Moorings, Islamorada (the Keys)',
);
check(
  'custom fields',
  buildCustomFieldsArray({
    custom_field_values: [{ label: 'Event Address', value: 'Islamorada' }],
  }).length === 1,
);

if (failures.length) {
  console.error('FAILED:', failures.join(', '));
  process.exit(1);
}
console.log('pvEventMapping: all smoke tests passed');