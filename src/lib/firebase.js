import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || '',
};

export const isFirebaseConfigured = Boolean(config.projectId && config.apiKey);

export const firebaseApp = isFirebaseConfigured
  ? getApps().length > 0
    ? getApp()
    : initializeApp(config)
  : null;

export const firebaseAuth = isFirebaseConfigured && firebaseApp ? getAuth(firebaseApp) : null;
export const firestoreDb = isFirebaseConfigured && firebaseApp ? getFirestore(firebaseApp) : null;
export const firebaseStorage = isFirebaseConfigured && firebaseApp ? getStorage(firebaseApp) : null;

export function normalizeFirebaseError(error) {
  if (!error) return null;
  if (typeof error === 'string') return new Error(error);
  return new Error(error.message || 'Firebase error');
}
