const { initAdmin } = require('./initFirebase');

function safeText(v, max = 2000) {
  const s = String(v ?? '').trim();
  return s.length > max ? s.slice(0, max - 3) + '...' : s;
}

async function insertTelegramChatMessage({ db }, row) {
  const doc = {
    sender_id: row.sender_id || null,
    sender_name: safeText(row.sender_name, 120),
    content: safeText(row.content, 4000),
    source: row.source,
    telegram_message_id: row.telegram_message_id ?? null,
    created_at: new Date(),
  };
  const ref = await db.collection('telegram_chat_messages').add(doc);
  return { id: ref.id };
}

async function fetchAllPushTokens({ db }, excludeUserId) {
  const q = db.collection('pushTokens');
  const snap = await q.get();
  const tokens = [];
  snap.forEach((d) => {
    const data = d.data();
    if (data && data.token && (!excludeUserId || data.userId !== excludeUserId)) tokens.push(data.token);
  });
  return [...new Set(tokens)];
}

async function sendExpoPush(tokens, payload) {
  if (!tokens || !tokens.length) return;
  for (let i = 0; i < tokens.length; i += 100) {
    const chunk = tokens.slice(i, i + 100);
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(
        chunk.map((to) => ({ to, ...payload })),
      ),
    });
  }
}

async function notifyTelegramChatPush(ctx, { senderName, content, excludeUserId }) {
  const tokens = await fetchAllPushTokens(ctx, excludeUserId);
  const preview = safeText(content, 160);
  await sendExpoPush(tokens, {
    title: `Telegram · ${safeText(senderName, 40)}`,
    body: preview,
    sound: 'default',
    priority: 'high',
    channelId: 'chat',
    data: { type: 'telegram_chat', senderName },
  });
}

function telegramSenderName(from) {
  if (!from || typeof from !== 'object') return 'Telegram';
  const first = String(from.first_name || '').trim();
  const last = String(from.last_name || '').trim();
  const user = String(from.username || '').trim();
  const full = [first, last].filter(Boolean).join(' ');
  return full || (user ? `@${user}` : 'Telegram');
}

async function findProfileByTelegramUserId({ db }, telegramUserId) {
  if (telegramUserId == null || telegramUserId === '') return null;
  const q = db.collection('profiles').where('telegram_user_id', '==', Number(telegramUserId)).limit(1);
  const snap = await q.get();
  if (snap.empty) return null;
  const d = snap.docs[0].data();
  return { id: snap.docs[0].id, name: d.name, telegram_username: d.telegram_username };
}

async function linkTelegramAccount({ db }, { token, telegramUserId, telegramUsername }) {
  const now = new Date();
  const tokenQ = db.collection('telegram_link_tokens').where('token', '==', token).limit(1);
  const snap = await tokenQ.get();
  if (snap.empty) return { ok: false, error: 'invalid_token' };
  const row = snap.docs[0];
  const rowData = row.data();
  if (rowData.used_at) return { ok: false, error: 'token_used' };
  if (rowData.expires_at && new Date(rowData.expires_at.toDate ? rowData.expires_at.toDate() : rowData.expires_at).getTime() < Date.now()) {
    return { ok: false, error: 'token_expired' };
  }

  const takenQ = db.collection('profiles').where('telegram_user_id', '==', Number(telegramUserId)).limit(1);
  const takenSnap = await takenQ.get();
  if (!takenSnap.empty && takenSnap.docs[0].id !== rowData.user_id) return { ok: false, error: 'telegram_already_linked' };

  // update profile
  const profileRef = db.collection('profiles').doc(rowData.user_id);
  await profileRef.update({ telegram_user_id: Number(telegramUserId), telegram_username: telegramUsername || null, telegram_linked_at: now });
  // mark token used
  await row.ref.update({ used_at: now });

  const profSnap = await profileRef.get();
  return { ok: true, profile: { id: profSnap.id, name: profSnap.data().name } };
}

async function handleIncomingTelegramChat(ctx, msg, text) {
  const from = (msg.from && typeof msg.from === 'object' ? msg.from : {});
  if (from.is_bot) return { saved: false, reason: 'bot_message' };
  const tgId = typeof from.id === 'number' ? from.id : Number(from.id);
  const linked = Number.isFinite(tgId) ? await findProfileByTelegramUserId(ctx, tgId) : null;
  const senderName = linked?.name ? safeText(linked.name, 120) : telegramSenderName(from);
  const messageId = typeof msg.message_id === 'number' ? msg.message_id : null;

  if (messageId) {
    const dupQ = ctx.db.collection('telegram_chat_messages').where('telegram_message_id', '==', messageId).limit(1);
    const dupSnap = await dupQ.get();
    if (!dupSnap.empty) return { saved: false, reason: 'duplicate' };
  }

  await insertTelegramChatMessage(ctx, {
    sender_id: linked?.id || null,
    sender_name: senderName,
    content: text,
    source: 'telegram',
    telegram_message_id: messageId,
  });

  await notifyTelegramChatPush(ctx, { senderName, content: text, excludeUserId: linked?.id || null });
  return { saved: true, linked: !!linked };
}

module.exports = {
  insertTelegramChatMessage,
  fetchAllPushTokens,
  notifyTelegramChatPush,
  telegramSenderName,
  findProfileByTelegramUserId,
  linkTelegramAccount,
  handleIncomingTelegramChat,
};
