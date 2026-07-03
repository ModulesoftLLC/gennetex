import { useEffect, useRef } from 'react';
import { Platform, AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useApp } from '../context/AppContext';
import * as notifyApi from '../services/notificationService';
import { startIncomingCallAlert, stopIncomingCallAlert } from '../services/callAlertService';
import { navigateFromNotification } from '../lib/navigationRef';
import { getActiveChatRoom } from '../lib/chatFocus';
import { supabase } from '../lib/supabase';

export default function PushNotificationManager() {
  const { isCloud, currentUser } = useApp();
  const tokenRef = useRef(null);
  const responseSub = useRef(null);
  const receivedSub = useRef(null);
  const chatSub = useRef(null);
  const memberRooms = useRef(new Set());

  useEffect(() => {
    if (!isCloud || !currentUser?.id || Platform.OS === 'web') return;

    let active = true;

    (async () => {
      try {
        const res = await notifyApi.enablePushForUser(currentUser.id);
        if (!active || !res.ok) return;
        tokenRef.current = res.token;
      } catch (e) {}
    })();

    // Миний ярианууд — foreground чат мэдэгдэл
    (async () => {
      const { data } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', currentUser.id);
      memberRooms.current = new Set((data || []).map((m) => m.conversation_id));
    })();

    chatSub.current = supabase
      .channel(`chat-push-${currentUser.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages'}, async (payload) => {
        const msg = payload.new;
        if (!msg || msg.sender_id === currentUser.id) return;
        if (!memberRooms.current.has(msg.room)) return;
        if (msg.room === getActiveChatRoom()) return;
        if (AppState.currentState !== 'active') return;

        const preview =
          msg.content ||
          (msg.attachment_type === 'image'
            ? 'Зураг'
            : msg.attachment_type === 'video'
            ? 'Видео'
            : msg.attachment_type === 'file'
            ? 'Файл'
            : 'Шинэ мессеж');
        await notifyApi.showLocalNotification({
          title: msg.sender_name || 'Чат',
          body: preview,
          data: { type: 'chat', room: msg.room, senderName: msg.sender_name },
          channelId: 'chat',
        });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversation_members'}, async () => {
        const { data } = await supabase
          .from('conversation_members')
          .select('conversation_id')
          .eq('user_id', currentUser.id);
        memberRooms.current = new Set((data || []).map((m) => m.conversation_id));
      })
      .subscribe();

    receivedSub.current = Notifications.addNotificationReceivedListener(async (notification) => {
      const data = notification.request.content.data;
      if (data?.type === 'call') {
        await startIncomingCallAlert(data.callerName || notification.request.content.title);
      }
    });

    responseSub.current = Notifications.addNotificationResponseReceivedListener(async (response) => {
      await stopIncomingCallAlert();
      const data = response.notification.request.content.data;
      navigateFromNotification(data);
    });

    return () => {
      active = false;
      receivedSub.current?.remove();
      responseSub.current?.remove();
      if (chatSub.current) supabase.removeChannel(chatSub.current);
      stopIncomingCallAlert();
    };
  }, [isCloud, currentUser?.id]);

  return null;
}
