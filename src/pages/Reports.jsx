import React, { useMemo } from 'react';
import { useEvents, useEventChefs, useChefs, formatCurrency, getChefKPIs } from '@/hooks/useAppData';

import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import GoldStars from '@/components/ui/GoldStars';
import ChefAvatar from '@/components/ui/ChefAvatar';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const CHART_COLORS = ['#14213D', '#B8924F', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6366F1', '#EF4444'];

export default function Reports() {
  const { data: events } = useEvents();
  const { data: eventChefs } = useEventChefs();
  const { data: chefs } = useChefs();
  // By Area — Billable Revenue (excludes gratuity/tax/CC; see Profitability tab for margins)
  const areaData = useMemo(() => {
    const map = {};
    events.forEach(e => {
      if (!map[e.service_area]) map[e.service_area] = { area: e.service_area, events: 0, revenue: 0 };
      map[e.service_area].events += 1;
      // Use stored client_revenue as proxy for billable revenue (written on save)
      map[e.service_area].revenue += (e.client_revenue || 0);
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [events]);

  // By Cuisine
  const cuisineData = useMemo(() => {
    const map = {};
    events.forEach(e => {
      (e.cuisines_served || []).forEach(c => {
        if (!map[c]) map[c] = { cuisine: c, events: 0, revenue: 0 };
        map[c].events += 1;
        map[c].revenue += (e.client_revenue || 0) / (e.cuisines_served || []).length;
      });
    });
    return Object.values(map).sort((a, b) => b.events - a.events);
  }, [events]);

  // By Chef (leaderboard)
  const chefLeaderboard = useMemo(() => {
    return chefs.map(c => {
      const kpis = getChefKPIs(c, events, eventChefs);
      return { chef: c, ...kpis };
    }).sort((a, b) => b.totalEarnings - a.totalEarnings);
  }, [chefs, events, eventChefs]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold">Reports</h1>
        <p className="text-muted-foreground mt-1">Master analytics by area, cuisine, and chef</p>
      </div>

      <Tabs defaultValue="area">
        <TabsList className="mb-4">
          <TabsTrigger value="area">By Area</TabsTrigger>
          <TabsTrigger value="cuisine">By Cuisine</TabsTrigger>
          <TabsTrigger value="chef">By Chef</TabsTrigger>
        </TabsList>

        <TabsContent value="area" className="space-y-4">
          <Card className="p-6">
            <h3 className="font-heading font-semibold mb-1">Booking Volume by Service Area</h3>
            <p className="text-xs text-muted-foreground mb-4">Billable Revenue (excl. gratuity, tax, CC fees) — for net profit see the Profitability tab</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={areaData}>
                <XAxis dataKey="area" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Bar dataKey="revenue" fill="#14213D" radius={[4, 4, 0, 0]} name="Booking Volume" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium text-muted-foreground">Area</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Events</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Booking Volume</th>
                </tr>
              </thead>
              <tbody>
                {areaData.map(d => (
                  <tr key={d.area} className="border-b">
                    <td className="p-3 font-medium">{d.area}</td>
                    <td className="p-3 text-right">{d.events}</td>
                    <td className="p-3 text-right">{formatCurrency(d.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="cuisine" className="space-y-4">
          <Card className="p-6">
            <h3 className="font-heading font-semibold mb-4">Events by Cuisine</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={cuisineData} dataKey="events" nameKey="cuisine" cx="50%" cy="50%" outerRadius={100} label={({ cuisine, events }) => `${cuisine} (${events})`}>
                  {cuisineData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium text-muted-foreground">Cuisine</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Events</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Est. Revenue</th>
                </tr>
              </thead>
              <tbody>
                {cuisineData.map(d => (
                  <tr key={d.cuisine} className="border-b">
                    <td className="p-3 font-medium">{d.cuisine}</td>
                    <td className="p-3 text-right">{d.events}</td>
                    <td className="p-3 text-right">{formatCurrency(d.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="chef" className="space-y-4">
          <Card className="p-6">
            <h3 className="font-heading font-semibold mb-4">Chef Leaderboard</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chefLeaderboard.slice(0, 10).map(c => ({ name: `${c.chef.first_name} ${c.chef.last_name[0]}.`, earnings: c.totalEarnings }))}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Bar dataKey="earnings" fill="#B8924F" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <div className="space-y-2">
            {chefLeaderboard.map((entry, i) => (
              <Card key={entry.chef.id} className="p-3 flex items-center gap-3">
                <span className="text-sm font-bold text-muted-foreground w-6 text-right">{i + 1}</span>
                <ChefAvatar photoUrl={entry.chef.photo_url} name={`${entry.chef.first_name} ${entry.chef.last_name}`} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{entry.chef.first_name} {entry.chef.last_name}</p>
                  <GoldStars rating={entry.chef.quality_rating} size={10} />
                </div>
                <div className="text-right text-sm">
                  <p className="font-heading font-bold text-gold">{formatCurrency(entry.totalEarnings)}</p>
                  <p className="text-xs text-muted-foreground">{entry.eventsCount} events</p>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}