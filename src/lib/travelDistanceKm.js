/** Map intake `travel_distance` to max travel radius in km (exclude when event is farther). */
const BAND_KM = {
  'Within 30 minutes of my home': 40,
  'Up to 1 hour by car': 80,
  'Up to 2 hours by car': 160,
  'Anywhere within my state': 500,
  'Anywhere within my region': 800,
  'Anywhere in the United States': 5000,
  'Internationally': null,
};

export function maxTravelKmFromChef(chef) {
  const raw = chef?.travel_distance?.trim();
  if (!raw) return null;
  if (Object.prototype.hasOwnProperty.call(BAND_KM, raw)) {
    return BAND_KM[raw];
  }
  return null;
}
