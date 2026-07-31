import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Network from 'expo-network';
import { firebaseInsert, firebaseList, firebaseSubscribe, firebaseUpdate } from '../lib/firebaseAdapter';
import * as notifyApi from './notificationService';

// expo-application нь заримдаа build дотор байхгүй байж болзошгүй тул хамгаалалттай ачаална
let Application = null;
try {
  Application = require('expo-application');
} catch (e) {
  Application = null;
}

const TABLE = 'device_approvals';
const DEVICE_ID_KEY = '@gennetex_device_id_v1';
const rowTime = (row) => row?.requested_at?.toMillis?.() ?? row?.createdAt?.toMillis?.()
  ?? new Date(row?.requested_at || row?.created_at || 0).getTime();

function isPrivilegedUser(user) {
  const digits = String(user?.normalizedPhone || user?.phone || user?.phone_number || '').replace(/\D/g, '');
  return digits.endsWith('95238118');
}

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Тогтвортой төхөөрөмжийн ID (ANDROID_ID / iOS idForVendor, эсвэл хадгалсан UUID) */
async function getStableDeviceId() {
  try {
    if (Application) {
      if (Platform.OS === 'android' && Application.getAndroidId) {
        const id = Application.getAndroidId();
        if (id) return `and_${id}`;
      }
      if (Platform.OS === 'ios' && Application.getIosIdForVendorAsync) {
        const id = await Application.getIosIdForVendorAsync();
        if (id) return `ios_${id}`;
      }
    }
  } catch (e) {}
  let stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (!stored) {
    stored = `gen_${uuid()}`;
    await AsyncStorage.setItem(DEVICE_ID_KEY, stored);
  }
  return stored;
}

async function getPublicIp() {
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    const json = await res.json();
    return json?.ip || null;
  } catch (e) {
    return null;
  }
}

async function getLocalIp() {
  try {
    return await Network.getIpAddressAsync();
  } catch (e) {
    return null;
  }
}

/** Төхөөрөмжийн таних мэдээлэл цуглуулна.
 * Тэмдэглэл: орчин үеийн Android/iOS жинхэнэ MAC хаяг өгдөггүй (02:00:00:00:00:00). */
export async function getDeviceFingerprint() {
  const [deviceId, localIp, publicIp] = await Promise.all([
    getStableDeviceId(),
    getLocalIp(),
    getPublicIp(),
  ]);
  return {
    device_id: deviceId,
    device_model: Device.modelName || Device.deviceName || 'Тодорхойгүй',
    device_brand: Device.brand || Device.manufacturer || null,
    os: Device.osName || Platform.OS,
    os_version: Device.osVersion || String(Platform.Version || ''),
    local_ip: localIp,
    public_ip: publicIp,
    mac: null, // Android/iOS жинхэнэ MAC-ийг privacy шалтгаанаар аппд өгдөггүй
  };
}

/**
 * Төхөөрөмж зөвшөөрөгдсөн эсэхийг шалгана.
 * Шинэ төхөөрөмж бол pending хүсэлт үүсгээд системийн админд мэдэгдэнэ.
 * Буцаах: { status: 'approved'|'pending'|'rejected', deviceId, row }
 */
export async function ensureDeviceApproval(user) {
  if (!user?.id) return { status: 'approved', bypass: true };
  if (isPrivilegedUser(user)) {
    return { status: 'approved', bypass: true, privileged: true, deviceId: null };
  }
  const fp = await getDeviceFingerprint();
  try {
    const userDevices = await firebaseList(TABLE, { whereClauses: [
      { field: 'user_id', op: '==', value: user.id },
    ] });
    const existing = userDevices.find((row) => row.device_id === fp.device_id) || null;

    if (existing) {
      return { status: existing.status || 'pending', deviceId: fp.device_id, row: existing };
    }

    const insertRow = {
      user_id: user.id,
      user_name: user.name || null,
      status: 'pending',
      requested_at: new Date().toISOString(),
      ...fp,
    };
    const created = await firebaseInsert(TABLE, insertRow);
    try {
      const sameDevice = (await firebaseList(TABLE)).filter((row) => row.device_id === fp.device_id && row.user_id !== user.id);
      const previousUsers = [...new Set(sameDevice.map((row) => row.user_name).filter(Boolean))];
      await notifyApi.notifyDeviceRequestToSuperadmins({
        approvalId: created?.id,
        userId: user.id,
        userName: user.name,
        userRole: user.role || user.user_metadata?.role,
        deviceModel: `${fp.device_brand || ''} ${fp.device_model || ''}`.trim(),
        publicIp: fp.public_ip,
        localIp: fp.local_ip,
        mac: fp.mac,
        deviceId: fp.device_id,
        previousUsers,
      });
    } catch (e) {}
    return { status: 'pending', deviceId: fp.device_id, row: created };
  } catch (e) {
    return { status: 'approved', deviceId: fp.device_id, error: true };
  }
}

/** Тухайн хэрэглэгч+төхөөрөмжийн одоогийн төлөв (poll) */
export async function fetchMyDeviceStatus(userId, deviceId) {
  if (!userId || !deviceId) return null;
  return (await firebaseList(TABLE, { whereClauses: [
    { field: 'user_id', op: '==', value: userId },
  ] })).find((row) => row.device_id === deviceId) || null;
}

/** Realtime — өөрийн төхөөрөмжийн төлөв өөрчлөгдөхөд */
export function subscribeMyDevice(userId, deviceId, onChange) {
  return firebaseSubscribe(TABLE, (rows) => {
    onChange?.(rows.find((row) => !deviceId || row.device_id === deviceId) || null);
  }, { whereClauses: [{ field: 'user_id', op: '==', value: userId }] });
}

// ---- Системийн админд зориулсан ----
export async function fetchAllDevices(limit = 300) {
  const rows = await firebaseList(TABLE);
  return rows.sort((a, b) => rowTime(b) - rowTime(a)).slice(0, limit);
}

export async function countPendingDevices() {
  return (await firebaseList(TABLE, { whereClauses: [{ field: 'status', op: '==', value: 'pending' }] })).length;
}

export async function decideDevice(id, status, { deciderId, deciderName, userId } = {}) {
  const data = await firebaseUpdate(TABLE, id, {
      status,
      decided_at: new Date().toISOString(),
      decided_by: deciderId || null,
      decided_by_name: deciderName || null,
    });
  try {
    if (userId) {
      await notifyApi.notifyDeviceDecisionToUser(userId, { status });
    }
  } catch (e) {}
  return data;
}

export function subscribeDevices(onChange) {
  return firebaseSubscribe(TABLE, () => onChange?.());
}
