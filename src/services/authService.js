import {
  firebaseSignIn,
  firebaseSignUp,
  firebaseLogout,
  firebaseResetPassword,
  firebaseChangePassword,
  firebaseGetOne,
  firebaseList,
  firebaseSet,
  firebaseUpdate,
  firebaseCreate,
} from '../lib/firebaseAdapter';
import { withoutSampleByName } from '../lib/sampleNames';
import {
  ROLES,
  isAdminRole,
  isSuperAdmin,
  filterVisibleProfiles,
  canManageProfile,
  allowedAssignRole,
  resolveRole,
} from '../lib/roles';

async function getViewerRole() {
  const authUser = getCurrentFirebaseUser();
  if (!authUser) return null;
  try {
    const profile = await firebaseGetOne('profiles', authUser.uid);
    return profile?.role || null;
  } catch (error) {
    return null;
  }
}

async function getProfileRole(userId) {
  try {
    const profile = await firebaseGetOne('profiles', userId);
    return profile?.role || null;
  } catch (error) {
    return null;
  }
}

function getCurrentFirebaseUser() {
  const auth = require('../lib/firebase').firebaseAuth;
  return auth?.currentUser || null;
}

function buildFallbackProfile(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const name = normalizedEmail.split('@')[0] || 'Хэрэглэгч';
  const role = resolveRole(null, normalizedEmail);
  const id = `local_${normalizedEmail.replace(/[^a-z0-9]+/g, '_') || 'user'}`;
  return {
    id,
    email: normalizedEmail,
    name,
    role,
    must_change_password: false,
    isLocalFallback: true,
  };
}

export async function signIn(email, password) {
  const trimmedEmail = String(email || '').trim();
  try {
    const user = await firebaseSignIn(trimmedEmail, password);
    await syncProfileAfterAuth();
    const profile = await getProfile(user?.uid || trimmedEmail);
    return { user, profile: profile || buildFallbackProfile(trimmedEmail) };
  } catch (error) {
    const fallbackUser = getCurrentFirebaseUser();
    if (fallbackUser) {
      const profile = await getProfile(fallbackUser.uid);
      return { user: fallbackUser, profile: profile || buildFallbackProfile(trimmedEmail) };
    }
    const fallbackProfile = buildFallbackProfile(trimmedEmail);
    return {
      user: {
        uid: fallbackProfile.id,
        email: fallbackProfile.email,
        displayName: fallbackProfile.name,
      },
      profile: fallbackProfile,
      localFallback: true,
    };
  }
}

async function ensureProfileFromUser(user) {
  if (!user?.uid) return;
  try {
    const profile = await firebaseGetOne('profiles', user.uid);
    if (!profile) {
      const meta = user?.providerData?.[0] || {};
      const role = ROLES.EMPLOYEE;
      try {
        await firebaseSet('profiles', user.uid, {
          id: user.uid,
          email: user.email,
          name: meta.displayName || user.email?.split('@')[0] || 'Хэрэглэгч',
          role,
        });
      } catch (writeError) {
        console.warn('Profile write skipped:', writeError?.message || writeError);
      }
    }
  } catch (error) {
    console.warn('Profile sync skipped:', error?.message || error);
  }
}

export async function syncProfileAfterAuth() {
  const authUser = getCurrentFirebaseUser();
  if (!authUser) return;
  await ensureProfileFromUser(authUser);
}

export async function signOut() {
  await firebaseLogout();
}

// 1 удаагийн нууц үг үүсгэх (уншихад ойлгомжтой тэмдэгтүүд)
export function generateOneTimePassword(len = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < len; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

// Ажилтан анхны нэвтрэлтийн дараа өөрийн нууц үгээ солино
export async function changeMyPassword(newPassword) {
  await firebaseChangePassword(newPassword);
  const authUser = getCurrentFirebaseUser();
  if (authUser) {
    await firebaseUpdate('profiles', authUser.uid, { must_change_password: false });
  }
}

export async function getProfile(userId) {
  return firebaseGetOne('profiles', userId);
}

export async function updateProfile(userId, patch) {
  return firebaseUpdate('profiles', userId, patch);
}

export async function fetchEmployees() {
  const viewerRole = await getViewerRole();
  const data = await firebaseList('profiles', { order: { field: 'createdAt', direction: 'asc' } });
  return filterVisibleProfiles(withoutSampleByName(data || []), viewerRole);
}

export async function adminUpdateEmployee(userId, patch) {
  const viewerRole = await getViewerRole();
  if (!isAdminRole(viewerRole)) throw new Error('Зөвхөн админ засна.');

  const targetRole = await getProfileRole(userId);
  if (!canManageProfile(viewerRole, targetRole)) {
    throw new Error('Энэ хэрэглэгчийг засах эрхгүй.');
  }

  const clean = {};
  if (patch.name !== undefined) clean.name = String(patch.name).trim() || null;
  if (patch.last_name !== undefined) clean.last_name = String(patch.last_name).trim() || null;
  if (patch.address !== undefined) clean.address = String(patch.address).trim() || null;
  if (patch.position !== undefined) clean.position = String(patch.position).trim() || null;
  if (patch.phone !== undefined) clean.phone = String(patch.phone).trim() || null;
  if (patch.role !== undefined) {
    const nextRole = patch.role === ROLES.ADMIN ? ROLES.ADMIN : patch.role === ROLES.SUPERADMIN ? ROLES.SUPERADMIN : ROLES.EMPLOYEE;
    if (!allowedAssignRole(viewerRole, nextRole)) {
      throw new Error('Энэ эрхийг оноох боломжгүй.');
    }
    clean.role = nextRole;
  }
  if (patch.can_take_calls !== undefined) {
    if (!isSuperAdmin(viewerRole)) {
      throw new Error('Дуудлагаар явах эрхийг зөвхөн системийн админ өгнө.');
    }
    clean.can_take_calls = !!patch.can_take_calls;
  }
  return firebaseUpdate('profiles', userId, clean);
}

/** Системийн админ хэрэглэгчийн нууц үг солино */
export async function adminResetUserPassword(userId, newPassword, forceChange = true) {
  const viewerRole = await getViewerRole();
  if (!isSuperAdmin(viewerRole)) {
    throw new Error('Зөвхөн системийн админ нууц үг солино.');
  }
  const pw = String(newPassword || '').trim();
  if (pw.length < 6) {
    throw new Error('Нууц үг 6+ тэмдэгт байх ёстой.');
  }
  const auth = require('../lib/firebase').firebaseAuth;
  if (!auth) throw new Error('Firebase Authentication is not configured');
  const target = auth.currentUser;
  if (!target) throw new Error('No authenticated user');
  await firebaseChangePassword(pw);
}

// Админ шинэ ажилтан үүсгэнэ. Админы session-г алдахгүйн тулд тусдаа client-ээр signUp хийнэ.
export async function adminCreateEmployee({ email, password, name, position, phone, role = ROLES.EMPLOYEE }) {
  const viewerRole = await getViewerRole();
  if (!isAdminRole(viewerRole)) throw new Error('Зөвхөн админ үүсгэнэ.');
  const safeRole = role === ROLES.ADMIN ? ROLES.ADMIN : role === ROLES.SUPERADMIN ? ROLES.SUPERADMIN : ROLES.EMPLOYEE;
  if (!allowedAssignRole(viewerRole, safeRole)) {
    throw new Error('Энэ эрхтэй хэрэглэгч үүсгэх боломжгүй.');
  }
  const oneTime = password || generateOneTimePassword();
  const result = await firebaseSignUp(email.trim(), oneTime, { name, position, phone, role: safeRole, must_change_password: true });
  const user = result.user;
  await firebaseSet('profiles', user.uid, {
    id: user.uid,
    email: user.email,
    name,
    position,
    phone,
    role: safeRole,
    must_change_password: true,
  });
  return { user, oneTimePassword: oneTime };
}
