import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

const authPersistence = isFirebaseConfigured && Platform.OS !== 'web'
  ? getReactNativePersistence(AsyncStorage)
  : null;

function createFirebaseAuthInstance(app) {
  if (!app) return null;
  if (authPersistence) {
    try {
      return initializeAuth(app, { persistence: authPersistence });
    } catch (error) {
      const message = String(error?.message || error || '');
      if (message.includes('already-initialized')) {
        return getAuth(app);
      }
      throw error;
    }
  }
  return getAuth(app);
}

export const firebaseAuth = createFirebaseAuthInstance(firebaseApp);
export const firestoreDb = isFirebaseConfigured && firebaseApp ? getFirestore(firebaseApp) : null;
export const firebaseStorage = isFirebaseConfigured && firebaseApp ? getStorage(firebaseApp) : null;

export function normalizeFirebaseError(error) {
  if (!error) return null;
  if (typeof error === 'string') return new Error(error);
  return new Error(error.message || 'Firebase error');
}
