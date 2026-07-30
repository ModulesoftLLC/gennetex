import {
  firebaseSignIn,
  firebaseLogout,
  firebaseResetPassword,
  firebaseChangePassword,
  firebaseGetOne,
  firebaseList,
  firebaseSet,
  firebaseUpdate,
  firebaseDelete,
  firebaseCreate,
} from '../lib/firebaseAdapter';
import { createFirebaseUserWithoutChangingSession } from '../lib/firebase';
import { withoutSampleByName } from '../lib/sampleNames';
import {
  ROLES,
  isAdminRole,
  isSuperAdmin,
  filterVisibleProfiles,
  canManageProfile,
  allowedAssignRole,
  resolveRole,
  normalizeRole,
} from '../lib/roles';
import { normalizeMongolianPhone } from '../lib/phone';

async function findProfileByEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) return null;
  const rows = await firebaseList('profiles', {
    whereClauses: [{ field: 'email', op: '==', value: normalized }],
    limitCount: 1,
  });
  return (rows || [])[0] || null;
}

async function getViewerRole() {
  const authUser = getCurrentFirebaseUser();
  if (!authUser) return null;
  try {
    const profile = await getProfile(authUser.uid, authUser.email);
    if (profile) return resolveRole(profile.role, profile.email);
    return resolveRole(null, authUser.email);
  } catch (error) {
    return resolveRole(null, authUser.email);
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

async function resolveProfileRecord(userIdOrEmail, email) {
  if (!userIdOrEmail && !email) return null;
  let profile = null;

  if (userIdOrEmail) {
    profile = await firebaseGetOne('profiles', userIdOrEmail);
  }

  if (!profile && email) {
    profile = await findProfileByEmail(email);
  }

  if (!profile && userIdOrEmail && userIdOrEmail.includes('@')) {
    profile = await findProfileByEmail(userIdOrEmail);
  }

  try {
    if (profile) {
      console.debug('DIAG resolveProfileRecord', { query: userIdOrEmail, email, profileId: profile.id, role: profile.role });
    } else {
      console.debug('DIAG resolveProfileRecord', { query: userIdOrEmail, email, profile: null });
    }
  } catch (e) {}

  return profile;
}

export async function signIn(email, password) {
  const trimmedEmail = String(email || '').trim();
  try {
    const user = await firebaseSignIn(trimmedEmail, password);
    await syncProfileAfterAuth();
    const profile = await getProfile(user?.uid, trimmedEmail);
    if (!profile) {
      await firebaseLogout();
      throw new Error('Firebase profile олдсонгүй. Системийн админ хэрэглэгчийн бүртгэлийг шалгана уу.');
    }
    return { user, profile };
  } catch (error) {
    const authUser = getCurrentFirebaseUser();
    if (authUser) {
      await firebaseLogout();
    }
    throw error;
  }
}

async function ensureProfileFromUser(user) {
  if (!user?.uid) return;
  try {
    let existing = await firebaseGetOne('profiles', user.uid);
    const meta = user?.providerData?.[0] || {};
    const resolvedRole = resolveRole(existing?.role || meta.role, user.email);
    const nextProfile = {
      id: user.uid,
      email: user.email,
      name: existing?.name || meta.displayName || user.email?.split('@')[0] || 'Хэрэглэгч',
      role: resolvedRole,
      must_change_password: existing?.must_change_password ?? false,
      position: existing?.position || '',
      phone: existing?.phone || '',
    };

    if (!existing && user.email) {
      const emailMatch = await findProfileByEmail(user.email);
      if (emailMatch && emailMatch.id !== user.uid) {
        const migrated = {
          ...emailMatch,
          id: user.uid,
          email: user.email,
          name: nextProfile.name,
          role: resolvedRole,
          must_change_password: emailMatch?.must_change_password ?? nextProfile.must_change_password,
          position: emailMatch.position || nextProfile.position,
          phone: emailMatch.phone || nextProfile.phone,
          updatedAt: nextProfile.updatedAt,
        };
        try {
          await firebaseSet('profiles', user.uid, migrated);
          if (emailMatch.id && emailMatch.id !== user.uid) {
            try {
              await firebaseDelete('profiles', emailMatch.id);
            } catch (deleteError) {
              console.warn('Legacy profile delete skipped:', deleteError?.message || deleteError);
            }
          }
        } catch (writeError) {
          console.warn('Profile migrate skipped:', writeError?.message || writeError);
        }
        return;
      }
    }

    if (!existing) {
      try {
        await firebaseSet('profiles', user.uid, nextProfile);
      } catch (writeError) {
        console.warn('Profile write skipped:', writeError?.message || writeError);
      }
      return;
    }

    if (existing.role !== resolvedRole || existing.email !== user.email || existing.name !== nextProfile.name) {
      try {
        await firebaseUpdate('profiles', user.uid, nextProfile);
      } catch (writeError) {
        console.warn('Profile update skipped:', writeError?.message || writeError);
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

export async function getProfile(userId, email) {
  const profile = await resolveProfileRecord(userId, email);
  if (profile) {
    profile.role = normalizeRole(profile.role) || profile.role;
  }
  return profile;
}

export async function updateProfile(userId, patch) {
  return firebaseUpdate('profiles', userId, patch);
}

export async function fetchEmployees() {
  const viewerRole = await getViewerRole();
  // Firestore orderBy нь тухайн field байхгүй хуучин profile-уудыг үр дүнгээс хасдаг.
  // Admin web-тэй ижил бүх document-ийг авч, client талд эрэмбэлнэ.
  const data = await firebaseList('profiles');
  const profiles = (data || []).map((p) => ({
    ...p,
    role: normalizeRole(p.role) || p.role,
  })).sort((a, b) => String(a.name || a.email || '').localeCompare(String(b.name || b.email || ''), 'mn'));
  try {
    console.debug('DIAG fetchEmployees', { viewerRole, count: profiles.length, sample: profiles.slice(0,5).map((p) => ({ id: p.id, email: p.email, role: p.role })) });
  } catch (e) {}
  return filterVisibleProfiles(withoutSampleByName(profiles), viewerRole);
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
  if (patch.phone !== undefined && patch.phone) clean.normalizedPhone = normalizeMongolianPhone(patch.phone);
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
export async function adminCreateEmployee({ email, password, name, last_name, position, phone, role = ROLES.EMPLOYEE }) {
  const viewerRole = await getViewerRole();
  if (!isAdminRole(viewerRole)) throw new Error('Зөвхөн админ үүсгэнэ.');
  const safeRole = role === ROLES.ADMIN ? ROLES.ADMIN : role === ROLES.SUPERADMIN ? ROLES.SUPERADMIN : ROLES.EMPLOYEE;
  if (!allowedAssignRole(viewerRole, safeRole)) {
    throw new Error('Энэ эрхтэй хэрэглэгч үүсгэх боломжгүй.');
  }
  const oneTime = password || generateOneTimePassword();
  const normalizedPhone = normalizeMongolianPhone(phone);
  try {
    const user = await createFirebaseUserWithoutChangingSession(email.trim(), oneTime);
    await firebaseSet('profiles', user.uid, {
      id: user.uid,
      email: user.email,
      name,
      last_name: String(last_name || '').trim(),
      position,
      phone,
      normalizedPhone,
      phoneVerified: false,
      appPinConfigured: false,
      status: 'ACTIVE',
      role: safeRole,
      must_change_password: true,
    });
    return { user, oneTimePassword: oneTime };
  } catch (error) {
    const fallbackId = `local_${String(email || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_') || 'user'}`;
    const fallbackProfile = {
      id: fallbackId,
      email: String(email || '').trim().toLowerCase(),
      name: String(name || '').trim() || 'Ажилтан',
      position: String(position || '').trim(),
      phone: String(phone || '').trim(),
      normalizedPhone,
      phoneVerified: false,
      appPinConfigured: false,
      status: 'ACTIVE',
      role: safeRole,
      must_change_password: true,
      localFallback: true,
    };
    try {
      await firebaseSet('profiles', fallbackId, fallbackProfile);
    } catch (writeError) {
      console.warn('Profile fallback write skipped:', writeError?.message || writeError);
    }
    return { user: { uid: fallbackId, email: fallbackProfile.email, displayName: fallbackProfile.name }, oneTimePassword: oneTime, localFallback: true };
  }
}
