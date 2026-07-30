const crypto = require('node:crypto');

const API_URL = 'https://api.verify.mn';

function configuredApiKey() {
  const key = process.env.VERIFY_MN_API_KEY;
  if (!key) throw new Error('VERIFY_MN_API_KEY is required');
  return key;
}

function randomNumericCode(length = 4) {
  if (!Number.isInteger(length) || length < 4 || length > 6) throw new Error('Verification code length must be 4-6');
  return crypto.randomInt(0, 10 ** length).toString().padStart(length, '0');
}

async function createSession(phone, options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const body = { phone, text: options.text || randomNumericCode(options.codeLength || 4) };
  if (options.responseSms) body.responseSms = options.responseSms;
  if (options.callback) body.callback = options.callback;
  const response = await fetchImpl(`${API_URL}/sessions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${configuredApiKey()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.sessionId) {
    const error = new Error(`verify.mn session creation failed (${response.status})`);
    error.status = response.status; throw error;
  }
  return data;
}

async function getSession(sessionId, options = {}) {
  const response = await (options.fetchImpl || fetch)(`${API_URL}/sessions/${encodeURIComponent(sessionId)}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) { const error = new Error(`verify.mn status check failed (${response.status})`); error.status = response.status; throw error; }
  return data;
}

/** Returns true only after the authoritative session endpoint reports VERIFIED. */
async function verifyPhone(phone, options = {}) {
  try {
    const session = await createSession(phone, options);
    await options.storeSession?.(session);
    await options.onSession?.(session);
    const deadline = Math.min(Date.parse(session.expiresAt), (options.now || Date.now)() + (options.timeoutMs || 300000));
    const sleep = options.sleep || ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    while ((options.now || Date.now)() < deadline) {
      const current = await getSession(session.sessionId, options);
      await options.onStatus?.(current);
      if (current.sessionStatus === 'VERIFIED') return true;
      if (current.sessionStatus === 'EXPIRED') return false;
      await sleep(options.pollIntervalMs || 3000);
    }
    return false;
  } catch (error) {
    options.logger?.warn?.('verify.mn phone verification failed', { status: error.status, message: error.message });
    return false;
  }
}

module.exports = { createSession, getSession, randomNumericCode, verifyPhone };
