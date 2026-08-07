const { initAdmin } = require('./_lib/initFirebase');
const chatBridge = require('./_lib/chatBridge');

function jsonResponse(res, body, status = 200) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');
  res.statusCode = status;
  return res.end(JSON.stringify(body));
}

function randomToken(bytes = 16) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return [...arr].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function getBotUsername(botToken) {
  if (!botToken) return null;
  try {
    const r = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const d = await r.json();
    return d?.result?.username || null;
  } catch (e) { return null; }
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.end('ok');
  if (req.method !== 'POST') return jsonResponse(res, { ok: false, error: 'method_not_allowed' }, 405);

  const SUPABASE_URL = process.env.SUPABASE_URL || '';
  const ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

  // auth via Authorization header using firebase? For now allow requests and require auth upstream.
  const authHeader = req.headers['authorization'] || '';

  let body = {};
  try { body = await new Promise((r) => { let s=''; req.on('data',c=>s+=c); req.on('end',()=>r(JSON.parse(s||'{}'))); }); } catch { body = {}; }

  const action = String(body.action || 'create').toLowerCase();

  const admin = initAdmin();
  const db = admin.firestore();
  const ctx = { db };

  // fetch profile by custom auth? For now allow anonymous but require valid user id in body in a future step
  const userId = body.userId || null;
  const profile = userId ? (await db.collection('profiles').doc(String(userId)).get()).data() : null;

  if (action === 'status') {
    return jsonResponse(res, { ok: true, linked: !!(profile && profile.telegram_user_id), telegram_user_id: profile?.telegram_user_id || null, telegram_username: profile?.telegram_username || null, telegram_linked_at: profile?.telegram_linked_at || null });
  }

  if (action === 'unlink') {
    if (!userId) return jsonResponse(res, { ok: false, error: 'user_required' }, 400);
    await db.collection('profiles').doc(String(userId)).update({ telegram_user_id: null, telegram_username: null, telegram_linked_at: null });
    return jsonResponse(res, { ok: true, linked: false });
  }

  if (!BOT_TOKEN) return jsonResponse(res, { ok: false, error: 'telegram_bot_not_configured' }, 503);
  const botUsername = await getBotUsername(BOT_TOKEN);
  if (!botUsername) return jsonResponse(res, { ok: false, error: 'bot_username_unavailable' }, 502);

  const token = randomToken(16);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  // store token
  await db.collection('telegram_link_tokens').add({ user_id: userId || null, token, expires_at: expiresAt, created_at: new Date() });

  const deepLink = `https://t.me/${botUsername}?start=link_${token}`;
  return jsonResponse(res, { ok: true, token, expires_at: expiresAt.toISOString(), deep_link: deepLink, bot_username: botUsername, already_linked: !!(profile && profile.telegram_user_id) });
};
