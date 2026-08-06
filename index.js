<<<<<<< HEAD
<<<<<<< HEAD
import './src/lib/telegram/polyfills';
=======
>>>>>>> f012230 (v0.4.8: Public site, careers, contracts, device gate, and custom ringtone)
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

<<<<<<< HEAD
=======
import { registerRootComponent } from 'expo';
import App from './App';

>>>>>>> c08b25b (first commit)
=======
>>>>>>> f012230 (v0.4.8: Public site, careers, contracts, device gate, and custom ringtone)
registerRootComponent(App);
