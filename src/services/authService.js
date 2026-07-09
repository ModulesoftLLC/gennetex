import { createClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { withoutSampleByName } from '../lib/sampleNames';
import {
  ROLES,
  isAdminRole,
  isSuperAdmin,
  filterVisibleProfiles,
  canManageProfile,
  allowedAssignRole,
} from '../lib/roles';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

async function getViewerRole() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  return data?.role || null;
}

async function getProfileRole(userId) {
  const { data } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle();
  return data?.role || null;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw error;
  await syncProfileAfterAuth();
  return data;
}

async function ensureProfileFromUser(user) {
  if (!user?.id) return;
  const meta = user.user_metadata || {};
  const role =
    meta.role === ROLES.SUPERADMIN ? ROLES.SUPERADMIN : meta.role === ROLES.ADMIN ? ROLES.ADMIN : ROLES.EMPLOYEE;
  const { data: row } = await supabase.from('profiles').select('id, role').eq('id', user.id).maybeSingle();
  if (!row) {
    await supabase.from('profiles').insert({
      id: user.id,
      email: user.email,
      name: meta.name || user.email?.split('@')[0] || 'Хэрэглэгч',
      role,
    });
  }
}

export async function syncProfileAfterAuth() {
  const { error } = await supabase.rpc('bootstrap_profile');
  if (error) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) await ensureProfileFromUser(user);
  }
}

export async function signOut() {
  await supabase.auth.signOut();
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
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase
      .from('profiles')
      .update({ must_change_password: false })
      .eq('id', user.id);
  }
}

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

export async function updateProfile(userId, patch) {
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchEmployees() {
  const viewerRole = await getViewerRole();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
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
  const { data, error } = await supabase
    .from('profiles')
    .update(clean)
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
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
  const { error } = await supabase.rpc('admin_reset_user_password', {
    target_user_id: userId,
    new_password: pw,
    force_change: !!forceChange,
  });
  if (error) throw error;
}

// Админ шинэ ажилтан үүсгэнэ. Админы session-г алдахгүйн тулд тусдаа client-ээр signUp хийнэ.
export async function adminCreateEmployee({ email, password, name, position, phone, role = ROLES.EMPLOYEE }) {
  const viewerRole = await getViewerRole();
  if (!isAdminRole(viewerRole)) throw new Error('Зөвхөн админ үүсгэнэ.');
  const safeRole = role === ROLES.ADMIN ? ROLES.ADMIN : role === ROLES.SUPERADMIN ? ROLES.SUPERADMIN : ROLES.EMPLOYEE;
  if (!allowedAssignRole(viewerRole, safeRole)) {
    throw new Error('Энэ эрхтэй хэрэглэгч үүсгэх боломжгүй.');
  }
  // Нууц үг өгөөгүй бол 1 удаагийн нууц үг автоматаар үүсгэнэ
  const oneTime = password || generateOneTimePassword();
  const tempClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await tempClient.auth.signUp({
    email: email.trim(),
    password: oneTime,
    // Ажилтан анх нэвтрээд заавал нууц үгээ солино
    options: { data: { name, position, phone, role: safeRole, must_change_password: true } },
  });
  if (error) throw error;
  return { ...data, oneTimePassword: oneTime };
}
