import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export function useChefs() {
  return useQuery({
    queryKey: ['chefs'],
    queryFn: () => base44.entities.Chef.list('-quality_rating', 100),
    initialData: [],
  });
}

export function useClients() {
  return useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date', 100),
    initialData: [],
  });
}

export function useEvents() {
  return useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list('-date', 200),
    initialData: [],
  });
}

export function useEventChefs() {
  return useQuery({
    queryKey: ['eventChefs'],
    queryFn: () => base44.entities.EventChef.list('-created_date', 500),
    initialData: [],
  });
}

export function useServiceAreas() {
  return useQuery({
    queryKey: ['serviceAreas'],
    queryFn: () => base44.entities.ServiceArea.list('name', 50),
    initialData: [],
  });
}

export function useActivityLogs() {
  return useQuery({
    queryKey: ['activityLogs'],
    queryFn: () => base44.entities.ActivityLog.list('-created_date', 100),
    initialData: [],
  });
}

export function useMatchRuns() {
  return useQuery({
    queryKey: ['matchRuns'],
    queryFn: () => base44.entities.MatchRun.list('-created_date', 50),
    initialData: [],
  });
}

export function useChefIntakeRequests() {
  return useQuery({
    queryKey: ['chefIntakeRequests'],
    queryFn: () => base44.entities.ChefIntakeRequest.list('-created_date', 200),
    initialData: [],
  });
}

export function useTeamMembers() {
  return useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list('first_name', 50),
    initialData: [],
  });
}

export function useCommissionLines() {
  return useQuery({
    queryKey: ['commissionLines'],
    queryFn: () => base44.entities.CommissionLine.list('-created_date', 500),
    initialData: [],
  });
}

// Computed KPI helpers
export function getChefKPIs(chef, events, eventChefs) {
  const chefAssignments = eventChefs.filter(ec => ec.chef_id === chef.id);
  const eventIds = [...new Set(chefAssignments.map(ec => ec.event_id))];
  const chefEvents = events.filter(e => eventIds.includes(e.id));
  const totalFees = chefAssignments.reduce((sum, ec) => sum + (ec.fee || 0), 0);
  const headFees = chefAssignments.filter(ec => ec.role === 'Head').reduce((sum, ec) => sum + (ec.fee || 0), 0);
  const sousFees = chefAssignments.filter(ec => ec.role === 'Sous').reduce((sum, ec) => sum + (ec.fee || 0), 0);

  const cuisineCounts = {};
  chefEvents.forEach(e => (e.cuisines_served || []).forEach(c => { cuisineCounts[c] = (cuisineCounts[c] || 0) + 1; }));
  const mostBookedCuisine = Object.entries(cuisineCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

  const clientEventCounts = {};
  chefEvents.forEach((e) => {
    const key = e.client_id
      || (e.client_name ? `name:${String(e.client_name).trim().toLowerCase().replace(/\s+/g, ' ')}` : null);
    if (!key) return;
    clientEventCounts[key] = (clientEventCounts[key] || 0) + 1;
  });
  const clientKeys = Object.keys(clientEventCounts);
  const repeatClients = Object.values(clientEventCounts).filter(c => c > 1).length;

  return {
    eventsCount: chefEvents.length,
    totalEarnings: totalFees,
    headEarnings: headFees,
    sousEarnings: sousFees,
    mostBookedCuisine,
    clientsWorkedWith: clientKeys.length,
    repeatClients,
  };
}

export function getClientKPIs(client, events, eventChefs) {
  const clientEvents = events.filter(e => e.client_id === client.id);
  const totalRevenue = clientEvents.reduce((sum, e) => sum + (e.client_revenue || 0), 0);
  const eventIds = clientEvents.map(e => e.id);
  const chefIds = [...new Set(eventChefs.filter(ec => eventIds.includes(ec.event_id)).map(ec => ec.chef_id))];
  return {
    eventsCount: clientEvents.length,
    totalRevenue,
    chefsWorkedWith: chefIds.length,
    isRepeat: clientEvents.length > 1,
  };
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}