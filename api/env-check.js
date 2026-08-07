// Safe env check for deployment troubleshooting
// GET returns { configured: bool, projectId?: string, parseError?: string }

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).end();
  try {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '';
    if (!raw) return res.status(200).json({ configured: false, reason: 'FIREBASE_SERVICE_ACCOUNT_JSON missing' });

    // If value looks base64, try decode
    let parsed = null;
    let maybe = raw;
    // Heuristic: long base64 without braces
    if (!maybe.trim().startsWith('{') && /^[A-Za-z0-9+/=\n\r]+$/.test(maybe) && maybe.length > 200) {
      try {
        maybe = Buffer.from(maybe, 'base64').toString('utf8');
      } catch (e) {
        // ignore
      }
    }

    try {
      parsed = JSON.parse(maybe);
    } catch (err) {
      return res.status(200).json({ configured: false, parseError: String(err.message).slice(0,200) });
    }

    const projectId = parsed.project_id || null;
    return res.status(200).json({ configured: true, projectId });
  } catch (err) {
    return res.status(500).json({ configured: false, error: 'unexpected', message: String(err.message) });
  }
};
