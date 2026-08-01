import { firebaseAuth } from '../lib/firebase';
import { signInWithCustomToken } from 'firebase/auth';

const CANONICAL_URL = 'https://gennetex.vercel.app/api/employee-auth';
const BASE_URL = String(process.env.EXPO_PUBLIC_EMPLOYEE_AUTH_API_URL || CANONICAL_URL).replace(/\/$/, '');
const ENDPOINTS = [...new Set([CANONICAL_URL, BASE_URL])]
  .filter((endpoint) => !/^https:\/\/adiya\.site(?:\/|$)/i.test(endpoint));

async function request(action, body = {}, authenticated = false) {
  if (!BASE_URL) throw new Error('EXPO_PUBLIC_EMPLOYEE_AUTH_API_URL тохируулаагүй байна.');
  const headers = { 'Content-Type': 'application/json' };
  if (authenticated) {
    const token = await firebaseAuth?.currentUser?.getIdToken();
    if (!token) throw new Error('Админ нэвтрээгүй байна.');
    headers.Authorization = `Bearer ${token}`;
  }
  let response; let lastError;
  for (const endpoint of ENDPOINTS) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      try {
        const candidate = await fetch(`${endpoint}?action=${encodeURIComponent(action)}`, {
          method: 'POST', headers, body: JSON.stringify(body), signal: controller.signal,
        });
        // A stale deployment often returns an HTML 404/500 page. Continue to the
        // canonical API instead of presenting that response as a server outage.
        const contentType = candidate.headers?.get?.('content-type') || '';
        if ([404, 405, 408, 429].includes(candidate.status) || candidate.status >= 500 || !contentType.includes('application/json')) {
          lastError = new Error(`${endpoint} HTTP ${candidate.status}`);
          continue;
        }
        response = candidate;
        break;
      } catch (error) {
        lastError = error;
        if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 700));
      } finally {
        clearTimeout(timeout);
      }
    }
    if (response) break;
  }
  if (!response) throw new Error(`Сүлжээний холболт тасарлаа. ${lastError?.message || 'API хүсэлт амжилтгүй.'}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Сервертэй холбогдоход алдаа гарлаа.');
  return data;
}

export const startVerification = (phone, purpose) => request('start', { phone, purpose });
export const checkVerification = (sessionId) => request('check', { sessionId });
export const cancelVerification = (sessionId) => request('cancel', { sessionId });
export const setPin = (sessionId, verificationToken, pin) => request('set-pin', { sessionId, verificationToken, pin });
export const loginWithPin = (phone, pin) => request('login', { phone, pin });
export const registerEmployeePhone = (employee) => request('register', employee, true);
export const deleteEmployee = (employeeId) => request('delete-employee', { employeeId }, true);
export const getVerificationRevenue = () => request('revenue', {}, true);

export async function verifyPhone(phone, options = {}) {
  try {
    const created = await startVerification(phone, options.purpose || 'PHONE_ACTIVATION');
    options.onSession?.(created);
    const deadline = Math.min(Date.parse(created.expiresAt), Date.now() + (options.timeoutMs || 300000));
    while (Date.now() < deadline) {
      const session = await checkVerification(created.sessionId);
      options.onStatus?.(session);
    if (session.status === 'VERIFIED') return true;
    if (['EXPIRED', 'CANCELLED', 'ERROR'].includes(session.status)) return false;
    await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  } catch (error) {
    options.onError?.(error);
  }
  return false;
}

export async function finishFirebaseLogin(customToken) {
  if (!firebaseAuth) throw new Error('Firebase Authentication тохируулаагүй байна.');
  const result = await signInWithCustomToken(firebaseAuth, customToken);
  return result.user;
}
