import { collection, doc, getDoc, getDocs, query, where, orderBy, limit, addDoc, setDoc, updateDoc, deleteDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { Buffer } from 'buffer';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as firebaseSignOut, sendPasswordResetEmail, updatePassword, onAuthStateChanged } from 'firebase/auth';
import { firestoreDb, firebaseStorage, firebaseAuth } from './firebase';

function ensureDb() {
  if (!firestoreDb) throw new Error('Firebase Firestore is not configured');
  return firestoreDb;
}

function ensureStorage() {
  if (!firebaseStorage) throw new Error('Firebase Storage is not configured');
  return firebaseStorage;
}

function ensureAuth() {
  if (!firebaseAuth) throw new Error('Firebase Authentication is not configured');
  return firebaseAuth;
}

export async function firebaseSignIn(email, password) {
  const auth = ensureAuth();
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  return user;
}

export async function firebaseSignUp(email, password, extra = {}) {
  const auth = ensureAuth();
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  return { user, extra };
}

export async function firebaseLogout() {
  const auth = ensureAuth();
  await firebaseSignOut(auth);
}

export async function firebaseResetPassword(email) {
  const auth = ensureAuth();
  await sendPasswordResetEmail(auth, email);
}

export async function firebaseChangePassword(newPassword) {
  const auth = ensureAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('No authenticated user');
  await updatePassword(user, newPassword);
}

export function firebaseWatchAuth(onChange) {
  const auth = ensureAuth();
  return onAuthStateChanged(auth, onChange);
}

export async function firebaseWaitForAuthenticatedUser() {
  const auth = ensureAuth();
  if (auth.currentUser) return auth.currentUser;

  return new Promise((resolve, reject) => {
    let unsubscribe = () => {};
    const timeout = setTimeout(() => {
      unsubscribe();
      reject(new Error('Firebase authentication session did not restore in time'));
    }, 10000);
    unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        clearTimeout(timeout);
        unsubscribe();
        if (user) {
          resolve(user);
        } else {
          reject(new Error('Firebase authentication session is unavailable'));
        }
      },
      (error) => {
        clearTimeout(timeout);
        unsubscribe();
        reject(error);
      }
    );
  });
}

function normalizeFirestoreField(field) {
  return typeof field === 'string' ? field : field;
}

function buildFirestoreQuery(dbCollection, whereClauses, order, limitCount, useCamelCase = false) {
  let q = dbCollection;
  if (whereClauses.length) {
    q = query(
      q,
      ...whereClauses.map((w) => {
        const field = useCamelCase ? w.field.replace(/_([a-z])/g, (_, c) => c.toUpperCase()) : w.field;
        return where(field, w.op, w.value);
      })
    );
  }
  if (order) {
    const field = useCamelCase ? order.field.replace(/_([a-z])/g, (_, c) => c.toUpperCase()) : order.field;
    q = query(q, orderBy(field, order.direction || 'asc'));
  }
  if (limitCount) q = query(q, limit(limitCount));
  return q;
}

function comparable(value) {
  return value?.toMillis ? value.toMillis() : value;
}

function matchesClause(row, clause) {
  const actual = comparable(row?.[clause.field]);
  const expected = comparable(clause.value);
  if (clause.op === '==') return actual === expected;
  if (clause.op === '!=') return actual !== expected;
  if (clause.op === '>') return actual > expected;
  if (clause.op === '>=') return actual >= expected;
  if (clause.op === '<') return actual < expected;
  if (clause.op === '<=') return actual <= expected;
  if (clause.op === 'in') return Array.isArray(expected) && expected.includes(actual);
  if (clause.op === 'not-in') return Array.isArray(expected) && !expected.includes(actual);
  if (clause.op === 'array-contains') return Array.isArray(actual) && actual.includes(expected);
  return true;
}

function finalizeRows(rows, clauses, order, limitCount) {
  let result = (rows || []).filter((row) => clauses.every((clause) => matchesClause(row, clause)));
  if (order?.field) {
    const direction = order.direction === 'desc' ? -1 : 1;
    result = [...result].sort((a, b) => {
      const av = comparable(a?.[order.field]);
      const bv = comparable(b?.[order.field]);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return (av < bv ? -1 : av > bv ? 1 : 0) * direction;
    });
  }
  return limitCount ? result.slice(0, limitCount) : result;
}

export async function firebaseList(collectionName, options = {}) {
  const db = ensureDb();
  const { whereClauses = [], order = null, limitCount = null } = options;
  const rawClauses = whereClauses.map((w) => ({ ...w, field: String(w.field) }));
  const tryQuery = async () => {
    // Server orderBy нь order field-гүй legacy document-ийг хасдаг тул client талд эрэмбэлнэ.
    const q = buildFirestoreQuery(collection(db, collectionName), rawClauses, null, null, false);
    const snap = await getDocs(q);
    return finalizeRows(snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })), rawClauses, order, limitCount);
  };

  try {
    return await tryQuery();
  } catch (error) {
    try {
      const snap = await getDocs(collection(db, collectionName));
      return finalizeRows(
        snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })),
        rawClauses,
        order,
        limitCount
      );
    } catch (fallbackError) {
      console.warn('Firebase list failed:', fallbackError?.message || error?.message || fallbackError || error);
      return [];
    }
  }
}

export async function firebaseGetOne(collectionName, id) {
  try {
    const db = ensureDb();
    const snap = await getDoc(doc(db, collectionName, id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (error) {
    console.warn('Firebase getOne failed:', error?.message || error);
    return null;
  }
}

export async function firebaseCreate(collectionName, payload) {
  try {
    const db = ensureDb();
    const data = {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    };
    const refDoc = await addDoc(collection(db, collectionName), data);
    const snap = await getDoc(refDoc);
    return { id: snap.id, ...snap.data() };
  } catch (error) {
    console.warn('Firebase create failed:', error?.message || error);
    throw error;
  }
}

export async function firebaseInsert(collectionName, payload) {
  return firebaseCreate(collectionName, payload);
}

export async function firebaseGetAll(collectionName, options = {}) {
  return firebaseList(collectionName, options);
}

export async function firebaseSet(collectionName, id, payload) {
  try {
    const db = ensureDb();
    const data = {
      ...payload,
      updatedAt: serverTimestamp(),
    };
    await setDoc(doc(db, collectionName, id), data, { merge: true });
    const snap = await getDoc(doc(db, collectionName, id));
    return { id: snap.id, ...snap.data() };
  } catch (error) {
    console.warn('Firebase set failed:', error?.message || error);
    throw error;
  }
}

export async function firebaseUpdate(collectionName, id, payload) {
  try {
    const db = ensureDb();
    const data = {
      ...payload,
      updatedAt: serverTimestamp(),
    };
    await updateDoc(doc(db, collectionName, id), data);
    const snap = await getDoc(doc(db, collectionName, id));
    return { id: snap.id, ...snap.data() };
  } catch (error) {
    console.warn('Firebase update failed:', error?.message || error);
    throw error;
  }
}

export async function firebaseDelete(collectionName, id) {
  try {
    const db = ensureDb();
    await deleteDoc(doc(db, collectionName, id));
  } catch (error) {
    console.warn('Firebase delete failed:', error?.message || error);
    throw error;
  }
}

export function firebaseSubscribe(collectionName, callback, options = {}) {
  const db = ensureDb();
  const { whereClauses = [], order = null } = options;
  let q = collection(db, collectionName);
  if (whereClauses.length) {
    q = query(
      q,
      ...whereClauses.map((w) => where(normalizeFirestoreField(w.field), w.op, w.value))
    );
  }
  return onSnapshot(
    q,
    (snap) => callback(finalizeRows(
      snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })),
      whereClauses,
      order,
      null
    )),
    (error) => {
      console.warn(`Firebase subscription failed (${collectionName}):`, error?.message || error);
      options.onError?.(error);
    }
  );
}

export function firebaseSubscribeOne(collectionName, id, callback, onError) {
  const db = ensureDb();
  if (!id) return () => {};
  return onSnapshot(
    doc(db, collectionName, id),
    (snap) => callback(snap.exists() ? { id: snap.id, ...snap.data() } : null),
    (error) => {
      console.warn(`Firebase document subscription failed (${collectionName}/${id}):`, error?.message || error);
      onError?.(error);
    }
  );
}

function normalizeUploadPayload(file, contentType) {
  if (file == null) throw new Error('No file data to upload');
  if (typeof Blob !== 'undefined' && file instanceof Blob) return file;
  if (typeof File !== 'undefined' && file instanceof File) return file;
  if (typeof ArrayBuffer !== 'undefined' && file instanceof ArrayBuffer) {
    return file;
  }
  if (ArrayBuffer.isView(file)) {
    return file;
  }
  return file;
}

function uploadPayloadAsBase64(file) {
  if (typeof ArrayBuffer === 'undefined') return null;
  let bytes = null;
  if (file instanceof ArrayBuffer) {
    bytes = new Uint8Array(file);
  } else if (ArrayBuffer.isView(file)) {
    bytes = new Uint8Array(file.buffer, file.byteOffset, file.byteLength);
  }
  return bytes ? Buffer.from(bytes).toString('base64') : null;
}

export async function firebaseUploadFile(path, file, contentType = 'application/octet-stream') {
  try {
    const storage = ensureStorage();
    const storageRef = ref(storage, path);
    const payload = normalizeUploadPayload(file, contentType);
    const base64 = uploadPayloadAsBase64(payload);
    if (base64) {
      await uploadString(storageRef, base64, 'base64', { contentType });
    } else {
      await uploadBytes(storageRef, payload, { contentType });
    }
    return getDownloadURL(storageRef);
  } catch (error) {
    console.warn('Firebase upload failed:', error?.message || error);
    throw error;
  }
}

/**
 * React Native дээр Blob/ArrayBuffer үүсгэхгүйгээр local URI-г Firebase Storage руу upload хийнэ.
 * Том зураг, video, PDF дээр санах ой хэтрэхээс хамгаална.
 */
export async function firebaseUploadUri(path, uri, contentType = 'application/octet-stream') {
  if (!uri) throw new Error('Upload хийх файл олдсонгүй.');
  try {
    const storage = ensureStorage();
    const storageRef = ref(storage, path);
    if (Platform.OS === 'web') {
      const response = await fetch(uri);
      if (!response.ok) throw new Error(`Файл уншиж чадсангүй (${response.status})`);
      await uploadBytes(storageRef, await response.blob(), { contentType });
      return getDownloadURL(storageRef);
    }

    const bucket = String(process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '').trim();
    const user = firebaseAuth?.currentUser;
    if (!bucket) throw new Error('Firebase Storage bucket тохируулаагүй байна.');
    if (!user) throw new Error('Файл upload хийхийн тулд нэвтэрнэ үү.');
    const token = await user.getIdToken();
    const endpoint = `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket)}/o?uploadType=media&name=${encodeURIComponent(path)}`;
    const result = await FileSystem.uploadAsync(endpoint, uri, {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': contentType,
      },
    });
    if (result.status < 200 || result.status >= 300) {
      let message = `Firebase Storage upload амжилтгүй (${result.status})`;
      try { message = JSON.parse(result.body)?.error?.message || message; } catch (_) {}
      throw new Error(message);
    }
    return getDownloadURL(storageRef);
  } catch (error) {
    console.warn('Firebase URI upload failed:', error?.message || error);
    throw error;
  }
}

export async function firebaseDeleteFile(path) {
  try {
    const storage = ensureStorage();
    await deleteObject(ref(storage, path));
  } catch (error) {
    console.warn('Firebase deleteFile failed:', error?.message || error);
    throw error;
  }
}
