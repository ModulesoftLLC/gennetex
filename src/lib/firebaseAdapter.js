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

export async function firebaseList(collectionName, options = {}) {
  try {
    const db = ensureDb();
    const { whereClauses = [], order = null, limitCount = null } = options;
    let q = collection(db, collectionName);
    if (whereClauses.length) {
      q = query(q, ...whereClauses.map((w) => where(w.field, w.op, w.value)));
    }
    if (order) q = query(q, orderBy(order.field, order.direction || 'asc'));
    if (limitCount) q = query(q, limit(limitCount));
    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  } catch (error) {
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
    };
    const refDoc = await addDoc(collection(db, collectionName), data);
    const snap = await getDoc(refDoc);
    return { id: snap.id, ...snap.data() };
  } catch (error) {
    console.warn('Firebase create failed:', error?.message || error);
    throw error;
  }
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
    q = query(q, ...whereClauses.map((w) => where(w.field, w.op, w.value)));
  }
  if (order) q = query(q, orderBy(order.field, order.direction || 'asc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
  });
}

export async function firebaseUploadFile(path, file, contentType = 'application/octet-stream') {
  try {
    const storage = ensureStorage();
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file, { contentType });
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

// Push token management (store tokens in Firestore for server-side FCM sends)
export async function firebaseRegisterPushToken(userId, token) {
  try {
    const db = ensureDb();
    if (!userId || !token) return null;
    const id = `${userId}_${token}`;
    await setDoc(doc(db, 'pushTokens', id), {
      userId,
      token,
      createdAt: serverTimestamp(),
    });
    return { id, userId, token };
  } catch (error) {
    console.warn('Register push token failed:', error?.message || error);
    throw error;
  }
}

export async function firebaseUnregisterPushToken(userId, token) {
  try {
    const db = ensureDb();
    if (!userId || !token) return null;
    const id = `${userId}_${token}`;
    await deleteDoc(doc(db, 'pushTokens', id));
    return { id };
  } catch (error) {
    console.warn('Unregister push token failed:', error?.message || error);
    throw error;
  }
}

export async function firebaseGetTokensForUser(userId) {
  try {
    const db = ensureDb();
    const q = query(collection(db, 'pushTokens'), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data().token).filter(Boolean);
  } catch (error) {
    console.warn('Get tokens for user failed:', error?.message || error);
    return [];
  }
}
