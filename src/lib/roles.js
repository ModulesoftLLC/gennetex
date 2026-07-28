/** Эрхийн төрлүүд: employee | admin | superadmin */

export const ROLES = {
  EMPLOYEE: 'employee',
  ADMIN: 'admin',
  SUPERADMIN: 'superadmin',
};

export function normalizeRole(role) {
  const raw = String(role || '').trim().toLowerCase();
  if (!raw) return null;
  if (['superadmin', 'super_admin', 'super-admin', 'sysadmin'].includes(raw)) return ROLES.SUPERADMIN;
  if (['admin', 'administrator', 'manager'].includes(raw)) return ROLES.ADMIN;
  if (['employee', 'staff', 'user', 'member'].includes(raw)) return ROLES.EMPLOYEE;
  return raw;
}

export function resolveRole(role, email) {
  const normalized = normalizeRole(role);
  if (normalized) return normalized;
  const emailValue = String(email || '').trim().toLowerCase();
  if (emailValue.includes('superadmin') || emailValue.includes('super_admin') || emailValue.includes('super-admin')) return ROLES.SUPERADMIN;
  if (emailValue.includes('admin')) return ROLES.ADMIN;
  return ROLES.EMPLOYEE;
}

export function isSuperAdmin(role) {
  return normalizeRole(role) === ROLES.SUPERADMIN;
}

export function isAdminRole(role) {
  const normalized = normalizeRole(role);
  return normalized === ROLES.ADMIN || normalized === ROLES.SUPERADMIN;
}

export function isRegularAdmin(role) {
  return role === ROLES.ADMIN;
}

export function roleLabel(role) {
  const normalized = normalizeRole(role);
  if (normalized === ROLES.SUPERADMIN) return 'Системийн админ';
  if (normalized === ROLES.ADMIN) return 'Админ';
  return 'Ажилтан';
}

/** Ердийн админ зөвхөн ажилтныг харна; superadmin бүгдийг харна */
export function filterVisibleProfiles(profiles, viewerRole) {
  const list = profiles || [];
  if (isSuperAdmin(viewerRole)) return list;
  if (isRegularAdmin(viewerRole)) {
    return list.filter((p) => p.role === ROLES.EMPLOYEE);
  }
  return list.filter((p) => p.role !== ROLES.SUPERADMIN);
}

export function canManageProfile(viewerRole, targetRole) {
  if (isSuperAdmin(viewerRole)) return true;
  if (!isRegularAdmin(viewerRole)) return false;
  // Ердийн админ зөвхөн ажилтны профайл засна
  return targetRole === ROLES.EMPLOYEE || !targetRole;
}

export function canAssignRoles(viewerRole) {
  return isSuperAdmin(viewerRole);
}

/**
 * Хэрэглэгч дуудлагаар (service call) явж болох эсэх.
 * Ажилтан, админ, системийн админ бүгд дуудлага авна (нэвтэрсэн байхад л болно).
 */
export function canTakeServiceCalls(profile) {
  return !!profile;
}

export function allowedAssignRole(viewerRole, newRole) {
  if (isSuperAdmin(viewerRole)) {
    return [ROLES.EMPLOYEE, ROLES.ADMIN, ROLES.SUPERADMIN].includes(newRole);
  }
  if (isRegularAdmin(viewerRole)) {
    return newRole === ROLES.EMPLOYEE;
  }
  return false;
}
