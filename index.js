import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import App from './App';

try {
  const { initNativeIncomingCallListeners } = require('./src/services/nativeIncomingCallService');
  initNativeIncomingCallListeners?.();
} catch (e) {}

try {
  require('./src/services/incomingCallBackgroundTask');
} catch (e) {}

registerRootComponent(App);
