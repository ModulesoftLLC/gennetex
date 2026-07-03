import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const type = notification.request.content.data?.type;
    const isCall = type === 'call';
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      priority: isCall ? Notifications.AndroidNotificationPriority.MAX : Notifications.AndroidNotificationPriority.HIGH,
    };
  },
});

async function ensureChannels() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('chat', {
    name: 'Чат мессеж',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 200, 120, 200],
    sound: 'default',
  });
  await Notifications.setNotificationChannelAsync('calls', {
    name: 'Видео дуудлага',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 800, 400, 800, 400, 800],
    sound: 'default',
    bypassDnd: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

// Утсан дээр push token авах
export async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'web' || !Device.isDevice) return null;

  await ensureChannels();

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  const tokenData = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined
  );
  return tokenData.data;
}

export async function enablePushForUser(userId) {
  const token = await registerForPushNotificationsAsync();
  if (!token) return { ok: false, reason: 'permission'};
  await savePushToken(userId, token);
  return { ok: true, token };
}

export async function savePushToken(userId, token) {
  if (!userId || !token) return;
  await supabase.from('push_tokens').delete().eq('user_id', userId).eq('platform', Platform.OS);
  const { error } = await supabase.from('push_tokens').insert({
    user_id: userId,
    token,
    platform: Platform.OS,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function removePushToken(userId, token) {
  if (!userId || !token) return;
  await supabase.from('push_tokens').delete().eq('user_id', userId).eq('token', token);
}

async function fetchTokensForUsers(userIds) {
  if (!userIds?.length) return [];
  const { data, error } = await supabase
    .from('push_tokens')
    .select('token')
    .in('user_id', userIds);
  if (error) throw error;
  return [...new Set((data || []).map((r) => r.token).filter(Boolean))];
}

async function fetchAdminTokens() {
  const { data: admins } = await supabase.from('profiles').select('id').in('role', ['admin', 'superadmin']);
  if (!admins?.length) return [];
  return fetchTokensForUsers(admins.map((a) => a.id));
}

async function sendExpoPush(messages) {
  if (!messages?.length) return;
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding' : 'gzip, deflate',
        'Content-Type' : 'application/json',
      },
      body: JSON.stringify(chunk),
    });
  }
}

async function notifyTokens(tokens, { title, body, data, channelId, priority }) {
  if (!tokens.length) return;
  await sendExpoPush(
    tokens.map((to) => ({
      to,
      title,
      body,
      sound: 'default',
      priority: priority || 'high',
      channelId: channelId || 'chat',
      data: data || {},
    }))
  );
}

export async function showLocalNotification({ title, body, data, channelId }) {
  await ensureChannels();
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data || {},
      sound: true,
      ...(Platform.OS === 'android' ? { channelId: channelId || 'chat'} : {}),
    },
    trigger: null,
  });
}

export async function notifyUsers(userIds, payload) {
  try {
    const tokens = await fetchTokensForUsers(userIds);
    await notifyTokens(tokens, payload);
  } catch (e) {}
}

export async function notifyAdmins(payload) {
  try {
    const tokens = await fetchAdminTokens();
    await notifyTokens(tokens, { channelId: 'chat', ...payload });
  } catch (e) {}
}

// Чат мессеж — бусад гишүүдэд push
export async function notifyChatMembers(conversationId, senderId, { senderName, content, attachmentType }) {
  const { data: members } = await supabase
    .from('conversation_members')
    .select('user_id')
    .eq('conversation_id', conversationId);
  const recipients = (members || []).map((m) => m.user_id).filter((id) => id && id !== senderId);
  const preview =
    content ||
    (attachmentType === 'image'
      ? 'Зураг илгээлээ'
      : attachmentType === 'video'
      ? 'Видео илгээлээ'
      : attachmentType === 'file'
      ? 'Файл илгээлээ'
      : 'Шинэ мессеж');
  await notifyUsers(recipients, {
    title: senderName || 'Чат',
    body: preview,
    data: { type: 'chat', room: conversationId, senderName },
    channelId: 'chat',
    priority: 'high',
  });
}

// Видео дуудлага — ringtone + TTS push
export async function notifyIncomingCall(calleeId, { callerName, room, callId }) {
  const name = callerName || 'Ажилтан';
  await notifyUsers([calleeId], {
    title: `${name} залгаж байна`,
    body: 'Видео дуудлага — хариулахын тулд нээнэ үү',
    data: { type: 'call', room, callId, callerName: name },
    channelId: 'calls',
    priority: 'high',
  });
}

export async function notifyRemoteAttendance({ staffName, note }) {
  await notifyAdmins({
    title: 'Зайнаас ирцийн хүсэлт',
    body: `${staffName || 'Ажилтан'}: ${note || 'Зөвшөөрөл хүлээж байна'}`,
    data: { type: 'attendance_pending'},
  });
}

export async function notifyOffSiteCheckIn({ staffName, locationName, distanceM }) {
  const where = locationName ? `"${locationName}"-аас` : 'ажлын байршлаас';
  await notifyAdmins({
    title: 'Байршил зөрсөн ирц',
    body: `${staffName || 'Ажилтан'} ${where} ${distanceM != null ? `~${distanceM}м` : 'гадуур'} бүртгүүллээ`,
    data: { type: 'attendance_offsite'},
  });
}

export async function notifyShiftMissed({ staffName, shiftTime, locationName }) {
  await notifyAdmins({
    title: 'Хуваарийн байршилд байхгүй',
    body: `${staffName || 'Ажилтан'} ${shiftTime || ''} цагт ${locationName || 'ажлын газарт'} ирээгүй байна`,
    data: { type: 'shift_missed' },
  });
}
