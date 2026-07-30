/** verify.mn wake-up callback. The callback itself is never treated as proof. */
const admin = require('firebase-admin');
const verifyMn = require('./_lib/verifyMn');

function getAdmin() {
  if (!admin.apps.length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is required');
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
  }
  return admin;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });
  res.setHeader('Cache-Control', 'no-store');
  const sid = String(req.query.sid || '');
  if (!sid) return res.status(400).json({ error: 'sid required' });
  try {
    const ref = getAdmin().firestore().collection('verificationSessions').doc(sid);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'session not found' });
    const stored = snap.data();
    const official = await verifyMn.getSession(stored.verifyMnSessionId);
    const status = official.sessionStatus === 'VERIFIED' ? 'VERIFIED' : official.sessionStatus === 'EXPIRED' ? 'EXPIRED' : 'PENDING';
    const patch = { status, callbackStatus: official.callbackStatus || 'SENT', updatedAt: new Date().toISOString() };
    if (status === 'VERIFIED') patch.verifiedAt = official.verifiedAt || new Date().toISOString();
    await ref.update(patch);
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('verify.mn callback check failed', { sid, status: error.status || 500, message: error.message });
    return res.status(500).json({ error: 'status check failed' });
  }
};
