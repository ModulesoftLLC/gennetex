import { firebaseSubscribe, firebaseUpdate, firebaseInsert, firebaseGetAll } from '../lib/firebaseAdapter';
import { withoutSampleByName, withoutSampleVisits } from '../lib/sampleNames';
import { filterVisibleProfiles } from '../lib/roles';

// Ажилтны одоогийн байршлыг profiles дээр шинэчлэх (админ хардаг)
export async function updateMyLocation(userId, { latitude, longitude, accuracy, heading, speed, timestamp }) {
  // Supabase-ийн оронд Firebase-ийн update функцийг ашиглана
  await firebaseUpdate('profiles', userId, {
    latitude,
    longitude,
    location_accuracy: accuracy ?? null,
    location_heading: heading ?? null,
    location_speed: speed ?? null,
    location_source: 'foreground',
    last_seen: new Date(timestamp || Date.now()).toISOString(),
  });
}

// Байршлын лог нэмэх (түүх)
export async function logLocation({ userId, userName, latitude, longitude, speed }) {
  // Supabase-ийн оронд Firebase-ийн insert функцийг ашиглана
  await firebaseInsert('location_logs', {
    user_id: userId,
    user_name: userName,
    latitude,
    longitude,
    speed: speed ?? null,
  });
}

// Айлд очсон лог
export async function logVisit({
  userId,
  userName,
  callId,
  customer,
  problem,
  callType,
  latitude,
  longitude,
  photoUrl,
  faceVerified,
  locationName,
}) {
  // Supabase-ийн оронд Firebase-ийн insert функцийг ашиглана
  await firebaseInsert('visit_logs', {
    user_id: userId,
    user_name: userName,
    call_id: callId,
    customer,
    problem: problem ?? null,
    call_type: callType ?? null,
    latitude,
    longitude,
    photo_url: photoUrl ?? null,
    face_verified: faceVerified ?? false,
    location_name: locationName ?? customer ?? null,
  });
}

// Админ: Firebase profiles collection-оос ажилчдын одоогийн байршлыг авна.
export async function fetchWorkers(viewerRole = 'admin') {
  // Firebase-ээс бүх профайлыг татаж авах
  const profiles = await firebaseGetAll('profiles', { order: { field: 'name', direction: 'asc' } });
  return filterVisibleProfiles(withoutSampleByName(profiles || []), viewerRole);
}

export async function fetchVisitLogs(limit = 50) {
  // Supabase-ийн оронд Firebase-ийн getAll функцийг ашиглана
  const data = await firebaseGetAll('visit_logs', { order: { field: 'arrived_at', direction: 'desc' }, limit });
  return withoutSampleVisits(data || []);
}

export function subscribeWorkers(onChange) {

  return firebaseSubscribe(
    'profiles',
    () => onChange(),
    { order: { field: 'name', direction: 'asc' } }
  );
}
