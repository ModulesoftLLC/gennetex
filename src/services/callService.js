import { firebaseSubscribe, firebaseGetOne, firebaseInsert, firebaseUpdate } from '../lib/firebaseAdapter';
import { isSupabaseApiConfigured } from '../lib/supabase'; // Keep this if you still need to check for Supabase config elsewhere
import * as notifyApi from './notificationService';

const TABLE = 'call_sessions';

// Дуудлага эхлүүлэх (ringing) — нөгөө хэрэглэгч рүү дохио явна
export async function startCall({ room, caller, callee }) {
  // Supabase-ийн оронд Firebase-ийн insert функцийг ашиглана
  const newCall = {
    room,
    caller_id: caller.id,
    caller_name: caller.name,
    callee_id: callee.id,
    callee_name: callee.name,
    status: 'ringing',
  };
  const data = await firebaseInsert(TABLE, newCall);

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
  // Supabase-ийн оронд Firebase-ийн update функцийг ашиглана
  await firebaseUpdate(TABLE, id, { status });
}

export async function fetchCallById(callId) {
  if (!callId) return null;
  // isSupabaseApiConfigured шалгалтыг хасаж, зөвхөн Firebase-ийг ашиглана
  return firebaseGetOne(TABLE, callId);
}

// Над руу ирж буй дуудлагыг real-time сонсох
export function subscribeIncomingCalls(userId, onCall) {

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
