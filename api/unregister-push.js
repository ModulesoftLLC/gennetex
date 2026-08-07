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
  if (req.method !== 'POST') return res.status(405).end();
  try {
    init();
    const { userId, token } = req.body || {};
    if (!userId || !token) return res.status(400).json({ error: 'userId and token required' });

    const db = admin.firestore();
    const docId = `${userId}_${token}`;
    await db.collection('pushTokens').doc(docId).delete();
    return res.json({ success: true });
  } catch (err) {
    console.error('[unregister-push] ', err);
    return res.status(500).json({ error: 'Internal error' });
  }
};
