const { initAdmin } = require('./_lib/initFirebase');
const chatBridge = require('./_lib/chatBridge');

function jsonResponse(res, body, status = 200) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type, x-webhook-secret');
  res.statusCode = status;
  return res.end(JSON.stringify(body));
}

function pickString(obj, ...keys) {
  for (const k of keys) {
    const v = obj[k];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return null;
}
function pickNumber(obj, ...keys) {
  for (const k of keys) {
    const v = obj[k];
    if (v == null || v === '') continue;
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
  }
  return null;
}
function normalizePayload(raw) {
  const nested = raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data) ? raw.data : raw.call && typeof raw.call === 'object' ? raw.call : {};
  const src = { ...nested, ...raw };
  delete src.secret; delete src.data; delete src.call;
  const siteRaw = String(pickString(src, 'site_kind', 'siteKind', 'customer_type', 'type_site') || 'ail').toLowerCase();
  const site_kind = siteRaw.includes('baiguul') || siteRaw.includes('corp') || siteRaw === 'c' ? 'baiguulga' : 'ail';
  const statusMap = { open: 'Хүлээгдэж буй', pending: 'Хүлээгдэж буй', new: 'Хүлээгдэж буй', progress: 'Явж байгаа', 'in progress': 'Явж байгаа', in_progress: 'Явж байгаа', closed: 'Дууссан', done: 'Дууссан', cancel: 'Татгалзсан', cancelled: 'Татгалзсан', reschedule: 'Дахимдах' };
  const statusRaw = String(pickString(src, 'status', 'state') || '').toLowerCase();
  const status = statusMap[statusRaw] || pickString(src, 'status') || 'Хүлээгдэж буй';
  return {
    external_source: pickString(src, 'source', 'external_source', 'provider') || 'uservice',
    external_id: pickString(src, 'external_id', 'externalId', 'ticket_id', 'ticketId', 'order_id', 'id'),
    customer: pickString(src, 'customer', 'customer_name', 'client_name', 'name') || 'Захиалагч',
    phone: pickString(src, 'phone', 'mobile', 'tel', 'phone_number'),
    address: pickString(src, 'address', 'location', 'site_address'),
    problem: pickString(src, 'problem', 'description', 'issue', 'note', 'comment'),
    call_type: pickString(src, 'call_type', 'callType', 'service_type', 'type') || 'other',
    site_kind,
    engineer_id: pickString(src, 'engineer_id', 'engineerId', 'assignee_id'),
    engineer_name: pickString(src, 'engineer_name', 'engineerName', 'assignee_name', 'engineer'),
    latitude: pickNumber(src, 'latitude', 'lat'),
    longitude: pickNumber(src, 'longitude', 'lng', 'lon'),
    status,
    created_by_name: pickString(src, 'created_by_name', 'createdByName', 'sender') || 'U-Service',
    raw_payload: src,
    updated_at: new Date().toISOString(),
  };
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.end('ok');
  if (req.method !== 'POST') return jsonResponse(res, { ok: false, error: 'method_not_allowed' }, 405);

  const WEBHOOK_SECRET = process.env.SERVICE_CALL_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) return jsonResponse(res, { ok: false, error: 'webhook_not_configured' }, 503);

  const headerSecret = req.headers['x-webhook-secret'];
  let body;
  try { body = await new Promise((r) => { let s=''; req.on('data',c=>s+=c); req.on('end',()=>r(JSON.parse(s||'{}'))); }); } catch { return jsonResponse(res, { ok: false, error: 'invalid_json' }, 400); }
  const secret = headerSecret || String(body.secret || '');
  if (secret !== WEBHOOK_SECRET) return jsonResponse(res, { ok: false, error: 'unauthorized' }, 401);

  const row = normalizePayload(body);
  if (!row.customer) return jsonResponse(res, { ok: false, error: 'customer_required' }, 400);

  const admin = initAdmin();
  const db = admin.firestore();

  const insertRow = { ...row };

  try {
    let data = null;
    if (row.external_id) {
      const existingQ = db.collection('service_calls').where('external_source', '==', row.external_source).where('external_id', '==', row.external_id).limit(1);
      const exSnap = await existingQ.get();
      if (!exSnap.empty) {
        const docRef = exSnap.docs[0].ref;
        await docRef.update(insertRow);
        const snap = await docRef.get(); data = { id: snap.id, ...snap.data() };
      } else {
        const ref = await db.collection('service_calls').add(insertRow);
        const sn = await ref.get(); data = { id: ref.id, ...sn.data() };
      }
    } else {
      const ref = await db.collection('service_calls').add(insertRow);
      const sn = await ref.get(); data = { id: ref.id, ...sn.data() };
    }

    // push notify
    if (data.engineer_id) {
      try {
        const tokenQ = db.collection('pushTokens').where('userId', '==', data.engineer_id);
        const snap = await tokenQ.get();
        const tokens = [];
        snap.forEach((d) => { const dt = d.data(); if (dt && dt.token) tokens.push(dt.token); });
        if (tokens.length) {
          const kind = data.site_kind === 'baiguulga' ? 'Байгууллага' : 'Айл';
          const details = [data.customer, data.problem, data.phone].filter(Boolean).join(' · ');
          const title = `${data.engineer_name || 'Ажилтан'}, танд шинээр дуудлага ирлээ`;
          const bodyText = details ? `${kind}: ${details}` : `${kind} дээрх шинэ дуудлага`;
          await fetch((process.env.BASE_URL || '') + '/api/send-push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tokens, title, body: bodyText, data: { type: 'service_call', callId: String(data.id), siteKind: String(data.site_kind || 'ail') } }) });
        }
      } catch (e) {}
    }

    return jsonResponse(res, { ok: true, id: data.id, external_id: row.external_id, action: row.external_id ? 'upserted' : 'created' });
  } catch (e) {
    return jsonResponse(res, { ok: false, error: String(e) }, 502);
  }
};
