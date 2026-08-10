/** Initial form state + payload builders for revised chef intake. */

export function createEmptyIntakeForm() {
  return {
    // §1 Contact
    full_name: '',
    preferred_name: '',
    email: '',
    mobile: '',
    city: '',
    state: '',
    home_airport: '',
    has_vehicle: '',
    instagram_url: '',
    website_url: '',
    tiktok_url: '',
    linkedin_url: '',

    // §2 Professional
    professional_bio: '',
    resume_urls: [],
    current_position: '',
    current_company: '',
    years_cooking: '',
    languages: '',
    awards: '',

    // §3 Culinary
    cuisines: [],
    cuisine_other: '',
    dietary_specialties: [],
    dietary_other: '',
    confident_cuisines: '',
    exploring_cuisines: '',

    // §4 Story
    culinary_journey: '',
    hospitality_approach: '',
    what_makes_unique: '',
    guests_remember: '',
    clients_should_know: '',

    // §5 Career goals
    dream_dinner: '',
    dream_collaboration: '',
    dream_destination: '',
    growth_goals: '',
    gradito_opportunity_hope: '',

    // §6 Opportunities
    opp_private_dining: [],
    opp_events: [],
    opp_events_other: '',
    opp_education_media: [],
    opportunities_not_interested: '',

    // §7 Availability & pricing
    travel_distance: '',
    has_passport: '',
    ideal_events_per_period: '',
    preferred_event_days: [],
    lead_time: '',
    max_guest_count: '',
    commercial_kitchen_access: '',
    own_kitchen_max_guests: '',
    starting_event_fee_usd: '',
    starting_fee_flexible: '',
    expected_compensation_usd: '',

    // §8 Portfolio
    headshots: [],
    food_portfolio: [],
    event_photos: [],
    additional_files: [],
    share_links: '',

    // §9 Social
    youtube_url: '',
    newsletter_url: '',
    social_follower_band: '',
    media_history: '',

    // §10 Final
    anything_else: '',
    partnering_experience: '',

    // Legacy defaults used on approve for ops systems
    roles_available: 'Head',
    travel_policy: 'Home only',
    photo_url: '',
  };
}

export function splitFullName(fullName) {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first_name: '', last_name: '' };
  if (parts.length === 1) return { first_name: parts[0], last_name: parts[0] };
  return {
    first_name: parts[0],
    last_name: parts.slice(1).join(' '),
  };
}

export function validateIntakeForm(form) {
  const errors = [];
  const req = (cond, msg) => { if (!cond) errors.push(msg); };

  const nameParts = (form.full_name || '').trim().split(/\s+/).filter(Boolean);
  req(nameParts.length >= 2, 'Please enter your full name (first and last)');
  req(form.email?.trim(), 'Email is required');
  req(form.mobile?.trim(), 'Cell phone is required');
  req(form.city?.trim(), 'City is required');
  req(form.state?.trim(), 'State is required');
  req(form.has_vehicle === 'Yes' || form.has_vehicle === 'No', 'Vehicle access is required');

  req(form.professional_bio?.trim(), 'Professional bio is required');
  req(form.resume_urls?.length > 0, 'Resume upload is required');
  req(form.current_position?.trim(), 'Current position is required');
  req(form.years_cooking !== '' && form.years_cooking != null, 'Years cooking professionally is required');

  req(form.cuisines?.length > 0, 'Select at least one cuisine specialty');
  req(form.dietary_specialties?.length > 0, 'Select at least one dietary specialty');
  req(form.confident_cuisines?.trim(), 'Confident cuisines answer is required');

  req(form.culinary_journey?.trim(), 'Culinary journey is required');
  req(form.hospitality_approach?.trim(), 'Hospitality approach is required');
  req(form.what_makes_unique?.trim(), 'Unique dining answer is required');
  req(form.guests_remember?.trim(), 'Guest memory answer is required');

  const hasOpp = (form.opp_private_dining?.length || 0)
    + (form.opp_events?.length || 0)
    + (form.opp_education_media?.length || 0);
  req(hasOpp > 0, 'Select at least one opportunity preference');

  req(form.max_guest_count !== '' && Number(form.max_guest_count) > 0, 'Maximum guest count is required');
  if (form.own_kitchen_max_guests !== '' && form.own_kitchen_max_guests != null) {
    req(Number(form.own_kitchen_max_guests) > 0, 'Own kitchen guest limit must be a positive number');
  }
  req(
    form.expected_compensation_usd !== '' && Number(form.expected_compensation_usd) >= 0,
    'Expected salary / compensation is required',
  );

  return errors;
}

function parseLanguages(value) {
  if (!value?.trim()) return [];
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}

function mergeOther(selected, otherText) {
  if (!otherText?.trim()) return selected || [];
  const hasOther = (selected || []).some((v) => v.toLowerCase().includes('other'));
  if (!hasOther) return selected || [];
  return [...(selected || []).filter((v) => !v.toLowerCase().includes('other')), `Other: ${otherText.trim()}`];
}

export function buildIntakePayload(form) {
  const cuisines = mergeOther(form.cuisines, form.cuisine_other);
  const dietary = mergeOther(form.dietary_specialties, form.dietary_other);
  const oppEvents = mergeOther(form.opp_events, form.opp_events_other);
  const opportunity_preferences = [
    ...(form.opp_private_dining || []),
    ...oppEvents,
    ...(form.opp_education_media || []),
  ];

  const photo_url = form.photo_url || form.headshots?.[0] || null;

  const talent_profile = {
    professional_bio: form.professional_bio || null,
    confident_cuisines: form.confident_cuisines || null,
    exploring_cuisines: form.exploring_cuisines || null,
    culinary_journey: form.culinary_journey || null,
    hospitality_approach: form.hospitality_approach || null,
    what_makes_unique: form.what_makes_unique || null,
    guests_remember: form.guests_remember || null,
    clients_should_know: form.clients_should_know || null,
    dream_dinner: form.dream_dinner || null,
    dream_collaboration: form.dream_collaboration || null,
    dream_destination: form.dream_destination || null,
    growth_goals: form.growth_goals || null,
    gradito_opportunity_hope: form.gradito_opportunity_hope || null,
    opportunities_not_interested: form.opportunities_not_interested || null,
    headshots: form.headshots || [],
    food_portfolio: form.food_portfolio || [],
    event_photos: form.event_photos || [],
    additional_files: form.additional_files || [],
    share_links: form.share_links || null,
    anything_else: form.anything_else || null,
    partnering_experience: form.partnering_experience || null,
    opp_private_dining: form.opp_private_dining || [],
    opp_events: oppEvents,
    opp_education_media: form.opp_education_media || [],
  };

  const maxGuest = form.max_guest_count === '' ? null : Number(form.max_guest_count);
  const { first_name, last_name } = splitFullName(form.full_name);

  return {
    // Denorm / chef columns
    first_name,
    last_name,
    preferred_name: form.preferred_name?.trim() || null,
    email: form.email.trim() || null,
    mobile: form.mobile.trim() || null,
    photo_url,
    city: form.city.trim() || null,
    state: form.state.trim() || null,
    home_airport: form.home_airport?.trim() || null,
    has_vehicle: form.has_vehicle === 'Yes' ? true : form.has_vehicle === 'No' ? false : null,
    instagram_url: form.instagram_url?.trim() || null,
    website_url: form.website_url?.trim() || null,
    tiktok_url: form.tiktok_url?.trim() || null,
    linkedin_url: form.linkedin_url?.trim() || null,
    youtube_url: form.youtube_url?.trim() || null,
    newsletter_url: form.newsletter_url?.trim() || null,
    current_position: form.current_position?.trim() || null,
    current_company: form.current_company?.trim() || null,
    years_cooking: form.years_cooking === '' ? null : Number(form.years_cooking),
    awards: form.awards?.trim() || null,
    resume_url: form.resume_urls?.[0] || null,
    resume_urls: form.resume_urls || [],
    languages: parseLanguages(form.languages),
    cuisines,
    dietary_specialties: dietary,
    max_guest_count: maxGuest,
    max_solo_guests: maxGuest ?? 12,
    commercial_kitchen_access: form.commercial_kitchen_access || null,
    own_kitchen_max_guests:
      form.own_kitchen_max_guests === '' || form.own_kitchen_max_guests == null
        ? null
        : Number(form.own_kitchen_max_guests),
    starting_event_fee_usd: form.starting_event_fee_usd === '' ? null : Number(form.starting_event_fee_usd),
    starting_fee_flexible: form.starting_fee_flexible || null,
    expected_compensation_usd: form.expected_compensation_usd === '' ? null : Number(form.expected_compensation_usd),
    travel_distance: form.travel_distance || null,
    has_passport: form.has_passport === 'Yes' ? true : form.has_passport === 'No' ? false : null,
    ideal_events_per_period: form.ideal_events_per_period === '' ? null : Number(form.ideal_events_per_period),
    preferred_event_days: form.preferred_event_days || [],
    lead_time: form.lead_time || null,
    opportunity_preferences,
    social_follower_band: form.social_follower_band || null,
    media_history: form.media_history?.trim() || null,
    talent_profile,
    professional_bio: form.professional_bio || null,
    roles_available: form.roles_available || 'Head',
    travel_policy: form.travel_distance?.includes('International') || form.travel_distance?.includes('United States')
      ? 'Anywhere'
      : 'Home only',
    notes: form.professional_bio || null,
  };
}
