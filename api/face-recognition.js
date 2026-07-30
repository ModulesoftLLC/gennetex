const admin = require('firebase-admin');

const BASE = 'https://api.luxand.cloud';
const MATCH_THRESHOLD = 0.9;

function getAdmin() {
  if (!admin.apps.length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is required');
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
  }
  return admin;
}

function httpError(status, message) { return Object.assign(new Error(message), { status }); }

async function requireUser(req) {
  const match = String(req.headers.authorization || '').match(/^Bearer (.+)$/);
  if (!match) throw httpError(401, 'Нэвтрэх шаардлагатай.');
  return getAdmin().auth().verifyIdToken(match[1]);
}

function token() {
  const value = process.env.LUXAND_TOKEN || process.env.EXPO_PUBLIC_LUXAND_TOKEN;
  if (!value) throw httpError(503, 'Нүүр таних үйлчилгээ тохируулаагүй байна.');
  return value;
}

async function imageFile(photoUrl) {
  if (!/^https:\/\//i.test(String(photoUrl || ''))) throw httpError(400, 'Selfie зураг буруу байна.');
  const response = await fetch(photoUrl);
  if (!response.ok) throw httpError(502, 'Selfie зургийг татаж чадсангүй.');
  const type = response.headers.get('content-type') || 'image/jpeg';
  return { blob: await response.blob(), type };
}

async function luxand(path, form) {
  const response = await fetch(`${BASE}${path}`, { method: 'POST', headers: { token: token() }, body: form });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result?.error) {
    const raw = result?.error?.message || result?.error || result?.message;
    throw httpError(502, typeof raw === 'string' ? raw : 'Нүүр таних үйлчилгээнд алдаа гарлаа.');
  }
  return result;
}

function resultsOf(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.faces)) return value.faces;
  if (Array.isArray(value?.result)) return value.result;
  return [];
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const user = await requireUser(req);
    const action = String(req.query.action || '');
    const profileRef = getAdmin().firestore().collection('profiles').doc(user.uid);
    const profileSnap = await profileRef.get();
    if (!profileSnap.exists) throw httpError(404, 'Ажилтны мэдээлэл олдсонгүй.');
    const profile = profileSnap.data();
    const image = await imageFile(req.body?.photoUrl);

    if (action === 'enroll') {
      const form = new FormData();
      form.append('photos', image.blob, `face-${Date.now()}.jpg`);
      let uuid = profile.face_uuid || profile.faceUuid;
      if (uuid) {
        await luxand(`/v2/person/${encodeURIComponent(uuid)}`, form);
      } else {
        form.append('name', profile.name || `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Employee');
        form.append('store', '1');
        const created = await luxand('/v2/person', form);
        uuid = created.uuid || created.id;
        if (!uuid) throw httpError(502, 'Нүүрийн бүртгэлийн ID ирсэнгүй.');
        await profileRef.set({ face_uuid: uuid, faceUuid: uuid, updatedAt: new Date().toISOString() }, { merge: true });
      }
      await getAdmin().firestore().collection('face_enrollments').add({ user_id: user.uid, user_name: profile.name || null, photo_url: req.body.photoUrl, created_at: new Date().toISOString() });
      const countSnap = await getAdmin().firestore().collection('face_enrollments').where('user_id', '==', user.uid).get();
      const count = countSnap.size;
      if (count >= 10) await profileRef.set({ face_enrolled: true, faceEnrolled: true, updatedAt: new Date().toISOString() }, { merge: true });
      return res.status(200).json({ ok: true, uuid, count, complete: count >= 10 });
    }

    if (action === 'verify') {
      const uuid = profile.face_uuid || profile.faceUuid;
      if (!uuid) throw httpError(409, 'Царайгаа эхлээд бүртгүүлнэ үү.');
      const form = new FormData();
      form.append('photo', image.blob, `verify-${Date.now()}.jpg`);
      const matches = resultsOf(await luxand('/photo/search/v2', form));
      let confidence = 0;
      for (const match of matches) {
        if ((match.uuid || match.id) === uuid) confidence = Math.max(confidence, Number(match.probability ?? match.confidence ?? 0));
      }
      return res.status(200).json({ ok: true, match: confidence >= MATCH_THRESHOLD, confidence });
    }
    throw httpError(404, 'Үйлдэл олдсонгүй.');
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message || 'Нүүр таних алдаа' });
  }
};
