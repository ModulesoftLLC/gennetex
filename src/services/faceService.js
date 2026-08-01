import { firebaseAuth } from '../lib/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  firebaseCreate,
  firebaseGetOne,
  firebaseList,
  firebaseUpdate,
} from '../lib/firebaseAdapter';
import {
  FACE_MATCH_THRESHOLD,
  cosineSimilarity,
  createFaceEmbedding,
  NATIVE_FACE_ENGINE,
} from './onDeviceFaceEngine';

export const isFaceApiConfigured = true;
export const ENROLL_TARGET = 10;
export const FACE_ENGINE = NATIVE_FACE_ENGINE;
const LOCAL_ENROLLMENT_KEY_PREFIX = '@gennetex/face-enrollments/';

function currentUserId() {
  const id = firebaseAuth?.currentUser?.uid;
  if (!id) throw new Error('Нүүр баталгаажуулахын тулд дахин нэвтэрнэ үү.');
  return id;
}

function localEnrollmentKey(userId) {
  return `${LOCAL_ENROLLMENT_KEY_PREFIX}${userId}`;
}

async function localTemplatesFor(userId, engine = null) {
  const raw = await AsyncStorage.getItem(localEnrollmentKey(userId));
  if (!raw) return [];
  try {
    const rows = JSON.parse(raw);
    if (!Array.isArray(rows)) return [];
    return rows.filter((row) => Array.isArray(row.embedding) && (!engine || row.engine === engine));
  } catch (error) {
    console.warn('Local face enrollment data is invalid:', error?.message || error);
    await AsyncStorage.removeItem(localEnrollmentKey(userId));
    return [];
  }
}

async function saveLocalTemplate(userId, template) {
  const rows = await localTemplatesFor(userId);
  await AsyncStorage.setItem(
    localEnrollmentKey(userId),
    JSON.stringify([...rows, {
      ...template,
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      localOnly: true,
    }])
  );
}

async function templatesFor(userId, engine = FACE_ENGINE) {
  const rows = await firebaseList('face_enrollments', {
    whereClauses: [{ field: 'user_id', op: '==', value: userId }],
  });
  const remote = rows.filter((row) => row.engine === engine && Array.isArray(row.embedding));
  return [...remote, ...(await localTemplatesFor(userId, engine))];
}

export async function verifyFace(_photoUrl, localUri) {
  const userId = currentUserId();
  if (!localUri) throw new Error('Нүүр таних local selfie зураг олдсонгүй. Дахин зураг авна уу.');
  const { embedding, quality, engine } = await createFaceEmbedding(localUri);
  const templates = await templatesFor(userId, engine);
  if (templates.length < ENROLL_TARGET) {
    throw new Error(`Царайгаа шинэ үнэгүй AI системд ${ENROLL_TARGET} удаа бүртгүүлнэ үү.`);
  }
  const confidence = templates.reduce(
    (best, template) => Math.max(best, cosineSimilarity(embedding, template.embedding)),
    -1
  );
  return {
    skipped: false,
    match: confidence >= FACE_MATCH_THRESHOLD,
    confidence,
    quality,
    engine,
  };
}

export async function insertEnrollment({ localUri, photoUrl = null }) {
  const userId = currentUserId();
  if (!localUri) throw new Error('Нүүр бүртгэх local selfie зураг олдсонгүй.');
  const profile = await firebaseGetOne('profiles', userId);
  const { embedding, quality, engine } = await createFaceEmbedding(localUri);
  const existing = await templatesFor(userId, engine);
  if (existing.some((row) => cosineSimilarity(embedding, row.embedding) > 0.995)) {
    throw new Error('Өмнөхтэй яг ижил зураг байна. Толгойн өнцгөө бага зэрэг өөрчлөөд дахин авна уу.');
  }
  const template = {
    user_id: userId,
    user_name: profile?.name || null,
    photo_url: photoUrl,
    embedding,
    quality,
    engine,
  };
  let localOnly = false;
  let syncWarning = null;
  try {
    await firebaseCreate('face_enrollments', template);
  } catch (error) {
    localOnly = true;
    syncWarning = 'Нүүрийн өгөгдөл энэ төхөөрөмжид хадгалагдлаа. Серверийн синк дараа дахин оролдоно.';
    console.warn('Cloud face enrollment failed; saving locally:', error?.message || error);
    await saveLocalTemplate(userId, template);
  }
  const count = existing.length + 1;
  if (!localOnly) {
    try {
      await firebaseUpdate('profiles', userId, {
        face_uuid: `${engine}:${userId}`,
        faceUuid: `${engine}:${userId}`,
        face_enrolled: count >= ENROLL_TARGET,
        faceEnrolled: count >= ENROLL_TARGET,
      });
    } catch (error) {
      syncWarning = 'Нүүрийн өгөгдөл хадгалагдсан ч профайл синк хийгдсэнгүй. Дараа дахин оролдоно.';
      console.warn('Face enrollment profile sync failed:', error?.message || error);
    }
  }
  return {
    ok: true,
    count,
    complete: count >= ENROLL_TARGET,
    quality,
    engine,
    localOnly,
    syncWarning,
  };
}

export async function countEnrollments(userId) {
  const rows = await firebaseList('face_enrollments', {
    whereClauses: [{ field: 'user_id', op: '==', value: userId }],
  });
  return rows.filter((row) => Array.isArray(row.embedding)).length
    + (await localTemplatesFor(userId)).length;
}

export async function getFaceUuid(userId) {
  const profile = await firebaseGetOne('profiles', userId);
  return profile?.face_uuid || profile?.faceUuid || null;
}

export async function setFaceEnrolled(userId) {
  await firebaseUpdate('profiles', userId, { face_enrolled: true, faceEnrolled: true });
}
