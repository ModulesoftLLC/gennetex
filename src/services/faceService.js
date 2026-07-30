import { firebaseAuth } from '../lib/firebase';
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
} from './onDeviceFaceEngine';

export const isFaceApiConfigured = true;
export const ENROLL_TARGET = 10;
export const FACE_ENGINE = 'opencv-sface-v1';

function currentUserId() {
  const id = firebaseAuth?.currentUser?.uid;
  if (!id) throw new Error('Нүүр баталгаажуулахын тулд дахин нэвтэрнэ үү.');
  return id;
}

async function templatesFor(userId) {
  const rows = await firebaseList('face_enrollments', {
    whereClauses: [{ field: 'user_id', op: '==', value: userId }],
  });
  return rows.filter((row) => row.engine === FACE_ENGINE && Array.isArray(row.embedding));
}

export async function verifyFace(_photoUrl, localUri) {
  const userId = currentUserId();
  if (!localUri) throw new Error('Нүүр таних local selfie зураг олдсонгүй. Дахин зураг авна уу.');
  const templates = await templatesFor(userId);
  if (templates.length < ENROLL_TARGET) {
    throw new Error(`Царайгаа шинэ үнэгүй AI системд ${ENROLL_TARGET} удаа бүртгүүлнэ үү.`);
  }
  const { embedding, quality } = await createFaceEmbedding(localUri);
  const confidence = templates.reduce(
    (best, template) => Math.max(best, cosineSimilarity(embedding, template.embedding)),
    -1
  );
  return {
    skipped: false,
    match: confidence >= FACE_MATCH_THRESHOLD,
    confidence,
    quality,
    engine: FACE_ENGINE,
  };
}

export async function insertEnrollment({ localUri, photoUrl = null }) {
  const userId = currentUserId();
  if (!localUri) throw new Error('Нүүр бүртгэх local selfie зураг олдсонгүй.');
  const profile = await firebaseGetOne('profiles', userId);
  if (!profile) throw new Error('Ажилтны мэдээлэл олдсонгүй.');
  const { embedding, quality } = await createFaceEmbedding(localUri);
  const existing = await templatesFor(userId);
  if (existing.some((row) => cosineSimilarity(embedding, row.embedding) > 0.995)) {
    throw new Error('Өмнөхтэй яг ижил зураг байна. Толгойн өнцгөө бага зэрэг өөрчлөөд дахин авна уу.');
  }
  await firebaseCreate('face_enrollments', {
    user_id: userId,
    user_name: profile.name || null,
    photo_url: photoUrl,
    embedding,
    quality,
    engine: FACE_ENGINE,
  });
  const count = existing.length + 1;
  await firebaseUpdate('profiles', userId, {
    face_uuid: `${FACE_ENGINE}:${userId}`,
    faceUuid: `${FACE_ENGINE}:${userId}`,
    face_enrolled: count >= ENROLL_TARGET,
    faceEnrolled: count >= ENROLL_TARGET,
  });
  return { ok: true, count, complete: count >= ENROLL_TARGET, quality, engine: FACE_ENGINE };
}

export async function countEnrollments(userId) {
  return (await templatesFor(userId)).length;
}

export async function getFaceUuid(userId) {
  const profile = await firebaseGetOne('profiles', userId);
  return profile?.face_uuid || profile?.faceUuid || null;
}

export async function setFaceEnrolled(userId) {
  await firebaseUpdate('profiles', userId, { face_enrolled: true, faceEnrolled: true });
}
