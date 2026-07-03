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
    case 'call' :
      navigationRef.navigate('Chat');
      break;
    case 'attendance_pending' :
      navigationRef.navigate('Attendance');
      break;
    case 'service_call' :
      navigationRef.navigate('Calls');
      break;
    default:
      break;
  }
}
