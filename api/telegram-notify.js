const admin = require('firebase-admin');

function getAdmin() {
  if (!admin.apps.length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is required');
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
  }
  return admin;
}

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

async function requireFirebaseUser(req) {
  const match = String(req.headers.authorization || '').match(/^Bearer (.+)$/);
  if (!match) throw httpError(401, 'Нэвтрэх шаардлагатай.');
  return getAdmin().auth().verifyIdToken(match[1]);
}

function clean(value, max) {
  return String(value || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);
}

async function sendTelegram(chatId, text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is required');
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.ok) throw new Error(result?.description || `Telegram HTTP ${response.status}`);
  return result.result?.message_id || null;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const user = await requireFirebaseUser(req);
    const title = clean(req.body?.title, 160);
    const body = clean(req.body?.body || req.body?.message, 3000);
    const context = clean(req.body?.context, 700);
    if (!title && !body) throw httpError(400, 'Мессеж хоосон байна.');

    const profile = await getAdmin().firestore().collection('profiles').doc(user.uid).get();
    const sender = clean(profile.data()?.name || profile.data()?.phone || user.uid, 100);
    const text = [title ? `🔔 ${title}` : null, body, context || null, `— ${sender}`].filter(Boolean).join('\n');
    const chatIds = [...new Set([process.env.TELEGRAM_CHAT_ID, process.env.TELEGRAM_LOG_GROUP_ID].map((v) => String(v || '').trim()).filter(Boolean))];
    if (!chatIds.length) throw new Error('TELEGRAM_CHAT_ID is required');
    const results = await Promise.allSettled(chatIds.map((chatId) => sendTelegram(chatId, text)));
    const sent = results.filter((result) => result.status === 'fulfilled').length;
    if (!sent) throw new Error(results[0]?.reason?.message || 'Telegram илгээж чадсангүй.');
    return res.status(200).json({ ok: true, sent });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message || 'Telegram алдаа' });
  }
};
