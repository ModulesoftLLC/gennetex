/** Server-only employee phone verification and PIN authentication. */
const crypto = require('node:crypto');
const admin = require('firebase-admin');
const verifyMn = require('./_lib/verifyMn');

const VERIFY_API_KEY = process.env.VERIFY_MN_API_KEY;
if (!VERIFY_API_KEY) throw new Error('VERIFY_MN_API_KEY is required');

function getAdmin() {
  if (!admin.apps.length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is required');
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
  }
  return admin;
}

const allowedPurposes = new Set(['PHONE_ACTIVATION', 'PIN_SETUP', 'PIN_RESET']);
const normalizePhone = (value) => {
  const digits = String(value || '').replace(/\D/g, '').replace(/^976/, '');
  if (!/^\d{8}$/.test(digits)) throw httpError(400, 'Монгол утасны дугаар 8 оронтой байна.');
  return `+976${digits}`;
};
const httpError = (status, message) => Object.assign(new Error(message), { status });
const safeEqual = (a, b) => {
  const aa = Buffer.from(String(a || '')); const bb = Buffer.from(String(b || ''));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
};
const tokenHash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const now = () => new Date().toISOString();

function hashPin(pin, salt = crypto.randomBytes(16).toString('hex')) {
  return new Promise((resolve, reject) => crypto.scrypt(pin, salt, 64, (error, key) => {
    if (error) reject(error); else resolve(`scrypt$${salt}$${key.toString('hex')}`);
  }));
}
async function comparePin(pin, encoded) {
  const [, salt, expected] = String(encoded || '').split('$');
  if (!salt || !expected) return false;
  const actual = await hashPin(pin, salt);
  return safeEqual(actual, encoded);
}
function validatePin(pin) {
  if (!/^\d{4}$/.test(String(pin || ''))) throw httpError(400, 'PIN яг 4 оронтой байна.');
}
function publicSession(doc) {
  return {
    sessionId: doc.id, displayCode: doc.displayCode, shortcode: doc.shortcode,
    smsUri: doc.smsUri, displayInstruction: doc.displayInstruction,
    expiresAt: doc.expiresAt, status: doc.status,
  };
}
async function requireAdmin(req) {
  const match = String(req.headers.authorization || '').match(/^Bearer (.+)$/);
  if (!match) throw httpError(401, 'Нэвтрэх шаардлагатай.');
  const decoded = await getAdmin().auth().verifyIdToken(match[1]);
  const snap = await getAdmin().firestore().collection('profiles').doc(decoded.uid).get();
  if (!['admin', 'superadmin'].includes(snap.data()?.role)) throw httpError(403, 'Админ эрх шаардлагатай.');
  return { uid: decoded.uid, profile: snap.data() };
}
async function findEmployee(phone) {
  const snap = await getAdmin().firestore().collection('profiles').where('normalizedPhone', '==', phone).limit(1).get();
  if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };
  const legacy = await getAdmin().firestore().collection('profiles').where('phone', '==', phone.slice(4)).limit(1).get();
  if (legacy.empty) return null;
  const doc = legacy.docs[0];
  await doc.ref.set({ normalizedPhone: phone, updatedAt: now() }, { merge: true });
  return { id: doc.id, ...doc.data(), normalizedPhone: phone };
}
async function createVerifySession(employee, purpose) {
  const displayCode = verifyMn.randomNumericCode(4);
  const ref = getAdmin().firestore().collection('verificationSessions').doc();
  const configuredCallback = String(process.env.VERIFY_MN_CALLBACK_URL || '').trim();
  const callback = /^https:\/\//i.test(configuredCallback) && !/localhost|127\.0\.0\.1/i.test(configuredCallback)
    ? `${configuredCallback}${configuredCallback.includes('?') ? '&' : '?'}sid=${encodeURIComponent(ref.id)}`
    : undefined;
  let data;
  try { data = await verifyMn.createSession(employee.normalizedPhone.slice(4), { text: displayCode, responseSms: 'Amjiltai batalgaajilaa', callback }); }
  catch (error) { throw httpError(error.status === 401 ? 502 : 502, 'Утас баталгаажуулах үйлчилгээнд алдаа гарлаа.'); }
  const record = {
    id: ref.id, employeeId: employee.id, phone: employee.normalizedPhone, purpose,
    verifyMnSessionId: data.sessionId, displayCode, status: 'PENDING',
    shortcode: data.shortcode || '144773', smsUri: data.smsUri || `sms:144773?body=${displayCode}`,
    displayInstruction: data.displayInstruction || `144773 дугаарт “${displayCode}” гэж SMS илгээнэ үү`,
    expiresAt: data.expiresAt, verifiedAt: null, createdAt: now(), updatedAt: now(),
  };
  await ref.set(record);
  return record;
}
async function checkSession(id) {
  const ref = getAdmin().firestore().collection('verificationSessions').doc(String(id || ''));
  const snap = await ref.get();
  if (!snap.exists) throw httpError(404, 'Баталгаажуулалтын хүсэлт олдсонгүй.');
  const session = snap.data();
  if (session.status === 'CANCELLED') return session;
  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    await ref.update({ status: 'EXPIRED', updatedAt: now() }); return { ...session, status: 'EXPIRED' };
  }
  let data;
  try { data = await verifyMn.getSession(session.verifyMnSessionId); }
  catch (error) { throw httpError(502, 'Баталгаажуулалтын төлөв шалгаж чадсангүй.'); }
  const status = data.sessionStatus === 'VERIFIED' ? 'VERIFIED' : data.sessionStatus === 'EXPIRED' ? 'EXPIRED' : 'PENDING';
  const patch = { status, updatedAt: now() };
  if (status === 'VERIFIED') patch.verifiedAt = data.verifiedAt || now();
  await ref.update(patch);
  return { ...session, ...patch };
}

module.exports = async function handler(req, res) {
  // Native Tauri clients use `http://tauri.localhost` / `tauri://localhost`
  // origins, so the API must explicitly allow cross-origin JSON + bearer auth.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const action = String(req.query.action || ''); const body = req.body || {}; const db = getAdmin().firestore();
    if (action === 'register') {
      await requireAdmin(req); const normalizedPhone = normalizePhone(body.phone);
      const duplicate = await findEmployee(normalizedPhone);
      if (duplicate && duplicate.id !== body.id) throw httpError(409, 'Энэ утасны дугаар бүртгэлтэй байна.');
      const ref = body.id ? db.collection('profiles').doc(body.id) : db.collection('profiles').doc();
      await ref.set({ firstName: String(body.firstName || body.name || '').trim(), lastName: String(body.lastName || '').trim(), phone: normalizedPhone.slice(4), normalizedPhone, phoneVerified: false, appPinConfigured: false, status: 'ACTIVE', updatedAt: now(), createdAt: body.createdAt || now() }, { merge: true });
      return res.status(200).json({ ok: true, id: ref.id });
    }
    if (action === 'delete-employee') {
      const actor = await requireAdmin(req); const employeeId = String(body.employeeId || '');
      if (actor.profile.role !== 'superadmin' && actor.profile.normalizedPhone !== '+97695238118') throw httpError(403, 'Зөвхөн системийн админ ажилтан устгана.');
      if (!employeeId || employeeId === actor.uid) throw httpError(400, 'Өөрийн бүртгэлийг устгах боломжгүй.');
      const employeeRef = db.collection('profiles').doc(employeeId); const employeeSnap = await employeeRef.get();
      if (!employeeSnap.exists) throw httpError(404, 'Ажилтан олдсонгүй.');
      if (employeeSnap.data()?.role === 'superadmin') throw httpError(403, 'Системийн админы бүртгэлийг устгах боломжгүй.');
      await Promise.all([
        employeeRef.delete(),
        db.collection('employeeAuthSecrets').doc(employeeId).delete(),
        getAdmin().auth().deleteUser(employeeId).catch((error) => { if (error.code !== 'auth/user-not-found') throw error; }),
      ]);
      return res.status(200).json({ ok: true });
    }
    if (action === 'start') {
      const phone = normalizePhone(body.phone); const purpose = String(body.purpose || 'PHONE_ACTIVATION');
      if (!allowedPurposes.has(purpose)) throw httpError(400, 'Баталгаажуулалтын зорилго буруу.');
      const employee = await findEmployee(phone);
      if (!employee || employee.status === 'DISABLED') throw httpError(404, 'Бүртгэлгүй утасны дугаар байна.');
      if (purpose === 'PHONE_ACTIVATION' && (employee.appPinConfigured || phone === '+97695238118')) {
        return res.status(200).json({ activated: true });
      }
      return res.status(200).json(publicSession(await createVerifySession(employee, purpose)));
    }
    if (action === 'check') {
      const session = await checkSession(body.sessionId); const result = publicSession(session);
      if (session.status === 'VERIFIED') {
        const raw = crypto.randomBytes(32).toString('base64url');
        await db.collection('verificationSessions').doc(session.id).update({ verificationTokenHash: tokenHash(raw), tokenExpiresAt: new Date(Date.now() + 10 * 60e3).toISOString() });
        result.verificationToken = raw;
      }
      return res.status(200).json(result);
    }
    if (action === 'cancel') {
      await db.collection('verificationSessions').doc(String(body.sessionId || '')).update({ status: 'CANCELLED', updatedAt: now() });
      return res.status(200).json({ ok: true });
    }
    if (action === 'set-pin') {
      validatePin(body.pin); const ref = db.collection('verificationSessions').doc(String(body.sessionId || '')); const snap = await ref.get();
      const session = snap.data();
      if (!session || session.status !== 'VERIFIED' || !safeEqual(session.verificationTokenHash, tokenHash(body.verificationToken)) || Date.parse(session.tokenExpiresAt) < Date.now()) throw httpError(401, 'Баталгаажуулалтын эрх хүчингүй.');
      const hash = await hashPin(String(body.pin)); const employeeRef = db.collection('profiles').doc(session.employeeId);
      await db.collection('employeeAuthSecrets').doc(session.employeeId).set({ appPinHash: hash, updatedAt: now() }, { merge: true });
      await employeeRef.update({ appPinConfigured: true, phoneVerified: true, updatedAt: now() });
      await ref.update({ verificationTokenHash: null, updatedAt: now() });
      const customToken = await getAdmin().auth().createCustomToken(session.employeeId);
      return res.status(200).json({ customToken });
    }
    if (action === 'login') {
      validatePin(body.pin); const employee = await findEmployee(normalizePhone(body.phone));
      const secret = employee ? (await db.collection('employeeAuthSecrets').doc(employee.id).get()).data() : null;
      if (!employee || !employee.phoneVerified || !secret?.appPinHash || employee.status === 'DISABLED' || !(await comparePin(String(body.pin), secret.appPinHash))) throw httpError(401, 'Утасны дугаар эсвэл PIN буруу байна.');
      return res.status(200).json({ customToken: await getAdmin().auth().createCustomToken(employee.id) });
    }
    if (action === 'revenue') {
      const actor = await requireAdmin(req); if (actor.profile.role !== 'superadmin' || actor.profile.normalizedPhone !== '+97695238118') throw httpError(403, 'Системийн админ эрх шаардлагатай.');
      const snap = await db.collection('verificationSessions').get(); const rows = snap.docs.map((d) => d.data());
      const successful = rows.filter((x) => x.status === 'VERIFIED').length; const failed = rows.filter((x) => ['EXPIRED', 'CANCELLED', 'ERROR'].includes(x.status)).length;
      const trend = Array.from({ length: 7 }, (_, index) => {
        const date = new Date(); date.setDate(date.getDate() - (6 - index)); const key = date.toISOString().slice(0, 10);
        const daily = rows.filter((x) => String(x.createdAt || '').slice(0, 10) === key);
        return { date: key, successful: daily.filter((x) => x.status === 'VERIFIED').length, failed: daily.filter((x) => ['EXPIRED', 'CANCELLED', 'ERROR'].includes(x.status)).length };
      });
      const previous = trend.slice(0, 3).reduce((sum, x) => sum + x.successful, 0); const recent = trend.slice(4).reduce((sum, x) => sum + x.successful, 0);
      return res.status(200).json({ successful, failed, revenueMnt: successful * 40, change: recent - previous, trend });
    }
    throw httpError(404, 'Үйлдэл олдсонгүй.');
  } catch (error) {
    console.error('employee-auth request failed', { action: req.query.action, status: error.status || 500, message: error.message });
    return res.status(error.status || 500).json({ error: error.status ? error.message : 'Серверийн алдаа гарлаа.' });
  }
};
