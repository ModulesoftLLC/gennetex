/** Public website content and careers API backed by Firebase. */
const admin = require('firebase-admin');

function getAdmin() {
  if (!admin.apps.length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!raw) {
      // Return null instead of throwing to allow handler to give a clearer HTTP response
      return null;
    }
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
  }
  return admin;
}

function send(res, status, body) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(body);
}

function clean(value, max = 500) {
  return String(value || '').trim().slice(0, max);
}

module.exports = async function handler(req, res) {
  try {
    const fbAdmin = getAdmin();
    if (!fbAdmin) {
      // Helpful error for missing env config (do NOT leak secret values)
      return send(res, 500, {
        error: 'Server configuration error: FIREBASE_SERVICE_ACCOUNT_JSON is not set. Set this environment variable in Vercel (Settings → Environment Variables) with the Firebase service account JSON to enable this API.'
      });
    }

    const db = fbAdmin.firestore();

    if (req.method === 'GET') {
      const snap = await db.collection('publicSiteContent').doc('main').get();
      if (!snap.exists) return send(res, 200, { content: null, updatedAt: null });
      const data = snap.data() || {};
      return send(res, 200, {
        content: data.content || null,
        updatedAt: data.updatedAt?.toDate?.().toISOString?.() || data.updatedAt || null,
      });
    }

    if (req.method === 'POST') {
      const form = req.body?.form;
      const general = form?.general;
      const name = clean(general?.firstName, 120);
      if (!form || !general || !name) return send(res, 400, { error: 'Өөрийн нэрээ оруулна уу.' });

      const serialized = JSON.stringify(form);
      if (serialized.length > 750000) return send(res, 413, { error: 'Анкетын мэдээлэл хэт том байна.' });

      const now = admin.firestore.FieldValue.serverTimestamp();
      const record = {
        name,
        last_name: clean(general.clanName, 120) || null,
        phone: clean(general.phoneMobile, 30) || null,
        email: clean(general.email, 200) || null,
        position: clean(form.jobInterest?.position, 200) || null,
        source: 'web',
        status: 'new',
        form_data: form,
        signature_svg: clean(req.body?.signatureSvg, 200000) || null,
        signed_at: clean(req.body?.signedAt, 50) || new Date().toISOString(),
        photo_attached: Boolean(req.body?.photoAttached),
        created_at: now,
        updated_at: now,
      };
      const ref = await db.collection('jobApplications').add(record);
      return send(res, 201, { ok: true, id: ref.id });
    }

    res.setHeader('Allow', 'GET, POST');
    return send(res, 405, { error: 'Method not allowed' });
  } catch (error) {
    console.error('[public-site]', error?.message || error);
    return send(res, 500, { error: 'Сервертэй холбогдоход алдаа гарлаа. Дахин оролдоно уу.' });
  }
};