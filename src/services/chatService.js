import { supabase } from '../lib/supabase';
import * as notifyApi from './notificationService';
import { firebaseUploadUri } from '../lib/firebaseAdapter';

const TABLE = 'messages';
const BUCKET = 'chat';

// Чатын зураг/видео/файлыг Storage-д байршуулж URL буцаана
export async function uploadChatFile(uri, { room, mimeType, name } = {}) {
  const safeName = (name || `${Date.now()}`).replace(/[^\w.\-]/g, '_');
  const path = `${room || 'general'}/${Date.now()}_${safeName}`;
  const contentType = mimeType || 'application/octet-stream';

  return firebaseUploadUri(`${BUCKET}/${path}`, uri, contentType);
}

export async function fetchMessages(room = 'general', limit = 100) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('room', room)
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function sendMessage({
  room = 'general',
  senderId,
  senderName,
  content = '',
  attachmentUrl = null,
  attachmentType = null,
  attachmentName = null,
}) {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      room,
      sender_id: senderId,
      sender_name: senderName,
      content,
      attachment_url: attachmentUrl,
      attachment_type: attachmentType,
      attachment_name: attachmentName,
    })
    .select()
    .single();
  if (error) throw error;
  try {
    await notifyApi.notifyChatMembers(room, senderId, {
      senderName,
      content,
      attachmentType,
    });
  } catch (e) {}
  return data;
}

export async function updateMessage(messageId, userId, content) {
  const body = String(content || '').trim();
  if (!body) throw new Error('Мессеж хоосон байж болохгүй');
  const { data, error } = await supabase
    .from(TABLE)
    .update({ content: body, edited_at: new Date().toISOString() })
    .eq('id', messageId)
    .eq('sender_id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteMessage(messageId, userId) {
  const { error } = await supabase.from(TABLE).delete().eq('id', messageId).eq('sender_id', userId);
  if (error) throw error;
}

// ---- Яриа (conversations) ----

function dmKey(a, b) {
  return ['dm', ...[a, b].sort()].join('_');
}

async function ensureDirectMembers(conversation, me, other) {
  const existing = await fetchConversationMembers(conversation.id);
  const memberIds = new Set(existing.map((member) => member.user_id));
  const missing = [
    { id: me.id, name: me.name },
    { id: other.id, name: other.name },
  ].filter((member) => !memberIds.has(member.id))
    .map((member) => ({
      conversation_id: conversation.id,
      user_id: member.id,
      user_name: member.name,
    }));
  if (missing.length) {
    const { error } = await supabase.from('conversation_members').insert(missing);
    if (error) throw error;
  }
}

// 1:1 яриа олох эсвэл үүсгэх
export async function getOrCreateDirect(me, other) {
  const key = dmKey(me.id, other.id);
  const { data: found } = await supabase
    .from('conversations')
    .select('*')
    .eq('dm_key', key)
    .maybeSingle();
  if (found) {
    await ensureDirectMembers(found, me, other);
    return found;
  }

  const { data: conv, error } = await supabase
    .from('conversations')
    .insert({ is_group: false, dm_key: key, created_by: me.id })
    .select()
    .single();
  if (error) throw error;

  await ensureDirectMembers(conv, me, other);
  return conv;
}

// Хуучин алдаатай array insert-ээс үүссэн membership-үүдийг dm_key-ээр сэргээнэ.
// dm_key-г задалдаггүй тул underscore-той хэрэглэгчийн ID ч найдвартай ажиллана.
export async function recoverDirectConversations(userId, users = []) {
  if (!userId || !users.length) return;
  const usersByKey = new Map(
    users
      .filter((user) => user?.id && user.id !== userId)
      .map((user) => [dmKey(userId, user.id), user])
  );
  if (!usersByKey.size) return;

  const { data: conversations, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('is_group', false);
  if (error) throw error;

  const broken = (conversations || []).filter((conversation) => usersByKey.has(conversation.dm_key));
  if (!broken.length) return;

  const { data: existing, error: membersError } = await supabase
    .from('conversation_members')
    .select('conversation_id, user_id')
    .in('conversation_id', broken.map((conversation) => conversation.id));
  if (membersError) throw membersError;

  const memberKeys = new Set(
    (existing || []).map((member) => `${member.conversation_id}:${member.user_id}`)
  );
  const rows = [];
  broken.forEach((conversation) => {
    const other = usersByKey.get(conversation.dm_key);
    [userId, other.id].forEach((memberId) => {
      if (!memberKeys.has(`${conversation.id}:${memberId}`)) {
        rows.push({
          conversation_id: conversation.id,
          user_id: memberId,
          user_name: memberId === userId ? '' : other.name || 'Ажилтан',
        });
      }
    });
  });
  if (!rows.length) return;
  const { error: insertError } = await supabase.from('conversation_members').insert(rows);
  if (insertError) throw insertError;
}

// Групп үүсгэх
export async function createGroup(me, name, members) {
  const { data: conv, error } = await supabase
    .from('conversations')
    .insert({ is_group: true, name, created_by: me.id })
    .select()
    .single();
  if (error) throw error;

  const rows = [{ conversation_id: conv.id, user_id: me.id, user_name: me.name }];
  for (const m of members) {
    if (m.id !== me.id) rows.push({ conversation_id: conv.id, user_id: m.id, user_name: m.name });
  }
  await supabase.from('conversation_members').insert(rows);
  return conv;
}

// Миний яриануудыг татах (сүүлийн мессежтэй нь)
export async function fetchMyConversations(userId) {
  const { data: memberships, error } = await supabase
    .from('conversation_members')
    .select('conversation_id')
    .eq('user_id', userId);
  if (error) throw error;
  const ids = (memberships || []).map((m) => m.conversation_id);
  if (ids.length === 0) return [];

  const { data: convs } = await supabase
    .from('conversations')
    .select('*')
    .in('id', ids);

  const { data: allMembers } = await supabase
    .from('conversation_members')
    .select('conversation_id, user_id, user_name')
    .in('conversation_id', ids);

  // Сүүлийн мессежүүд
  const { data: lastMsgs } = await supabase
    .from(TABLE)
    .select('room, content, created_at, sender_id, sender_name, attachment_type')
    .in('room', ids)
    .order('created_at', { ascending: false });

  const result = (convs || []).map((c) => {
    const members = (allMembers || []).filter((m) => m.conversation_id === c.id);
    const last = (lastMsgs || []).find((m) => m.room === c.id);
    let title = c.name;
    if (!c.is_group) {
      const other = members.find((m) => m.user_id !== userId);
      title = other?.user_name || 'Ажилтан';
    }
    return { ...c, members, title, last };
  });

  result.sort((a, b) => {
    const ta = a.last?.created_at || a.created_at;
    const tb = b.last?.created_at || b.created_at;
    return new Date(tb) - new Date(ta);
  });
  return result;
}

export function subscribeConversations(userId, onChange) {
  const channel = supabase
    .channel(`conv-${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'conversation_members'}, () => onChange())
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: TABLE }, () => onChange())
    .subscribe();
  return () => supabase.removeChannel(channel);
}

// Шинэ/зассан/устгасан мессежийг real-time сонсох
export function subscribeMessages(room, handlers) {
  const onInsert = typeof handlers === 'function' ? handlers : handlers?.onInsert;
  const onUpdate = typeof handlers === 'function' ? null : handlers?.onUpdate;
  const onDelete = typeof handlers === 'function' ? null : handlers?.onDelete;

  const channel = supabase
    .channel(`messages-${room}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: TABLE, filter: `room=eq.${room}` },
      (payload) => onInsert?.(payload.new)
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: TABLE, filter: `room=eq.${room}` },
      (payload) => onUpdate?.(payload.new)
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: TABLE, filter: `room=eq.${room}` },
      (payload) => onDelete?.(payload.old)
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}

export async function fetchConversationMembers(conversationId) {
  const { data, error } = await supabase
    .from('conversation_members')
    .select('user_id, user_name')
    .eq('conversation_id', conversationId);
  if (error) throw error;
  return data || [];
}

export async function addGroupMembers(conversationId, members) {
  const existing = await fetchConversationMembers(conversationId);
  const have = new Set(existing.map((m) => m.user_id));
  const rows = members
    .filter((m) => m.id && !have.has(m.id))
    .map((m) => ({ conversation_id: conversationId, user_id: m.id, user_name: m.name }));
  if (!rows.length) return [];
  const { data, error } = await supabase.from('conversation_members').insert(rows).select();
  if (error) throw error;
  return data || [];
}

export async function fetchMyChatFiles(userId, limit = 150) {
  const convs = await fetchMyConversations(userId);
  const ids = convs.map((c) => c.id);
  if (!ids.length) return [];
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .in('room', ids)
    .not('attachment_url', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}
