import { supabase } from '../lib/supabase';
import * as notifyApi from './notificationService';

const TABLE = 'service_calls';

export function mapServiceCallRow(r) {
  if (!r) return null;
  return {
    id: r.id,
    customer: r.customer,
    phone: r.phone || '',
    address: r.address || '',
    problem: r.problem || '',
    type: r.call_type || 'other',
    engineer: r.engineer_name || '',
    engineer_id: r.engineer_id,
    latitude: r.latitude,
    longitude: r.longitude,
    status: r.status || 'Хүлээгдэж буй',
    created_at: r.created_at,
  };
}

export async function fetchServiceCalls({ engineerId, engineerName } = {}) {
  if (engineerId) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('engineer_id', engineerId)
      .order('created_at', { ascending: false })
      .limit(300);
    if (error) throw error;
    let rows = (data || []).map(mapServiceCallRow);
    if (!rows.length && engineerName) {
      const { data: byName, error: nameErr } = await supabase
        .from(TABLE)
        .select('*')
        .ilike('engineer_name', engineerName.trim())
        .order('created_at', { ascending: false })
        .limit(300);
      if (nameErr) throw nameErr;
      rows = (byName || []).map(mapServiceCallRow);
    }
    return rows;
  }

  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(300);
  if (error) throw error;
  let rows = (data || []).map(mapServiceCallRow);
  if (engineerName) {
    const n = engineerName.trim().toLowerCase();
    rows = rows.filter((c) => (c.engineer || '').trim().toLowerCase() === n);
  }
  return rows;
}

export async function createServiceCall(payload) {
  const row = {
    customer: String(payload.customer || '').trim(),
    phone: payload.phone?.trim() || null,
    address: payload.address?.trim() || null,
    problem: payload.problem?.trim() || null,
    call_type: payload.type || payload.call_type || 'other',
    engineer_id: payload.engineer_id || null,
    engineer_name: payload.engineer_name || payload.engineer?.trim() || null,
    latitude: payload.latitude ?? null,
    longitude: payload.longitude ?? null,
    status: 'Хүлээгдэж буй',
    created_by: payload.created_by || null,
  };
  const { data, error } = await supabase.from(TABLE).insert(row).select().single();
  if (error) throw error;
  const call = mapServiceCallRow(data);

  if (call.engineer_id) {
    try {
      await notifyApi.notifyUsers([call.engineer_id], {
        title: 'Шинэ дуудлага',
        body: `${call.customer}${call.address ? ` · ${call.address}` : ''}`,
        data: { type: 'service_call', callId: call.id },
        channelId: 'chat',
      });
    } catch (e) {}
  }

  return call;
}

export async function updateServiceCallStatus(id, status) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return mapServiceCallRow(data);
}

export function subscribeServiceCalls(onChange) {
  const channel = supabase
    .channel('service-calls-sync')
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, () => onChange())
    .subscribe();
  return () => supabase.removeChannel(channel);
}
