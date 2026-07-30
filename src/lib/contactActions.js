import { Linking, Platform } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';

export function normalizeContactPhone(value) {
  const raw = String(value || '').trim();
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('976') && digits.length === 11) return `+${digits}`;
  if (digits.length === 8) return `+976${digits}`;
  if (raw.startsWith('+') && digits) return `+${digits}`;
  return digits;
}

export async function callPhone(value) {
  const phone = normalizeContactPhone(value);
  if (!phone) throw new Error('Утасны дугаар байхгүй байна.');
  if (Platform.OS === 'android') {
    try {
      await IntentLauncher.startActivityAsync('android.intent.action.DIAL', { data: `tel:${phone}` });
      return;
    } catch (_) {}
  }
  await Linking.openURL(`tel:${phone}`);
}

export async function composeSms(value, message = '') {
  const phone = normalizeContactPhone(value);
  if (!phone) throw new Error('Утасны дугаар байхгүй байна.');
  if (Platform.OS === 'android') {
    try {
      await IntentLauncher.startActivityAsync('android.intent.action.SENDTO', {
        data: `smsto:${phone}`,
        extra: { sms_body: String(message || '') },
      });
      return;
    } catch (_) {}
  }
  const separator = Platform.OS === 'ios' ? '&' : '?';
  await Linking.openURL(`sms:${phone}${separator}body=${encodeURIComponent(String(message || ''))}`);
}
