// API endpoint to send FCM messages via Firebase Admin SDK
// Expects POST { title, body, tokens: [string], data?: object }

let admin = null;

function initAdmin() {
  if (admin && admin.apps && admin.apps.length > 0) return admin;
  try {
    admin = require('firebase-admin');
    if (!admin.apps || admin.apps.length === 0) {
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
      if (!raw) {
        console.error('[send-push] FIREBASE_SERVICE_ACCOUNT_JSON not configured');
        return null;
      }
      const serviceAccount = JSON.parse(raw);
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
    return admin;
  } catch (err) {
    console.error('[send-push] Failed to init admin:', err.message);
    return null;
  }
}

function sendJson(res, status, body) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(body);
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  try {
    const admin = initAdmin();
    if (!admin) return sendJson(res, 503, { error: 'Firebase Admin not configured' });

    const body = req.body || {};
    const { title, body: text, tokens = [], data = {} } = body;

    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return sendJson(res, 400, { error: 'No target tokens provided' });
    }

    const message = {
      notification: { title: title || '', body: text || '' },
      data: Object.keys(data || {}).reduce((acc, k) => ({ ...acc, [k]: String(data[k]) }), {}),
      tokens,
    };

    const resp = await admin.messaging().sendMulticast(message);
    return sendJson(res, 200, { success: true, response: resp });
  } catch (error) {
    console.error('[send-push] error:', error?.message || error);
    return sendJson(res, 500, { error: 'Failed to send push' });
  }
};
