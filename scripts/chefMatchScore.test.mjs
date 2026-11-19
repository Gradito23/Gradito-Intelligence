/**
 * Geo match smoke tests (no Vite alias — imports geo helpers only).
 */
import {
  buildAreaIndex,
  compareGeoRank,
  evaluateGeoEligibility,
  isChefLocal,
} from '../src/lib/geoMatch.js';

const serviceAreas = [
  { name: 'Manhattan', region: 'Manhattan', centroid_lat: 40.7831, centroid_lng: -73.9712 },
  { name: 'Brooklyn', region: 'Brooklyn', centroid_lat: 40.6782, centroid_lng: -73.9442 },
  { name: 'The Hamptons', region: 'The Hamptons', centroid_lat: 40.9635, centroid_lng: -72.1848 },
];

const areaIndex = buildAreaIndex(serviceAreas);
const context = { serviceAreas, areaIndex };

const chefManhattan = {
  home_areas: ['Manhattan'],
  travel_policy: 'Home only',
};

const chefBrooklynTravel = {
  home_areas: ['Brooklyn'],
  travel_policy: 'Anywhere',
};

const chefHomeOnlyOut = {
  home_areas: ['Brooklyn'],
  travel_policy: 'Home only',
};

const chefSelectNoHamptons = {
  home_areas: ['Manhattan'],
  travel_policy: 'Select areas',
  travel_fees: [{ service_area: 'Brooklyn', fee: 100 }],
};

const failures = [];
function check(name, ok) {
  if (!ok) failures.push(name);
}

check('local detection', isChefLocal(chefManhattan, 'Manhattan'));
check(
  'home only ineligible',
  evaluateGeoEligibility(chefHomeOnlyOut, 'Manhattan').eligible === false,
);
check(
  'select areas hamptons ineligible',
  evaluateGeoEligibility(chefSelectNoHamptons, 'The Hamptons').eligible === false,
);

const localRow = { isLocal: true, distanceKm: 0, talentScore: 80 };
const travelRow = { isLocal: false, distanceKm: 50, talentScore: 99 };
check('geo sort local first', compareGeoRank(localRow, travelRow) < 0);

check(
  'travel policy allows',
  evaluateGeoEligibility(chefBrooklynTravel, 'Manhattan').eligible === true,
);

if (failures.length) {
  console.error('FAIL:', failures);
  process.exit(1);
}
console.log('chefMatchScore geo tests OK');