// Server endpoint: verifies Firebase ID token and links phone to existing user record
// POST { phone }

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
    const authHeader = req.headers.authorization || '';
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!match) return res.status(401).json({ error: 'Missing Authorization' });
    const idToken = match[1];

    const decoded = await admin.auth().verifyIdToken(idToken);
    const firebaseUid = decoded.uid;
    const phone = req.body.phone;
    if (!phone) return res.status(400).json({ error: 'phone required' });

    const db = admin.firestore();
    // Find user document by phone (legacy user mapping). Adjust collection/name as repo uses.
    const snap = await db.collection('users').where('phone', '==', phone).limit(1).get();
    if (snap.empty) {
      // No existing user with that phone — create a linking record
      await db.collection('phoneLinkRequests').add({ phone, firebaseUid, createdAt: admin.firestore.FieldValue.serverTimestamp() });
      return res.json({ linked: false, note: 'created request' });
    }

    const doc = snap.docs[0];
    const existingUid = doc.id;
    // Save mapping: users/{existingUid}.linkedFirebaseUid = firebaseUid
    await db.collection('users').doc(existingUid).set({ linkedFirebaseUid: firebaseUid }, { merge: true });
    return res.json({ linked: true, linkedUid: existingUid });
  } catch (err) {
    console.error('[phone-link-login] ', err);
    return res.status(500).json({ error: 'Internal error' });
  }
};
