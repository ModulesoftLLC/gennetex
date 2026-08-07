const { initAdmin } = require('./_lib/initFirebase');
const chatBridge = require('./_lib/chatBridge');

function jsonResponse(res, body, status = 200) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');
  res.statusCode = status;
  return res.end(JSON.stringify(body));
}

function safeText(v, max = 4000) {
  const s = String(v ?? '').trim();
  return s.length > max ? s.slice(0, max - 3) + '...' : s;
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.end('ok');
  if (req.method !== 'POST') return jsonResponse(res, { ok: false, error: 'method_not_allowed' }, 405);

  const SUPABASE_URL = process.env.SUPABASE_URL || '';
  const ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
  const GROUP_ID = process.env.TELEGRAM_LOG_GROUP_ID || '';

  if (!BOT_TOKEN || !GROUP_ID) return jsonResponse(res, { ok: false, error: 'telegram_group_not_configured' }, 503);

  const authHeader = req.headers['authorization'] || '';
  // TODO: authenticate user via Firebase Auth using token in Authorization header

  let body = {};
  try { body = await new Promise((r) => { let s=''; req.on('data',c=>s+=c); req.on('end',()=>r(JSON.parse(s||'{}'))); }); } catch { return jsonResponse(res, { ok: false, error: 'invalid_json' }, 400); }

  const content = safeText(body.content, 4000);
  if (!content) return jsonResponse(res, { ok: false, error: 'empty_message' }, 400);

  const admin = initAdmin();
  const db = admin.firestore();
  const ctx = { db };

  // TODO: map authHeader to user id. For now expect body.userId
  const userId = body.userId || null;
  const profileSnap = userId ? await db.collection('profiles').doc(String(userId)).get() : null;
  const profile = profileSnap ? profileSnap.data() : null;
  const senderName = safeText((profile && profile.name) || (body.senderName) || 'Ажилтан', 120);

  await chatBridge.insertTelegramChatMessage(ctx, { sender_id: userId, sender_name: senderName, content, source: 'app' });

  const tgText = `📱 ${senderName}\n${content}`;
  const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: GROUP_ID, text: safeText(tgText, 4000) }) });
  const tgJson = await tgRes.json().catch(() => ({}));
  if (!tgRes.ok || !tgJson.ok) return jsonResponse(res, { ok: false, error: 'telegram_send_failed', detail: tgJson }, 502);

  await chatBridge.notifyTelegramChatPush({ db }, { senderName, content, excludeUserId: userId });

  return jsonResponse(res, { ok: true });
};
