const admin = require('firebase-admin');

function init() {
  if (admin.apps && admin.apps.length) return admin;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON not set');
  const serviceAccount = JSON.parse(raw);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  return admin;
}

module.exports = async (req, res) => {
  // GET ?userId=... or POST { userIds: [] }
  try {
    init();
    const db = admin.firestore();
    if (req.method === 'GET') {
      const userId = req.query.userId;
      if (!userId) return res.status(400).json({ error: 'userId required' });
      const snap = await db.collection('pushTokens').where('userId', '==', userId).get();
      const tokens = snap.docs.map(d => d.data().token).filter(Boolean);
      return res.json({ tokens });
    }

    if (req.method === 'POST') {
      const { userIds } = req.body || {};
      if (!Array.isArray(userIds)) return res.status(400).json({ error: 'userIds array required' });
      const tokens = [];
      for (const uid of userIds) {
        const snap = await db.collection('pushTokens').where('userId', '==', uid).get();
        for (const d of snap.docs) {
          const t = d.data().token;
          if (t) tokens.push(t);
        }
      }
      return res.json({ tokens });
    }

    return res.status(405).end();
  } catch (err) {
    console.error('[get-tokens] ', err);
    return res.status(500).json({ error: 'Internal error' });
  }
};
