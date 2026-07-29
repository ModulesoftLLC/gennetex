import { firebaseList } from '../lib/firebaseAdapter';
import { getPendingCount } from './offlineQueueService';
import { normalizeRole } from '../lib/roles';
import { withoutSampleByName } from '../lib/sampleNames';

const DAY = 86400000;
const timeValue = (value) => value?.toMillis?.() ?? new Date(value || 0).getTime();

function issue(id, severity, title, detail, count, target) {
  return { id, severity, title, detail, count, target };
}

export async function analyzeErpHealth() {
  const [profiles, inventory, attendance, devices, vehicles, offlinePending] = await Promise.all([
    firebaseList('profiles'),
    firebaseList('inventory'),
    firebaseList('attendance'),
    firebaseList('device_approvals'),
    firebaseList('vehicles'),
    getPendingCount().catch(() => 0),
  ]);
  const now = Date.now();
  profiles.splice(0, profiles.length, ...withoutSampleByName(profiles));
  const issues = [];
  const employees = profiles.filter((p) => normalizeRole(p.role) === 'employee');
  const incompleteProfiles = profiles.filter((p) => !p.name || !p.email || !normalizeRole(p.role));
  const emails = new Map();
  profiles.forEach((p) => {
    const email = String(p.email || '').trim().toLowerCase();
    if (email) emails.set(email, (emails.get(email) || 0) + 1);
  });
  const duplicateEmails = [...emails.values()].filter((count) => count > 1).reduce((sum, count) => sum + count, 0);
  const negativeStock = inventory.filter((row) => Number(row.quantity) < 0);
  const lowStock = inventory.filter((row) => Number(row.quantity) >= 0 && Number(row.quantity) <= Number(row.min_stock ?? row.minimum_stock ?? 0));
  const staleEmployees = employees.filter((p) => !p.last_seen || now - timeValue(p.last_seen) > DAY);
  const oldPendingDevices = devices.filter((row) => row.status === 'pending' && now - timeValue(row.requested_at || row.created_at || row.createdAt) > DAY);
  const oldPendingAttendance = attendance.filter((row) => row.status === 'pending' && now - timeValue(row.created_at || row.createdAt) > DAY);
  const vehiclesMissingPlate = vehicles.filter((row) => !String(row.plate_number || row.plate || '').trim());

  if (negativeStock.length) issues.push(issue('negative-stock', 'critical', 'Сөрөг үлдэгдэл', 'Барааны үлдэгдэл 0-ээс доош орсон байна.', negativeStock.length, 'Inventory'));
  if (incompleteProfiles.length) issues.push(issue('incomplete-profile', 'critical', 'Дутуу ажилтны мэдээлэл', 'Нэр, имэйл эсвэл эрхийн төрөл дутуу profile байна.', incompleteProfiles.length, 'Employees'));
  if (duplicateEmails) issues.push(issue('duplicate-email', 'critical', 'Давхардсан имэйл', 'Нэг имэйлтэй олон profile илэрлээ.', duplicateEmails, 'Employees'));
  if (oldPendingDevices.length) issues.push(issue('pending-device', 'warning', 'Удаан хүлээгдсэн төхөөрөмж', '24 цагаас удаан шийдэгдээгүй хүсэлт байна.', oldPendingDevices.length, 'AdminDevices'));
  if (oldPendingAttendance.length) issues.push(issue('pending-attendance', 'warning', 'Шийдээгүй ирц', '24 цагаас удаан pending төлөвтэй ирц байна.', oldPendingAttendance.length, 'Attendance'));
  if (lowStock.length) issues.push(issue('low-stock', 'warning', 'Бага үлдэгдэл', 'Доод нөөцийн хэмжээнд хүрсэн бараа/багаж байна.', lowStock.length, 'LowStock'));
  if (staleEmployees.length) issues.push(issue('stale-location', 'info', 'Байршил шинэчлээгүй', '24 цагт байршлаа шинэчлээгүй ажилтан байна.', staleEmployees.length, 'Live'));
  if (vehiclesMissingPlate.length) issues.push(issue('vehicle-plate', 'warning', 'Улсын дугаар дутуу', 'Улсын дугааргүй машины бүртгэл байна.', vehiclesMissingPlate.length, 'VehiclesAdmin'));
  if (offlinePending) issues.push(issue('offline-queue', 'warning', 'Sync хүлээж буй үйлдэл', 'Энэ төхөөрөмж дээр Firebase рүү илгээгдээгүй үйлдэл байна.', offlinePending, 'OfflineQueue'));

  const deductions = issues.reduce((sum, row) => sum + row.count * (row.severity === 'critical' ? 8 : row.severity === 'warning' ? 3 : 1), 0);
  return {
    score: Math.max(0, 100 - deductions),
    status: issues.some((row) => row.severity === 'critical') ? 'critical' : issues.some((row) => row.severity === 'warning') ? 'warning' : 'healthy',
    checkedAt: new Date().toISOString(),
    issues,
    counts: { profiles: profiles.length, employees: employees.length, inventory: inventory.length, vehicles: vehicles.length, attendance: attendance.length },
  };
}
