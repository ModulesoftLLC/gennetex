import {
  firebaseCreate,
  firebaseList,
  firebaseSubscribe,
  firebaseUpdate,
} from '../lib/firebaseAdapter';
import * as notifyApi from './notificationService';

const TABLE = 'jobApplications';
const LEGACY_TABLE = 'job_applications';

function isoDate(value) {
  return value?.toDate?.().toISOString?.() || value || null;
}

function normalizeApplication(row, collectionName) {
  if (!row) return row;
  return {
    ...row,
    created_at: isoDate(row.created_at || row.createdAt),
    updated_at: isoDate(row.updated_at || row.updatedAt),
    _collection: collectionName,
  };
}

export const APPLICATION_STATUS = [
  { key: 'new', label: 'Шинэ' },
  { key: 'reviewing', label: 'Хянаж буй' },
  { key: 'contacted', label: 'Холбогдсон' },
  { key: 'hired', label: 'Ажилд авсан' },
  { key: 'rejected', label: 'Татгалзсан' },
];

export function applicationStatusLabel(status) {
  return APPLICATION_STATUS.find((s) => s.key === status)?.label || status || '—';
}

/** Ажилд орох анкет илгээх (public формоос эсвэл апп дотроос) */
export async function submitApplication({ name, lastName, phone, email, position, message, cvUrl, source = 'app' }) {
  const n = String(name || '').trim();
  if (!n) throw new Error('Нэрээ бичнэ үү.');
  const row = {
    name: n,
    last_name: String(lastName || '').trim() || null,
    phone: String(phone || '').trim() || null,
    email: String(email || '').trim() || null,
    position: String(position || '').trim() || null,
    message: String(message || '').trim() || null,
    cv_url: String(cvUrl || '').trim() || null,
    source,
    status: 'new',
  };
  const data = normalizeApplication(await firebaseCreate(TABLE, row), TABLE);
  try {
    await notifyApi.notifyApplicationToAdmins({
      name: n,
      position: row.position,
      phone: row.phone,
      applicationId: data.id,
    });
  } catch (e) {}
  return data;
}

export async function fetchApplications(limit = 200) {
  const [current, legacy] = await Promise.all([
    firebaseList(TABLE),
    firebaseList(LEGACY_TABLE),
  ]);
  return [
    ...current.map((row) => normalizeApplication(row, TABLE)),
    ...legacy.map((row) => normalizeApplication(row, LEGACY_TABLE)),
  ]
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    .slice(0, limit);
}

export async function countNewApplications() {
  const rows = await fetchApplications(500);
  return rows.filter((row) => row.status === 'new').length;
}

export async function updateApplicationStatus(id, status, collectionName = TABLE) {
  return normalizeApplication(
    await firebaseUpdate(collectionName === LEGACY_TABLE ? LEGACY_TABLE : TABLE, id, { status }),
    collectionName
  );
}

export function subscribeApplications(onChange) {
  let initialized = 0;
  const notifyAfterInitial = () => {
    initialized += 1;
    if (initialized > 2) onChange?.();
  };
  const unsubs = [
    firebaseSubscribe(TABLE, notifyAfterInitial),
    firebaseSubscribe(LEGACY_TABLE, notifyAfterInitial),
  ];
  return () => unsubs.forEach((unsubscribe) => unsubscribe?.());
}
