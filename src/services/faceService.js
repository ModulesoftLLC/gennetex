import { supabase } from '../lib/supabase';
import { firebaseAuth } from '../lib/firebase';

export const isFaceApiConfigured = true;
export const ENROLL_TARGET = 3;

function endpoint(action) {
  const employeeAuthUrl = String(process.env.EXPO_PUBLIC_EMPLOYEE_AUTH_API_URL || '').trim();
  const base = employeeAuthUrl
    ? employeeAuthUrl.replace(/\/employee-auth\/?(?:\?.*)?$/, '/face-recognition')
    : 'https://adiya.site/api/face-recognition';
  return `${base}?action=${encodeURIComponent(action)}`;
}

async function request(action, photoUrl) {
  const user = firebaseAuth?.currentUser;
  if (!user) throw new Error('Нүүр баталгаажуулахын тулд дахин нэвтэрнэ үү.');
  const response = await fetch(endpoint(action), {
    method: 'POST',
    headers: { Authorization: `Bearer ${await user.getIdToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ photoUrl }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `Нүүр таних серверийн алдаа (${response.status})`);
  return result;
}

export async function verifyFace(photoUrl) {
  const result = await request('verify', photoUrl);
  return { skipped: false, match: !!result.match, confidence: Number(result.confidence || 0) };
}

export async function insertEnrollment({ photoUrl }) {
  return request('enroll', photoUrl);
}

export async function countEnrollments(userId) {
  const { count, error } = await supabase.from('face_enrollments').select('id', { count: 'exact', head: true }).eq('user_id', userId);
  if (error) throw error;
  return count || 0;
}

export async function getFaceUuid(userId) {
  const { data, error } = await supabase.from('profiles').select('face_uuid').eq('id', userId).single();
  if (error) return null;
  return data?.face_uuid || data?.faceUuid || null;
}

export async function setFaceEnrolled(userId) {
  await supabase.from('profiles').update({ face_enrolled: true }).eq('id', userId);
}
