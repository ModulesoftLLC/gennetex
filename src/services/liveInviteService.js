import { firebaseInsert, firebaseList, firebaseSubscribe, firebaseUpdate } from '../lib/firebaseAdapter';
import * as notifyApi from './notificationService';
import { CALLS_CHANNEL } from './notificationService';
import { resolveKind, KIND_LIVE } from './meetingService';

const timeValue = (value) => value?.toMillis?.() ?? new Date(value || 0).getTime();

export async function fetchPendingLiveInvites(userId) {
  if (!userId) return [];
  const rows = await firebaseList('live_invites', { whereClauses: [{ field: 'invitee_id', op: '==', value: userId }] });
  return rows.filter((row) => row.status === 'pending')
    .sort((a, b) => timeValue(b.created_at || b.createdAt) - timeValue(a.created_at || a.createdAt));
}

export async function fetchActiveLives() {
  const data = await firebaseList('meetings', { whereClauses: [{ field: 'status', op: '==', value: 'active' }] });
  return (data || []).sort((a, b) => timeValue(b.started_at) - timeValue(a.started_at)).slice(0, 50)
    .filter((r) => resolveKind(r) === KIND_LIVE)
    .map((r) => ({
      id: r.id,
      host_id: r.host_id,
      host_name: r.host_name,
      title: r.title,
      started_at: r.started_at,
    }));
}

export async function fetchLiveComments(liveId, limit = 100) {
  if (!liveId) return [];
  const data = await firebaseList('live_comments', { whereClauses: [{ field: 'live_id', op: '==', value: liveId }] });
  return (data || []).sort((a, b) => timeValue(a.created_at || a.createdAt) - timeValue(b.created_at || b.createdAt)).slice(-limit);
}

export async function postLiveComment({ liveId, userId, userName, content }) {
  const text = String(content || '').trim();
  if (!liveId || !text) throw new Error('Сэтгэгдэл хоосон');
  return firebaseInsert('live_comments', {
      live_id: liveId,
      user_id: userId || null,
      user_name: userName || 'Ажилтан',
      content: text,
    });
}

export function subscribeLiveComments(liveId, onInsert) {
  if (!liveId) return () => {};
  let known = new Set();
  return firebaseSubscribe('live_comments', (rows) => {
    const sorted = [...rows].sort((a, b) => timeValue(a.created_at || a.createdAt) - timeValue(b.created_at || b.createdAt));
    sorted.forEach((row) => { if (!known.has(row.id)) onInsert?.(row); });
    known = new Set(rows.map((row) => row.id));
  }, { whereClauses: [{ field: 'live_id', op: '==', value: liveId }] });
}

export function isJoinRequest(text) {
  const t = String(text || '').toLowerCase().trim();
  return (
    /би\s*орж/.test(t) ||
    /оръя/.test(t) ||
    /оруул/.test(t) ||
    /оруулж\s*өг/.test(t) ||
    /join/.test(t) ||
    /оруулах/.test(t)
  );
}

/** Live хийж буй хүн ажилтныг урина — ringtone-той push */
export async function inviteToLive({
  liveId,
  hostId,
  hostName,
  inviteeId,
  inviteeName,
}) {
  if (!liveId || !inviteeId) throw new Error('Урилга дутуу');
  if (inviteeId === hostId) throw new Error('Өөрийгөө урих боломжгүй');

  // Хуучин pending урилгыг хаана
  const pending = await firebaseList('live_invites', { whereClauses: [
    { field: 'invitee_id', op: '==', value: inviteeId }, { field: 'status', op: '==', value: 'pending' },
  ] });
  await Promise.all(pending.map((row) => firebaseUpdate('live_invites', row.id, { status: 'expired' })));

  const data = await firebaseInsert('live_invites', {
      live_id: liveId,
      host_id: hostId,
      host_name: hostName || 'Ажилтан',
      invitee_id: inviteeId,
      invitee_name: inviteeName || 'Ажилтан',
      status: 'pending',
    });

  const phrase = `таныг ${hostName || 'Ажилтан'} live-д урьж байна`;
  try {
    await notifyApi.notifyUsers([inviteeId], {
      title: 'Live урилга',
      body: phrase,
      data: {
        type: 'live_invite',
        liveId: String(liveId),
        inviteId: String(data.id),
        hostName: String(hostName || 'Ажилтан'),
        hostId: String(hostId || ''),
      },
      channelId: CALLS_CHANNEL,
      priority: 'high',
    });
  } catch (e) {}

  return data;
}

export async function respondLiveInvite(inviteId, status) {
  return firebaseUpdate('live_invites', inviteId, { status });
}

export function subscribeLiveInvites(userId, onInvite) {
  if (!userId) return () => {};
  let lastId = null;
  return firebaseSubscribe('live_invites', (rows) => {
    const pending = rows.filter((row) => row.status === 'pending')
      .sort((a, b) => timeValue(b.created_at || b.createdAt) - timeValue(a.created_at || a.createdAt))[0];
    if (pending && pending.id !== lastId) { lastId = pending.id; onInvite?.(pending); }
  }, { whereClauses: [{ field: 'invitee_id', op: '==', value: userId }] });
}
