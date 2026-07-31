const admin = require('firebase-admin');
const crypto = require('crypto');
const PDFDocument = require('pdfkit');

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

async function telegramCall(method, payload) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is required');
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.ok) throw new Error(result?.description || `Telegram HTTP ${response.status}`);
  return result.result;
}

function webhookSecret() {
  return String(process.env.TELEGRAM_WEBHOOK_SECRET || '').trim()
    || crypto.createHash('sha256').update(String(process.env.TELEGRAM_BOT_TOKEN || '')).digest('hex').slice(0, 32);
}

async function ensureWebhook(req) {
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || 'gennetex.vercel.app').split(',')[0].trim();
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  await telegramCall('setWebhook', { url: `${proto}://${host}/api/telegram-notify`, secret_token: webhookSecret(), allowed_updates: ['callback_query', 'message'] });
  await telegramCall('setMyCommands', { commands: [
    { command: 'log', description: 'Сүүлийн системийн үйлдлүүд' },
    { command: 'irts', description: 'Өнөөдрийн ирц' },
    { command: 'bairshil', description: 'Google Maps байршил + PDF' },
    { command: 'ajiltan', description: 'Ажилтны тоо' },
    { command: 'device', description: 'Хүлээгдэж буй төхөөрөмж' },
    { command: 'status', description: 'ERP API төлөв' },
    { command: 'help', description: 'Бүх команд' },
  ] });
}

function telegramChats() {
  return [...new Set([process.env.TELEGRAM_CHAT_ID, process.env.TELEGRAM_LOG_GROUP_ID].map((v) => String(v || '').trim()).filter(Boolean))];
}

function allowedTelegramChat(id) {
  return telegramChats().includes(String(id || ''));
}

function valueDate(value) {
  if (value?.toDate) return value.toDate();
  const date = new Date(value || 0);
  return Number.isNaN(date.getTime()) ? new Date(0) : date;
}

function mnTime(value) {
  return new Intl.DateTimeFormat('mn-MN', { timeZone: 'Asia/Ulaanbaatar', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(valueDate(value));
}

async function sendLongText(chatId, text) {
  const chunks = String(text || '').match(/[\s\S]{1,3900}/g) || ['Мэдээлэл алга.'];
  for (const chunk of chunks) await sendTelegram(chatId, chunk);
}

async function sendDocument(chatId, buffer, filename, caption) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const form = new FormData();
  form.append('chat_id', String(chatId));
  form.append('caption', String(caption || '').slice(0, 1000));
  form.append('document', new Blob([buffer], { type: 'application/pdf' }), filename);
  const response = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, { method: 'POST', body: form });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.ok) throw new Error(result?.description || `Telegram HTTP ${response.status}`);
}

async function locationPdf(rows) {
  const doc = new PDFDocument({ size: 'A4', margin: 42, info: { Title: 'Gennetex ERP - Ажилтны байршил' } });
  doc.font(require.resolve('@fontsource/noto-sans/files/noto-sans-cyrillic-400-normal.woff'));
  const chunks = [];
  doc.on('data', (chunk) => chunks.push(chunk));
  const done = new Promise((resolve, reject) => { doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject); });
  doc.fontSize(18).text('Gennetex ERP — Одоогийн ажилтны байршил');
  doc.moveDown(0.4).fontSize(9).fillColor('#555').text(`Үүсгэсэн: ${new Intl.DateTimeFormat('mn-MN', { timeZone: 'Asia/Ulaanbaatar', dateStyle: 'full', timeStyle: 'medium' }).format(new Date())}`);
  doc.moveDown().fillColor('#111');
  rows.forEach((row, index) => {
    const map = `https://www.google.com/maps?q=${row.latitude},${row.longitude}`;
    doc.fontSize(11).text(`${index + 1}. ${row.name || row.phone || row.id}`);
    doc.fontSize(9).text(`Байршил: ${row.latitude}, ${row.longitude} · Сүүлд: ${mnTime(row.last_seen || row.updatedAt)}`);
    doc.fillColor('#2457c5').text('Google Maps дээр нээх', { link: map, underline: true }).fillColor('#111').moveDown(0.65);
  });
  if (!rows.length) doc.fontSize(11).text('Байршилтай ажилтан алга.');
  doc.end();
  return done;
}

async function handleCommand(req, res) {
  const message = req.body?.message;
  const command = String(message?.text || '').trim().split(/\s+/)[0].toLowerCase().replace(/@[^\s]+$/, '');
  if (!message?.chat?.id || !command.startsWith('/')) return false;
  if (String(req.headers['x-telegram-bot-api-secret-token'] || '') !== webhookSecret()) return res.status(403).json({ error: 'Invalid Telegram webhook secret' });
  const chatId = message.chat.id;
  if (!allowedTelegramChat(chatId)) return res.status(403).json({ error: 'Telegram chat not allowed' });
  const db = getAdmin().firestore();
  if (command === '/start' || command === '/help' || command === '/commands') {
    await sendTelegram(chatId, ['🤖 Gennetex ERP командууд', '/log — сүүлийн системийн үйлдлүүд', '/irts — өнөөдрийн ирц', '/bairshil — бүх ажилтны Google Maps + PDF', '/ajiltan — ажилтны тоо', '/device — хүлээгдэж буй төхөөрөмж', '/status — ERP API төлөв'].join('\n'));
  } else if (command === '/log') {
    const snap = await db.collection('activity_logs').orderBy('createdAt', 'desc').limit(30).get();
    const lines = snap.docs.map((d, i) => { const x = d.data(); return `${i + 1}. ${x.user_name || x.user_id || '—'} · ${x.action || 'other'}${x.screen ? ` · ${x.screen}` : ''} · ${mnTime(x.created_at || x.createdAt)}`; });
    await sendLongText(chatId, `📋 Сүүлийн лог (${lines.length})\n${lines.join('\n') || 'Мэдээлэл алга.'}`);
  } else if (command === '/irts') {
    const since = new Date(Date.now() - 36 * 60 * 60 * 1000);
    const snap = await db.collection('attendance').where('createdAt', '>=', getAdmin().firestore.Timestamp.fromDate(since)).limit(500).get();
    const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ulaanbaatar' }).format(new Date());
    const rows = snap.docs.map((d) => d.data()).filter((x) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ulaanbaatar' }).format(valueDate(x.created_at || x.createdAt)) === day).sort((a, b) => valueDate(b.created_at || b.createdAt) - valueDate(a.created_at || a.createdAt));
    const lines = rows.map((x, i) => `${i + 1}. ${x.staff_name || x.staff_id || '—'} · ${x.type === 'check_out' ? 'Явсан' : 'Ирсэн'} · ${mnTime(x.created_at || x.createdAt)}${x.location_name ? ` · ${x.location_name}` : ''}`);
    await sendLongText(chatId, `🪪 Өнөөдрийн ирц (${rows.length})\n${lines.join('\n') || 'Ирц бүртгэгдээгүй.'}`);
  } else if (command === '/bairshil') {
    const snap = await db.collection('profiles').get();
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((x) => Number.isFinite(Number(x.latitude)) && Number.isFinite(Number(x.longitude)));
    const lines = rows.map((x, i) => `${i + 1}. ${x.name || x.phone || x.id}\n📍 https://www.google.com/maps?q=${x.latitude},${x.longitude}\n🕒 ${mnTime(x.last_seen || x.updatedAt)}`);
    await sendLongText(chatId, `🗺 Одоогийн байршил (${rows.length})\n\n${lines.join('\n\n') || 'Байршлын мэдээлэл алга.'}`);
    await sendDocument(chatId, await locationPdf(rows), `gennetex-bairshil-${Date.now()}.pdf`, `${rows.length} ажилтны Google Maps байршлын PDF`);
  } else if (command === '/ajiltan') {
    const snap = await db.collection('profiles').get();
    const roles = {}; snap.docs.forEach((d) => { const role = d.data().role || 'employee'; roles[role] = (roles[role] || 0) + 1; });
    await sendTelegram(chatId, `👥 Нийт ${snap.size} хэрэглэгч\n${Object.entries(roles).map(([role, count]) => `${role}: ${count}`).join('\n')}`);
  } else if (command === '/device') {
    const snap = await db.collection('device_approvals').where('status', '==', 'pending').get();
    await sendTelegram(chatId, `📱 Хүлээгдэж буй төхөөрөмж: ${snap.size}`);
  } else if (command === '/status') {
    await sendTelegram(chatId, `✅ ERP API хэвийн\n🌐 adiya.site\n🕒 ${new Date().toISOString()}`);
  } else {
    await sendTelegram(chatId, 'Тодорхойгүй команд. /help гэж бичнэ үү.');
  }
  res.status(200).json({ ok: true });
  return true;
}

async function sendTelegram(chatId, text, replyMarkup) {
  const result = await telegramCall('sendMessage', { chat_id: chatId, text, disable_web_page_preview: true, reply_markup: replyMarkup || undefined });
  return result?.message_id || null;
}

async function ipLocation(ip) {
  if (!ip || !/^[0-9a-f:.]+$/i.test(ip)) return null;
  try {
    const response = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`);
    const data = await response.json();
    if (!data?.success) return null;
    return [data.city, data.region, data.country].filter(Boolean).join(', ');
  } catch (_) { return null; }
}

async function handleCallback(req, res) {
  const callback = req.body?.callback_query;
  if (!callback?.id) return false;
  const receivedSecret = String(req.headers['x-telegram-bot-api-secret-token'] || '');
  if (!receivedSecret || receivedSecret !== webhookSecret()) return res.status(403).json({ error: 'Invalid Telegram webhook secret' });
  const testMatch = String(callback.data || '').match(/^device:test:(approved|rejected)$/);
  if (testMatch) {
    const approved = testMatch[1] === 'approved';
    await telegramCall('answerCallbackQuery', { callback_query_id: callback.id, text: approved ? 'TEST: Зөвшөөрөх товч ажиллалаа' : 'TEST: Татгалзах товч ажиллалаа', show_alert: true });
    if (callback.message?.chat?.id) await sendTelegram(callback.message.chat.id, approved ? '✅ TEST — Зөвшөөрөх товч амжилттай ажиллалаа.' : '❌ TEST — Татгалзах товч амжилттай ажиллалаа.');
    res.status(200).json({ ok: true, test: true });
    return true;
  }
  const match = String(callback.data || '').match(/^device:(approved|rejected):([A-Za-z0-9_-]+)$/);
  if (!match) {
    await telegramCall('answerCallbackQuery', { callback_query_id: callback.id, text: 'Тодорхойгүй үйлдэл' });
    res.status(200).json({ ok: true });
    return true;
  }
  const [, status, approvalId] = match;
  const ref = getAdmin().firestore().collection('device_approvals').doc(approvalId);
  const snap = await ref.get();
  if (!snap.exists) {
    await telegramCall('answerCallbackQuery', { callback_query_id: callback.id, text: 'Хүсэлт олдсонгүй', show_alert: true });
    res.status(200).json({ ok: true });
    return true;
  }
  await ref.update({ status, decided_at: new Date().toISOString(), decided_by: `telegram:${callback.from?.id || ''}`, decided_by_name: callback.from?.username || callback.from?.first_name || 'Telegram admin' });
  const approved = status === 'approved';
  await telegramCall('answerCallbackQuery', { callback_query_id: callback.id, text: approved ? 'Төхөөрөмж зөвшөөрөгдлөө' : 'Нэвтрэлт татгалзагдлаа' });
  if (callback.message?.chat?.id && callback.message?.message_id) {
    await telegramCall('editMessageReplyMarkup', { chat_id: callback.message.chat.id, message_id: callback.message.message_id, reply_markup: { inline_keyboard: [] } });
    await sendTelegram(callback.message.chat.id, `${approved ? '✅ ЗӨВШӨӨРСӨН' : '❌ ТАТГАЛЗСАН'} · ${clean(snap.data()?.user_name, 100)} · @${clean(callback.from?.username || callback.from?.first_name, 80)}`);
  }
  res.status(200).json({ ok: true });
  return true;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    if (await handleCallback(req, res)) return;
    if (await handleCommand(req, res)) return;
    const user = await requireFirebaseUser(req);
    const title = clean(req.body?.title, 160);
    const body = clean(req.body?.body || req.body?.message, 3000);
    const context = clean(req.body?.context, 700);
    if (!title && !body) throw httpError(400, 'Мессеж хоосон байна.');

    const profile = await getAdmin().firestore().collection('profiles').doc(user.uid).get();
    const sender = clean(profile.data()?.name || profile.data()?.phone || user.uid, 100);
    const approval = req.body?.deviceApproval;
    const location = approval ? await ipLocation((body.match(/Public IP:\s*([^\s·]+)/) || [])[1]) : null;
    const text = [title ? `🔔 ${title}` : null, body, location ? `📍 IP байршил: ${location}` : null, context || null, `— ${sender}`].filter(Boolean).join('\n');
    const approvalId = clean(approval?.approvalId, 160);
    const keyboard = approvalId ? { inline_keyboard: [[
      { text: '✅ Зөвшөөрөх', callback_data: `device:approved:${approvalId}` },
      { text: '❌ Татгалзах', callback_data: `device:rejected:${approvalId}` },
    ]] } : null;
    const chatIds = telegramChats();
    if (!chatIds.length) throw new Error('TELEGRAM_CHAT_ID is required');
    await ensureWebhook(req);
    const results = await Promise.allSettled(chatIds.map((chatId) => sendTelegram(chatId, text, keyboard)));
    const sent = results.filter((result) => result.status === 'fulfilled').length;
    if (!sent) throw new Error(results[0]?.reason?.message || 'Telegram илгээж чадсангүй.');
    return res.status(200).json({ ok: true, sent });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message || 'Telegram алдаа' });
  }
};
