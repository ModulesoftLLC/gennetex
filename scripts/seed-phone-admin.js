/** One-time secure seed. Run with SYSTEM_ADMIN_INITIAL_PIN=5555; the PIN is only persisted as scrypt. */
const crypto = require('node:crypto');
const admin = require('firebase-admin');

const phone = '+97695238118';
const pin = String(process.env.SYSTEM_ADMIN_INITIAL_PIN || '');
const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
if (!/^\d{4}$/.test(pin)) throw new Error('SYSTEM_ADMIN_INITIAL_PIN must contain exactly 4 digits');
if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is required');

function hashPin(value) {
  const salt = crypto.randomBytes(16).toString('hex');
  return new Promise((resolve, reject) => crypto.scrypt(value, salt, 64, (error, key) => error ? reject(error) : resolve(`scrypt$${salt}$${key.toString('hex')}`)));
}

(async () => {
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
  const auth = admin.auth(); const db = admin.firestore(); const email = '95238118@phone.gennetex.mn';
  let user;
  try { user = await auth.getUserByEmail(email); } catch (e) { if (e.code !== 'auth/user-not-found') throw e; user = await auth.createUser({ email, emailVerified: true }); }
  await db.collection('profiles').doc(user.uid).set({ id:user.uid, name:'System Admin', firstName:'System', lastName:'Admin', email, phone:'95238118', normalizedPhone:phone, phoneVerified:true, appPinConfigured:true, status:'ACTIVE', role:'superadmin', updatedAt:new Date().toISOString() }, { merge:true });
  await db.collection('employeeAuthSecrets').doc(user.uid).set({ appPinHash:await hashPin(pin), updatedAt:new Date().toISOString() }, { merge:true });
  console.log('System admin phone profile seeded successfully.');
  process.exit(0);
})().catch((error) => { console.error(error.message); process.exit(1); });
