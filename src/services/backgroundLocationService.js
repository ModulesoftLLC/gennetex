import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { firebaseInsert, firebaseUpdate } from '../lib/firebaseAdapter';

export const BACKGROUND_LOCATION_TASK = 'gennetex-background-location-v1';
const TRACKING_USER_KEY = '@gennetex_tracking_user_v1';

const validCoord = (coords) => Number.isFinite(coords?.latitude)
  && Number.isFinite(coords?.longitude)
  && Math.abs(coords.latitude) <= 90
  && Math.abs(coords.longitude) <= 180;

if (!TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK)) {
  TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
    if (error || !data?.locations?.length) return;
    const raw = await AsyncStorage.getItem(TRACKING_USER_KEY);
    const user = raw ? JSON.parse(raw) : null;
    if (!user?.id) return;
    const location = data.locations[data.locations.length - 1];
    if (!validCoord(location.coords)) return;
    const payload = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      location_accuracy: location.coords.accuracy ?? null,
      location_heading: location.coords.heading ?? null,
      location_speed: location.coords.speed ?? null,
      last_seen: new Date(location.timestamp || Date.now()).toISOString(),
      location_source: 'background',
    };
    try {
      await firebaseUpdate('profiles', user.id, payload);
      await firebaseInsert('location_logs', {
        user_id: user.id,
        user_name: user.name || null,
        ...payload,
      });
    } catch (_) {}
  });
}

export async function configureBackgroundLocation(user) {
  if (!user?.id || Platform.OS === 'web') return false;
  await AsyncStorage.setItem(TRACKING_USER_KEY, JSON.stringify({ id: user.id, name: user.name || null }));
  const background = await Location.getBackgroundPermissionsAsync();
  if (background.status !== 'granted') return false;
  if (await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)) return true;
  await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: 30000,
    distanceInterval: 30,
    deferredUpdatesInterval: 30000,
    deferredUpdatesDistance: 30,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'Gennetex ERP байршил',
      notificationBody: 'Ажлын үеийн байршлыг системийн админд шинэчилж байна.',
      notificationColor: '#453FC1',
    },
  });
  return true;
}

export async function clearBackgroundLocationUser() {
  if (Platform.OS !== 'web' && await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(() => false)) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(() => {});
  }
  await AsyncStorage.removeItem(TRACKING_USER_KEY);
}
