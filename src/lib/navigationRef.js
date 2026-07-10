import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

export function navigateFromNotification(data) {
  if (!navigationRef.isReady() || !data?.type) return;

  switch (data.type) {
    case 'chat' :
      navigationRef.navigate('Conversation', {
        conversationId: data.room,
        title: 'Чат',
      });
      break;
    case 'call':
      // Дуудлагын мэдэгдэл дарсан — чат руу (IncomingCallManager pending шалгана)
      navigationRef.navigate('MainTabs', { screen: 'Chat' });
      break;
    case 'attendance_pending' :
      navigationRef.navigate('Attendance');
      break;
    case 'service_call':
    case 'service_call_sla':
      navigationRef.navigate('Calls');
      break;
    case 'feed':
      if (data.postId) {
        navigationRef.navigate('FeedPost', { postId: data.postId });
      } else {
        navigationRef.navigate('MainTabs', { screen: 'Feed' });
      }
      break;
    case 'live':
    case 'live_invite':
      navigationRef.navigate('MainTabs', {
        screen: 'Feed',
        params: {
          openLiveId: data.meetingId || data.liveId || data.live_id,
          openLiveHost: data.hostName || data.host_name,
          openLiveHostId: data.hostId || data.host_id,
        },
      });
      break;
    case 'meeting':
      // Live push хурал руу орохгүй
      if (data.kind === 'live') {
        navigationRef.navigate('MainTabs', {
          screen: 'Feed',
          params: {
            openLiveId: data.meetingId || data.liveId,
            openLiveHost: data.hostName,
            openLiveHostId: data.hostId,
          },
        });
        break;
      }
      navigationRef.navigate('Meeting', {
        openMeetingId: data.meetingId || data.meeting_id,
        openMeetingHost: data.hostName || data.host_name,
        openMeetingHostId: data.hostId || data.host_id,
        openMeetingKind: 'meeting',
      });
      break;
    case 'telegram_chat':
      navigationRef.navigate('TelegramChat');
      break;
    case 'telegram_broadcast':
      navigationRef.navigate('MainTabs', { screen: 'Chat' });
      break;
  }
}
