// Return push tokens for given user IDs
let admin = null;

function initAdmin() {
  if (admin && admin.apps && admin.apps.length > 0) return admin;
  try {
    admin = require('firebase-admin');
    if (!admin.apps || admin.apps.length === 0) {
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
      if (!raw) {
        console.error('[get-tokens] FIREBASE_SERVICE_ACCOUNT_JSON not configured');
        return null;
      }
      const serviceAccount = JSON.parse(raw);
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
    return admin;
  } catch (err) {
    console.error('[get-tokens] Failed to init admin:', err.message);
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
    const { userIds = [] } = body;
    if (!Array.isArray(userIds)) return sendJson(res, 400, { error: 'userIds must be array' });

    const db = admin.firestore();
    if (!userIds.length) return sendJson(res, 200, { tokens: [] });

    const tokens = [];
    // Query pushTokens collection for matching userIds (batched if many)
    const BATCH = 10;
    for (let i = 0; i < userIds.length; i += BATCH) {
      const slice = userIds.slice(i, i + BATCH);
      const q = db.collection('pushTokens').where('userId', 'in', slice);
      const snap = await q.get();
      snap.forEach((d) => {
        const data = d.data();
        if (data && data.token) tokens.push(data.token);
      });
    }

    return sendJson(res, 200, { tokens: [...new Set(tokens)] });
  } catch (err) {
    console.error('[get-tokens] error:', err?.message || err);
    return sendJson(res, 500, { error: 'Failed to get tokens' });
  }
};
