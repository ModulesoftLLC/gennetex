const fs = require('fs');
const path = require('path');
const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, setDoc, serverTimestamp } = require('firebase/firestore');

function readEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  const text = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  const values = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    values[key] = value.replace(/^['"]|['"]$/g, '');
  }
  return values;
}

(async () => {
  const env = readEnv();
  const config = {
    apiKey: env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
    authDomain: env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
    projectId: env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
    storageBucket: env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
  };

  const app = initializeApp(config);
  const auth = getAuth(app);
  const db = getFirestore(app);

  const email = 'admin@gennetex.mn';
  const password = 'Admin123!';

  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCred.user.uid;
    await setDoc(doc(db, 'profiles', uid), {
      id: uid,
      email,
      name: 'System Admin',
      role: 'superadmin',
      must_change_password: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
    console.log(JSON.stringify({ ok: true, email, password, uid }, null, 2));
  } catch (error) {
    const code = error?.code || '';
    const message = error?.message || '';
    if (code === 'auth/email-already-in-use') {
      console.log(JSON.stringify({ ok: true, email, password, note: 'Account already exists.' }, null, 2));
    } else {
      console.error(JSON.stringify({ ok: false, code, message }, null, 2));
      process.exit(1);
    }
  }
})();
