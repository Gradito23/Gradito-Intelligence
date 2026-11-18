export function matchCriteriaFromEvent(event, { jobSnapshot = null, eventChefsForEvent = [] } = {}) {
  if (!event) return null;

  const cuisines = Array.isArray(event.cuisines_served) && event.cuisines_served.length > 0
    ? event.cuisines_served
    : (jobSnapshot?.cuisines_served || []);

  const guestCount = event.guest_count != null && event.guest_count !== ''
    ? Number(event.guest_count)
  : jobSnapshot?.guest_count != null
    ? Number(jobSnapshot.guest_count)
    : null;

  const budgetRaw = Number(event.chef_food_budget) || Number(event.experience_fee) || 0;
  const budget = budgetRaw > 0 ? budgetRaw : null;

  const filledRoles = (eventChefsForEvent || [])
    .filter((ec) => ec.chef_name?.trim())
    .map((ec) => ({ role: ec.role, chef_name: ec.chef_name }));

  const openRoles = (jobSnapshot?.staffing_roles || [])
    .filter((r) => !r.filled)
    .map((r) => r.role);

  const eventGeo =
    event.geo_lat != null && event.geo_lng != null
      ? { lat: Number(event.geo_lat), lng: Number(event.geo_lng) }
      : null;

  return {
    client_name: event.client_name || null,
    service_area: event.service_area || jobSnapshot?.service_area || null,
    date: event.date || jobSnapshot?.event_date || null,
    event_geo: eventGeo,
    cuisines,
    guest_count: Number.isNaN(guestCount) ? null : guestCount,
    budget,
    event_type: event.event_type || jobSnapshot?.event_type || null,
    experience_type: event.experience_type || jobSnapshot?.experience_type || null,
    dietary: null,
    vibe: null,
    _staffing: {
      filled_roles: filledRoles,
      open_roles: openRoles,
      needs_head: openRoles.some((r) => /head/i.test(r)) || filledRoles.length === 0,
      needs_sous: (guestCount || 0) >= 15,
    },
  };
}

export function staffingContextFromCriteria(criteria) {
  const s = criteria?._staffing || {};
  return {
    needs_head: Boolean(s.needs_head),
    needs_sous: Boolean(s.needs_sous),
    filled_roles: s.filled_roles || [],
    open_roles: s.open_roles || [],
  };
}