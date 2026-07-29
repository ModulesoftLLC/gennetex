import { collection, doc, getDoc, getDocs, query, where, orderBy, limit, addDoc, setDoc, updateDoc, deleteDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
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

function normalizeFirestoreField(field) {
  if (typeof field !== 'string') return field;
  if (field.includes('_')) {
    return field.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
  }
  return field;
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

export async function firebaseList(collectionName, options = {}) {
  const db = ensureDb();
  const { whereClauses = [], order = null, limitCount = null } = options;
  const rawClauses = whereClauses.map((w) => ({ ...w, field: String(w.field) }));
  const tryQuery = async (useCamelCase = false) => {
    const q = buildFirestoreQuery(collection(db, collectionName), rawClauses, order, limitCount, useCamelCase);
    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  };

  try {
    return await tryQuery(false);
  } catch (error) {
    if (rawClauses.some((w) => w.field.includes('_')) || (order?.field && order.field.includes('_'))) {
      try {
        return await tryQuery(true);
      } catch (fallbackError) {
        console.warn('Firebase list fallback failed:', fallbackError?.message || fallbackError);
        return [];
      }
    }
    console.warn('Firebase list failed:', error?.message || error);
    return [];
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
  if (order) q = query(q, orderBy(normalizeFirestoreField(order.field), order.direction || 'asc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
  });
}

function normalizeUploadPayload(file, contentType) {
  if (file == null) throw new Error('No file data to upload');
  if (typeof Blob !== 'undefined' && file instanceof Blob) return file;
  if (typeof File !== 'undefined' && file instanceof File) return file;
  if (typeof ArrayBuffer !== 'undefined' && file instanceof ArrayBuffer) {
    return new Blob([file], { type: contentType });
  }
  if (ArrayBuffer.isView(file)) {
    const view = file;
    const buffer = view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength);
    return new Blob([buffer], { type: contentType });
  }
  return file;
}

export async function firebaseUploadFile(path, file, contentType = 'application/octet-stream') {
  try {
    const storage = ensureStorage();
    const storageRef = ref(storage, path);
    const payload = normalizeUploadPayload(file, contentType);
    await uploadBytes(storageRef, payload, { contentType });
    return getDownloadURL(storageRef);
  } catch (error) {
    console.warn('Firebase upload failed:', error?.message || error);
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
