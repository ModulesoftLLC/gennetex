const { initAdmin } = require('./_lib/initFirebase');
const chatBridge = require('./_lib/chatBridge');

function jsonResponse(res, body, status = 200) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type, x-telegram-bot-api-secret-token');
  res.statusCode = status;
  return res.end(JSON.stringify(body));
}

function safeText(v, max = 500) {
  const s = String(v ?? '').trim();
  return s.length > max ? s.slice(0, max - 3) + '...' : s;
}

async function getBotUsername(botToken) {
  if (!botToken) return null;
  try {
    const r = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const d = await r.json();
    return (d?.result?.username || null)?.toLowerCase() || null;
  } catch (e) { return null; }
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.end('ok');
  if (req.method !== 'POST') return jsonResponse(res, { ok: false, error: 'method_not_allowed' }, 405);

  const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || '';
  if (WEBHOOK_SECRET) {
    const headerSecret = req.headers['x-telegram-bot-api-secret-token'] || '';
    if (headerSecret !== WEBHOOK_SECRET) return jsonResponse(res, { ok: false, error: 'unauthorized' }, 401);
  }

  const SUPABASE_URL = process.env.SUPABASE_URL || '';
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  // We allow operation even if Supabase vars missing because data is in Firestore now

  let update = {};
  try { update = await new Promise((r) => { let s=''; req.on('data',c=>s+=c); req.on('end',()=>r(JSON.parse(s||'{}'))); }); } catch { return jsonResponse(res, { ok: false, error: 'invalid_json' }, 400); }

  const msg = (update.message && typeof update.message === 'object' ? update.message : {});
  const chat = (msg.chat && typeof msg.chat === 'object' ? msg.chat : {});
  const chatId = chat.id;
  const chatType = String(chat.type || 'private');
  const rawText = safeText(msg.text || msg.caption || '', 500);
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
  const LOG_GROUP_ID = process.env.TELEGRAM_LOG_GROUP_ID || '';

  if (!rawText || !chatId) return jsonResponse(res, { ok: true, ignored: true });

  const admin = initAdmin();
  const db = admin.firestore();
  const ctx = { db, admin };

  const botUsername = await getBotUsername(BOT_TOKEN);
  const text = (function normalizeIncomingText(raw, botUsername) {
    let t = raw.trim();
    if (t.startsWith('/')) {
      const m = t.match(/^\/([^\s@]+)(?:@[\w_]+)?(?:\s+(.*))?$/s);
      if (m) {
        const cmd = m[1] || '';
        const rest = (m[2] || '').trim();
        t = rest || cmd;
      }
    }
    if (botUsername) {
      t = t.replace(new RegExp(`@${botUsername}\\b`, 'gi'), '').trim();
    }
    return t;
  })(rawText, botUsername);

  if (!text) return jsonResponse(res, { ok: true, ignored: true });

  const from = (msg.from && typeof msg.from === 'object' ? msg.from : {});
  const tgUserId = typeof from.id === 'number' ? from.id : Number(from.id);
  const tgUsername = String(from.username || '').trim() || null;

  // link token detection
  const linkMatch = text.match(/^start\s+link_([a-f0-9]{16,64})$/i) || text.match(/^link_([a-f0-9]{16,64})$/i);
  if (linkMatch && chatType === 'private' && Number.isFinite(tgUserId)) {
    const result = await chatBridge.linkTelegramAccount(ctx, { token: linkMatch[1], telegramUserId: tgUserId, telegramUsername: tgUsername });
    if (result.ok) {
      const name = result.profile?.name || chatBridge.telegramSenderName(from);
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: `✅ Холбогдлоо, ${name}!\n\nОдоо эндээс мессеж бичвэл Gennetex апп → Telegram чат руу орно.` }),
      }).catch(()=>{});
      return jsonResponse(res, { ok: true, action: 'telegram_link', user_id: result.profile?.id });
    }
    const errMap = {
      invalid_token: 'Холбох код буруу эсвэл олдсонгүй. Аппаас дахин «Telegram холбох» дарна уу.',
      token_used: 'Энэ код аль хэдийн ашиглагдсан. Аппаас шинэ код авна уу.',
      token_expired: 'Кодын хугацаа дууссан (15 мин). Аппаас дахин холбоно уу.',
      telegram_already_linked: 'Энэ Telegram өөр ажилтантай холбогдсон байна.',
      profile_update_failed: 'Профайл шинэчлэхэд алдаа гарлаа. Дахин оролдоно уу.',
    };
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text: `❌ ${errMap[result.error] || result.error}` }) }).catch(()=>{});
    return jsonResponse(res, { ok: false, action: 'telegram_link', error: result.error });
  }

  // authorization: use LOG_GROUP_ID or allow private linked
  const linkedProfile = Number.isFinite(tgUserId) ? await chatBridge.findProfileByTelegramUserId(ctx, tgUserId) : null;
  const authorized = (function isAuthorizedChat(chatId, chatType) {
    const logGroup = process.env.TELEGRAM_LOG_GROUP_ID || '';
    const adminChat = process.env.TELEGRAM_CHAT_ID || '';
    const idStr = String(chatId || '');
    if (logGroup && idStr === logGroup) return true;
    if (adminChat && idStr === adminChat && chatType === 'private') return true;
    return false;
  })(chatId, chatType);
  const privateLinked = chatType === 'private' && !!linkedProfile;

  if (!authorized && !privateLinked) {
    if (chatType === 'private') {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text: 'Telegram хараахан холбогдоогүй. Gennetex апп → Telegram чат → «Telegram холбох» дарна уу.' }) }).catch(()=>{});
      return jsonResponse(res, { ok: true, ignored: true, reason: 'not_linked' });
    }
    return jsonResponse(res, { ok: true, ignored: true, reason: 'unauthorized_chat' });
  }

  const lower = text.toLowerCase().trim();
  if (lower === 'start' || lower === 'help' || lower === 'тусламж') {
    const groupHint = (chatType === 'group' || chatType === 'supergroup') ? 'Групп дээр: /log эсвэл @GennetexBot log' : (linkedProfile ? `Холбогдсон: ${linkedProfile.name || 'ажилтан'}` : 'Хувийн чат эсвэл бүртгэлтэй групп');
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text: ['✅ Gennetex Admin bot', '', `📍 ${groupHint}`, '', '📋 log → 24ц PDF тайлан', '💬 Энгийн мессеж → Telegram чат (апп + групп)', '📢 !мессеж → бүх ажилтанд push зарлал', '', `Групп ID: ${LOG_GROUP_ID || String(chatId)}`, '', '⚠️ Групп дээр бүх мессеж харах:', 'BotFather → /setprivacy → Disable'].join('\n') }) }).catch(()=>{});
    return jsonResponse(res, { ok: true, action: 'start_help' });
  }

  // PDF command not implemented in Firebase migration yet
  const isLogPdf = (function isLogPdfCommand(text) {
    const lower = text.toLowerCase().trim();
    return (lower === 'log' || lower === 'лог' || lower === 'pdf' || lower.startsWith('log '));
  })(text);
  if (isLogPdf) {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text: 'PDF логын функц одоогоор идэвхитэй биш.' }) }).catch(()=>{});
    return jsonResponse(res, { ok: false, error: 'log_not_supported' });
  }

  // Broadcast
  if (text.trim().startsWith('!')) {
    if (!authorized) {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text: 'Зарлал зөвхөн админ/группээс.' }) }).catch(()=>{});
      return jsonResponse(res, { ok: false, error: 'broadcast_not_allowed' });
    }
    const pushBody = text.trim().slice(1).trim();
    // fetch tokens from Firestore
    const tokens = await chatBridge.fetchAllPushTokens({ db }, null);
    // use send-push endpoint
    try {
      await fetch((process.env.BASE_URL || '') + '/api/send-push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tokens, title: 'Gennetex', body: pushBody, data: { type: 'telegram_broadcast', text: pushBody } }) });
    } catch (e) {
      console.warn('broadcast send-push failed', e);
    }
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text: `✅ Зарлал илгээгдлээ (${tokens.length} төхөөрөмж)` }) }).catch(()=>{});
    return jsonResponse(res, { ok: true, action: 'broadcast', tokens: tokens.length });
  }

  // Group or linked private -> forward to app chat
  if (chatType === 'group' || chatType === 'supergroup' || privateLinked) {
    const result = await chatBridge.handleIncomingTelegramChat({ db }, msg, text);
    if (privateLinked && result.saved && LOG_GROUP_ID && BOT_TOKEN) {
      const name = linkedProfile?.name || chatBridge.telegramSenderName(from);
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: LOG_GROUP_ID, text: `📱 ${name}\n${text}` }) }).catch(()=>{});
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text: '✅ Апп + групп рүү илгээгдлээ' }) }).catch(()=>{});
    }
    return jsonResponse(res, { ok: true, action: 'telegram_chat', ...result });
  }

  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text: 'Хувийн чат: log → PDF, !мессеж → зарлал.' }) }).catch(()=>{});
  return jsonResponse(res, { ok: true, ignored: true, chat_type: chatType });
};
