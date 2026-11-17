import {
  parseClientNameFromPvEvent,
  buildInsertNotes,
  pvMinutesToDisplayTime,
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

if (failures.length) {
  console.error('FAILED:', failures.join(', '));
  process.exit(1);
}
console.log('pvEventMapping: all smoke tests passed');