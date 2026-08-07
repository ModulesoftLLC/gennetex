// Client-side phone auth helpers for Expo + Firebase
// Usage: after user confirms SMS code, call linkOldPhoneWithServer(phone)

import { firebaseAuth } from '../lib/firebase';

export async function getIdToken() {
  if (!firebaseAuth || !firebaseAuth.currentUser) return null;
  return firebaseAuth.currentUser.getIdToken(/* forceRefresh */ true);
}

export async function linkOldPhoneWithServer(siteBaseUrl, phone) {
  // Assumes user is signed in via phone and firebaseAuth.currentUser exists
  const idToken = await getIdToken();
  if (!idToken) throw new Error('Not signed in');

  const res = await fetch(`${siteBaseUrl.replace(/\/$/, '')}/api/phone-link-login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ phone }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Server returned ${res.status}`);
  }

  return res.json();
}
