// Admin endpoint to add legacy phone to an existing user document
// POST { legacyUid, phone }
// Header: x-admin-secret: <ADMIN_API_SECRET>

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
    const adminSecret = process.env.ADMIN_API_SECRET || '';
    const provided = req.headers['x-admin-secret'] || req.headers['x-admin-token'] || '';
    if (!adminSecret || !provided || provided !== adminSecret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    init();
    const { legacyUid, phone } = req.body || {};
    if (!legacyUid || !phone) return res.status(400).json({ error: 'legacyUid and phone required' });

    const db = admin.firestore();
    await db.collection('users').doc(legacyUid).set({ phone, legacyPhoneAddedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    return res.json({ ok: true, legacyUid, phone });
  } catch (err) {
    console.error('[admin/add-legacy-phone] ', err);
    return res.status(500).json({ error: 'Internal error' });
  }
};
