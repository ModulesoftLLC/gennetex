import { supabase } from '../lib/supabase';

// Luxand.cloud царай таних API. Expo Go дээр офлайн таних боломжгүй тул үүлэн API.
// Токеноо .env-д тавина:  EXPO_PUBLIC_LUXAND_TOKEN=...
// Токен авах: https://dashboard.luxand.cloud/token
const TOKEN = process.env.EXPO_PUBLIC_LUXAND_TOKEN;
const BASE = 'https://api.luxand.cloud';

export const isFaceApiConfigured = !!TOKEN;
export const ENROLL_TARGET = 10;
// Таних магадлалын босго (0..1). 0.9 = найдвартай таарц.
const MATCH_THRESHOLD = 0.9;

function normalizeResults(j) {
  if (Array.isArray(j)) return j;
  if (Array.isArray(j?.faces)) return j.faces;
  if (Array.isArray(j?.result)) return j.result;
  return [];
}

// Luxand дээр шинэ хүн үүсгэх (эхний зураг). uuid буцаана.
async function luxandCreatePerson(name, photoUrl) {
  const form = new FormData();
  form.append('name', name || 'Employee');
  form.append('store', '1');
  form.append('collections', '');
  form.append('photos', photoUrl);
  const res = await fetch(`${BASE}/v2/person`, {
    method: 'POST',
    headers: { token: TOKEN },
    body: form,
  });
  const j = await res.json();
  if (!res.ok || j.error) throw new Error(j.error || 'Luxand: хүн үүсгэхэд алдаа');
  return j.uuid || j.id;
}

// Байгаа хүнд нэмэлт царайны зураг нэмэх
async function luxandAddPhoto(uuid, photoUrl) {
  const form = new FormData();
  form.append('photos', photoUrl);
  const res = await fetch(`${BASE}/v2/person/${uuid}`, {
    method: 'POST',
    headers: { token: TOKEN },
    body: form,
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j.error) throw new Error(j.error || 'Luxand: зураг нэмэхэд алдаа');
  return j;
}

// Selfie файлыг таних (бүртгэлтэй хүмүүсээс хайна)
async function recognizePhotoFile(uri) {
  const form = new FormData();
  form.append('photo', { uri, name: 'selfie.jpg', type: 'image/jpeg'});
  const res = await fetch(`${BASE}/photo/search/v2`, {
    method: 'POST',
    headers: { token: TOKEN },
    body: form,
  });
  const j = await res.json().catch(() => ([]));
  return normalizeResults(j);
}

// Шинэ selfie нь тухайн ажилтны (myUuid) царай мөн эсэхийг шалгана
export async function verifyFace(selfieUri, myUuid) {
  if (!isFaceApiConfigured || !myUuid) return { skipped: true, match: true };
  const results = await recognizePhotoFile(selfieUri);
  let best = 0;
  for (const r of results) {
    const p = r.probability ?? r.confidence ?? 0;
    const id = r.uuid || r.id;
    if (id === myUuid && p > best) best = p;
  }
  return { skipped: false, match: best >= MATCH_THRESHOLD, confidence: best };
}

// ---- Бүртгэлийн DB + Luxand холболт ----
export async function insertEnrollment({ userId, userName, photoUrl }) {
  // Luxand дээр бүртгэх (public URL дамжуулна)
  if (isFaceApiConfigured) {
    const { data } = await supabase
      .from('profiles')
      .select('face_uuid')
      .eq('id', userId)
      .single();
    let uuid = data?.face_uuid;
    if (!uuid) {
      uuid = await luxandCreatePerson(userName, photoUrl);
      await supabase.from('profiles').update({ face_uuid: uuid }).eq('id', userId);
    } else {
      await luxandAddPhoto(uuid, photoUrl);
    }
  }
  const { error } = await supabase.from('face_enrollments').insert({
    user_id: userId,
    user_name: userName,
    photo_url: photoUrl,
  });
  if (error) throw error;
}

export async function countEnrollments(userId) {
  const { count, error } = await supabase
    .from('face_enrollments')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (error) throw error;
  return count || 0;
}

export async function getFaceUuid(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('face_uuid')
    .eq('id', userId)
    .single();
  if (error) return null;
  return data?.face_uuid || null;
}

export async function setFaceEnrolled(userId) {
  await supabase.from('profiles').update({ face_enrolled: true }).eq('id', userId);
}
