import { supabase } from '@/api/supabaseClient';

export const QuoCommunicationRepository = {
  async listByChefId(chefId, { limit = 100 } = {}) {
    const { data, error } = await supabase
      .from('quo_communication_events')
      .select('*')
      .eq('chef_id', chefId)
      .order('occurred_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data ?? [];
  },

  async listByProspectId(prospectId, { limit = 100 } = {}) {
    const { data, error } = await supabase
      .from('quo_communication_events')
      .select('*')
      .eq('prospect_id', prospectId)
      .order('occurred_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data ?? [];
  },
};