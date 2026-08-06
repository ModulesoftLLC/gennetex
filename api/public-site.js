/** Public website content and careers API backed by Firebase. */
const admin = require('firebase-admin');

function getAdmin() {
  if (!admin.apps.length) {
    // Support either raw JSON or base64-encoded JSON to avoid issues with env editors.
    let raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    const rawB64 = process.env.FIREBASE_SERVICE_ACCOUNT_JSON_B64;
    if (!raw && rawB64) {
      try {
        raw = Buffer.from(rawB64, 'base64').toString('utf8');
      } catch (err) {
        console.error('[public-site] FIREBASE_SERVICE_ACCOUNT_JSON_B64 decode error:', err.message);
        return null;
      }
    }

    if (!raw) {
      // Firebase service account not provided — allow caller to handle unconfigured state.
      return null;
    }

    let creds;
    try {
      creds = JSON.parse(raw);
    } catch (err) {
      // Malformed JSON in env — log and treat as unconfigured so caller can handle it.
      console.error('[public-site] FIREBASE_SERVICE_ACCOUNT_JSON parse error:', err.message);
      return null;
    }
    // Some deploys store private_key with escaped newlines; convert to real newlines if present.
    if (creds && creds.private_key && creds.private_key.includes('\\n')) {
      creds.private_key = creds.private_key.replace(/\\n/g, '\n');
    }
    try {
      admin.initializeApp({ credential: admin.credential.cert(creds) });
    } catch (err) {
      console.error('[public-site] Firebase initialize error:', err.message);
      return null;
    }
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
    const adm = getAdmin();
    const db = adm ? adm.firestore() : null;

    if (req.method === 'GET') {
      // If Firestore not configured, return null content so frontend falls back to defaults
      if (!db) return send(res, 200, { content: null, updatedAt: null });
      const snap = await db.collection('publicSiteContent').doc('main').get();
      if (!snap.exists) return send(res, 200, { content: null, updatedAt: null });
      const data = snap.data() || {};
      return send(res, 200, {
        content: data.content || null,
        updatedAt: data.updatedAt?.toDate?.().toISOString?.() || data.updatedAt || null,
      });
    }

    if (req.method === 'POST') {
      // Disallow POST when Firestore/admin SDK not configured
      if (!db) return send(res, 503, { error: 'Server not configured for submissions' });

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
    console.error('[public-site] full error:', error);
    // Return a terse user message and include the error message in `debug` to help troubleshooting.
    // Remove `debug` before shipping to production if it may expose sensitive details.
    return send(res, 500, { error: 'Сервертэй холбогдоход алдаа гарлаа. Дахин оролдоно уу.', debug: String(error?.message || error) });
  }
};
