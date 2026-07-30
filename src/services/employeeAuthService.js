import { firebaseAuth } from '../lib/firebase';
import { signInWithCustomToken } from 'firebase/auth';

const BASE_URL = String(process.env.EXPO_PUBLIC_EMPLOYEE_AUTH_API_URL || '').replace(/\/$/, '');

async function request(action, body = {}, authenticated = false) {
  if (!BASE_URL) throw new Error('EXPO_PUBLIC_EMPLOYEE_AUTH_API_URL тохируулаагүй байна.');
  const headers = { 'Content-Type': 'application/json' };
  if (authenticated) {
    const token = await firebaseAuth?.currentUser?.getIdToken();
    if (!token) throw new Error('Админ нэвтрээгүй байна.');
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(`${BASE_URL}?action=${encodeURIComponent(action)}`, {
    method: 'POST', headers, body: JSON.stringify(body),
  });
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
