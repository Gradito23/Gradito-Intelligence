import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useEvents, useEventChefs, useClients, useChefs, formatCurrency } from '@/hooks/useAppData';
import { useQueryClient } from '@tanstack/react-query';
import StatCard from '@/components/ui/StatCard';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import EventDetailPanel from '@/components/events/EventDetailPanel';
import CreateEventModal from '@/components/events/CreateEventModal';
import { Calendar, DollarSign, TrendingUp, Users, Plus, CalendarPlus } from 'lucide-react';
import { SERVICE_AREAS } from '@/lib/constants';
import { toast } from '@/components/ui/use-toast';

const STATUS_COLORS = {
  Completed: 'bg-emerald-100 text-emerald-800',
  Confirmed: 'bg-blue-100 text-blue-800',
  Cancelled: 'bg-red-100 text-red-800',
};

export default function Events() {
  const queryClient = useQueryClient();
  const { data: events } = useEvents();
  const { data: eventChefs } = useEventChefs();
  const { data: clients } = useClients();
  const { data: chefs } = useChefs();
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [filterArea, setFilterArea] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');

  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      if (filterArea !== 'all' && e.service_area !== filterArea) return false;
      if (filterStatus !== 'all' && e.status !== filterStatus) return false;
      if (filterType !== 'all' && e.event_type !== filterType) return false;
      return true;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [events, filterArea, filterStatus, filterType]);

  const now = new Date();
  const ytdEvents = events.filter(e => new Date(e.date).getFullYear() === now.getFullYear());
  const totalPayouts = eventChefs.reduce((s, ec) => s + (ec.fee || 0) + (ec.travel_fee_applied || 0), 0);
  const totalRevenue = events.reduce((s, e) => s + (e.client_revenue || 0), 0);
  const margin = totalRevenue - totalPayouts;

  const clientCounts = {};
  events.forEach((e) => {
    const key = e.client_id
      || (e.client_name ? `name:${String(e.client_name).trim().toLowerCase().replace(/\s+/g, ' ')}` : null);
    if (!key) return;
    clientCounts[key] = (clientCounts[key] || 0) + 1;
  });
  const repeatRate = Object.keys(clientCounts).length > 0
    ? Math.round((Object.values(clientCounts).filter(c => c > 1).length / Object.keys(clientCounts).length) * 100)
    : 0;

  const activeChefIds = new Set(eventChefs.map(ec => ec.chef_id));
  const idleCount = chefs.length - activeChefIds.size;

  // Inline status change
  const handleStatusChange = async (event, newStatus, e) => {
    e.stopPropagation();
    await base44.entities.Event.update(event.id, { status: newStatus });
    await base44.entities.ActivityLog.create({
      actor: 'Team', action: 'Updated', entity_type: 'Event', entity_label: event.client_name,
      summary: `Changed status of ${event.client_name} event to ${newStatus}`,
    });
    queryClient.invalidateQueries({ queryKey: ['events'] });
    toast({ title: `Event status → ${newStatus}` });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold">Events</h1>
          <p className="text-muted-foreground mt-1">Event ledger and performance tracking</p>
        </div>
        <Button onClick={() => setShowCreateEvent(true)} className="bg-navy hover:bg-navy/90 text-white">
          <Plus size={16} className="mr-2" /> Create Event
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard title="Events YTD" value={ytdEvents.length} icon={Calendar} />
        <StatCard title="Total Revenue" value={formatCurrency(totalRevenue)} subtitle={`Margin: ${formatCurrency(margin)}`} icon={TrendingUp} />
        <StatCard title="Total Payouts" value={formatCurrency(totalPayouts)} icon={DollarSign} accent />
        <StatCard title="Repeat-Client Rate" value={`${repeatRate}%`} subtitle={`${idleCount} idle chefs`} icon={Users} />
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={filterArea} onValueChange={setFilterArea}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Area" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Areas</SelectItem>
            {SERVICE_AREAS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="Confirmed">Confirmed</SelectItem>
            <SelectItem value="Cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Private">Private</SelectItem>
            <SelectItem value="Corporate">Corporate</SelectItem>
            <SelectItem value="Wedding">Wedding</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredEvents.length > 0 ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-secondary/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Client</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Area</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Type</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Guests</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Revenue</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map(event => (
                  <tr
                    key={event.id}
                    className="border-b hover:bg-secondary/30 cursor-pointer transition-colors group"
                    onClick={() => setSelectedEvent(event)}
                  >
                    <td className="p-3 whitespace-nowrap">{new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                    <td className="p-3 font-medium">{event.client_name || '—'}</td>
                    <td className="p-3">{event.service_area}</td>
                    <td className="p-3"><Badge variant="outline" className="text-xs">{event.event_type}</Badge></td>
                    <td className="p-3">{event.guest_count}</td>
                    <td className="p-3 text-right font-medium">{formatCurrency(event.client_revenue || 0)}</td>
                    {/* Inline status editor */}
                    <td className="p-3" onClick={e => e.stopPropagation()}>
                      <Select value={event.status} onValueChange={val => handleStatusChange(event, val, { stopPropagation: () => {} })}>
                        <SelectTrigger className={`h-6 w-28 text-xs border-0 ${STATUS_COLORS[event.status] || ''}`} onClick={e => e.stopPropagation()}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Confirmed">Confirmed</SelectItem>
                          <SelectItem value="Completed">Completed</SelectItem>
                          <SelectItem value="Cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-xl">
          <CalendarPlus size={40} className="mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="font-heading text-lg font-semibold mb-1">No events yet</p>
          <p className="text-muted-foreground text-sm mb-4">Log your first event to start tracking performance</p>
          <Button onClick={() => setShowCreateEvent(true)} className="bg-gold hover:bg-gold/80 text-white">
            <Plus size={16} className="mr-2" /> Log an event
          </Button>
        </div>
      )}

      <EventDetailPanel
        event={selectedEvent}
        chefs={chefs}
        eventChefs={eventChefs}
        open={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />

      <CreateEventModal
        open={showCreateEvent}
        onClose={() => setShowCreateEvent(false)}
        chefs={chefs}
        clients={clients}
        eventChefs={eventChefs}
        prefillChef={null}
      />
    </div>
  );
}