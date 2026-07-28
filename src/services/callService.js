import { supabase, isSupabaseApiConfigured } from '../lib/supabase';
import { firebaseSubscribe, firebaseGetOne } from '../lib/firebaseAdapter';
import * as notifyApi from './notificationService';

const TABLE = 'call_sessions';

// Дуудлага эхлүүлэх (ringing) — нөгөө хэрэглэгч рүү дохио явна
export async function startCall({ room, caller, callee }) {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      room,
      caller_id: caller.id,
      caller_name: caller.name,
      callee_id: callee.id,
      callee_name: callee.name,
      status: 'ringing',
    })
    .select()
    .single();
  if (error) throw error;
  try {
    await notifyApi.notifyIncomingCall(callee.id, {
      callerName: caller.name,
      room,
      callId: data.id,
    });
  } catch (e) {}
  return data;
}

export async function setCallStatus(id, status) {
  const { error } = await supabase.from(TABLE).update({ status }).eq('id', id);
  if (error) throw error;
}

export async function fetchCallById(callId) {
  if (!callId) return null;
  if (isSupabaseApiConfigured) {
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', callId).maybeSingle();
    if (error) throw error;
    return data;
  }
  return firebaseGetOne(TABLE, callId);
}

// Над руу ирж буй дуудлагыг real-time сонсох
export function subscribeIncomingCalls(userId, onCall) {
  if (isSupabaseApiConfigured) {
    const channel = supabase
      .channel(`calls-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: TABLE, filter: `callee_id=eq.${userId}` },
        (payload) => onCall(payload.new)
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }

  return firebaseSubscribe(
    TABLE,
    (rows) => {
      const call = (rows || []).find((item) => item.callee_id === userId && item.status === 'ringing');
      if (call) onCall(call);
    },
    {
      whereClauses: [{ field: 'callee_id', op: '==', value: userId }],
      order: { field: 'createdAt', direction: 'desc' },
    }
  );
}

// Миний эхлүүлсэн дуудлагын төлөв өөрчлөгдөхийг сонсох (хариулсан/татгалзсан)
export function subscribeCallUpdates(callId, onUpdate) {
  if (isSupabaseApiConfigured) {
    const channel = supabase
      .channel(`call-${callId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: TABLE, filter: `id=eq.${callId}` },
        (payload) => onUpdate(payload.new)
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }

  return firebaseSubscribe(
    TABLE,
    (rows) => {
      const call = (rows || [])[0];
      if (call) onUpdate(call);
    },
    {
      whereClauses: [{ field: 'id', op: '==', value: callId }],
    }
  );
}
