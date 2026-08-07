/** Public website content and careers API backed by Firebase. */
let admin = null;

function initializeAdmin() {
  if (admin && admin.apps && admin.apps.length > 0) {
    return admin;
  }

  try {
    admin = require('firebase-admin');
    
    if (!admin.apps || admin.apps.length === 0) {
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
      if (!raw) {
        console.warn('[public-site] FIREBASE_SERVICE_ACCOUNT_JSON not configured');
        return null;
      }
      
      try {
        const serviceAccount = JSON.parse(raw);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
      } catch (parseErr) {
        console.error('[public-site] Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', parseErr.message);
        return null;
      }
    }
    
    return admin;
  } catch (err) {
    console.error('[public-site] Failed to initialize Firebase Admin:', err.message);
    return null;
  }
}

function send(res, status, body) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json');
  return res.status(status).json(body);
}

function clean(value, max = 500) {
  return String(value || '').trim().slice(0, max);
}

module.exports = async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  try {
    const firebaseAdmin = initializeAdmin();
    
    if (!firebaseAdmin) {
      console.warn('[public-site] Firebase not configured; returning fallback for GET');
      // If Firebase isn't configured, let GET requests return an empty public-site payload
      if (req.method === 'GET') {
        return send(res, 200, { content: null, updatedAt: null, configured: false });
      }
      // For POST and other mutating requests, require Firebase and return 503
      return send(res, 503, {
        error: 'Сервер тохируулагдаагүй байна. FIREBASE_SERVICE_ACCOUNT_JSON хэрэгтэй.',
        configured: false,
      });
    }

    const db = firebaseAdmin.firestore();

    if (req.method === 'GET') {
      try {
        const snap = await db.collection('publicSiteContent').doc('main').get();
        if (!snap.exists) {
          return send(res, 200, { content: null, updatedAt: null });
        }
        const data = snap.data() || {};
        return send(res, 200, {
          content: data.content || null,
          updatedAt: data.updatedAt?.toDate?.().toISOString?.() || data.updatedAt || null,
        });
      } catch (dbErr) {
        console.error('[public-site] Firestore GET error:', dbErr.message);
        return send(res, 500, { error: 'Өгөгдлийн сан дээр алдаа гарлаа.' });
      }
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const form = body.form;
      const general = form?.general;
      const name = clean(general?.firstName, 120);

      if (!form || !general || !name) {
        return send(res, 400, { error: 'Өөрийн нэрээ оруулна уу.' });
      }

      try {
        const serialized = JSON.stringify(form);
        if (serialized.length > 750000) {
          return send(res, 413, { error: 'Анкетын мэдээлэл хэт том байна.' });
        }

        const now = firebaseAdmin.firestore.FieldValue.serverTimestamp();
        const record = {
          name,
          last_name: clean(general.clanName, 120) || null,
          phone: clean(general.phoneMobile, 30) || null,
          email: clean(general.email, 200) || null,
          position: clean(form.jobInterest?.position, 200) || null,
          source: 'web',
          status: 'new',
          form_data: form,
          signature_svg: clean(body.signatureSvg, 200000) || null,
          signed_at: clean(body.signedAt, 50) || new Date().toISOString(),
          photo_attached: Boolean(body.photoAttached),
          created_at: now,
          updated_at: now,
        };

        const ref = await db.collection('jobApplications').add(record);
        return send(res, 201, { ok: true, id: ref.id });
      } catch (dbErr) {
        console.error('[public-site] Firestore POST error:', dbErr.message);
        return send(res, 500, { error: 'Анкета илгээхэд алдаа гарлаа.' });
      }
    }

    res.setHeader('Allow', 'GET, POST, OPTIONS');
    return send(res, 405, { error: 'Method not allowed' });
  } catch (error) {
    console.error('[public-site] Unexpected error:', {
      message: error?.message || String(error),
      code: error?.code,
    });
    return send(res, 500, {
      error: 'Сервертэй холбогдоход алдаа гарлаа.',
    });
  }
};



