// Remove device push token from Firestore
let admin = null;

function initAdmin() {
  if (admin && admin.apps && admin.apps.length > 0) return admin;
  try {
    admin = require('firebase-admin');
    if (!admin.apps || admin.apps.length === 0) {
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
      if (!raw) {
        console.error('[unregister-push] FIREBASE_SERVICE_ACCOUNT_JSON not configured');
        return null;
      }
      const serviceAccount = JSON.parse(raw);
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
    return admin;
  } catch (err) {
    console.error('[unregister-push] Failed to init admin:', err.message);
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

  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });

  try {
    const admin = initAdmin();
    if (!admin) return sendJson(res, 503, { error: 'Firebase Admin not configured' });

    const body = req.body || {};
    const { userId, token } = body;
    if (!token) return sendJson(res, 400, { error: 'Token required' });

    const db = admin.firestore();
    const id = `${String(userId || 'anon')}_${token}`;
    await db.collection('pushTokens').doc(id).delete();
    return sendJson(res, 200, { ok: true, id });
  } catch (err) {
    console.error('[unregister-push] error:', err?.message || err);
    return sendJson(res, 500, { error: 'Failed to unregister token' });
  }
};
