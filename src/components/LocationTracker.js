import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { useApp } from '../context/AppContext';
import * as tracking from '../services/trackingService';
import { distanceMeters } from '../lib/geo';
import { configureBackgroundLocation, clearBackgroundLocationUser } from '../services/backgroundLocationService';

const MIN_UPLOAD_MS = 15000; // хамгийн багадаа 15 сек тутам
const MIN_MOVE_M = 30; // эсвэл 30м хөдөлбөл
const ARRIVE_RADIUS_M = 120; // айлд "очсон" гэж тооцох радиус

const validCoords = (coords) => Number.isFinite(coords?.latitude)
  && Number.isFinite(coords?.longitude)
  && Math.abs(coords.latitude) <= 90
  && Math.abs(coords.longitude) <= 180;

// UI-гүй. Нэвтэрсэн үед байршлыг автоматаар Firebase рүү илгээнэ.
export default function LocationTracker() {
  const { isCloud, currentUser, calls, setTrackingState, setPendingVisit } = useApp();
  const watchRef = useRef(null);
  const lastUpload = useRef(0);
  const lastCoord = useRef(null);
  const visited = useRef(new Set());
  const callsRef = useRef(calls || []);

  useEffect(() => {
    callsRef.current = calls || [];
  }, [calls]);

  useEffect(() => {
    if (!isCloud || !currentUser?.id) {
      clearBackgroundLocationUser().catch(() => {});
      setTrackingState?.({ active: false, reason: 'signed-out' });
      return;
    }
    let active = true;

    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted' || !active) {
          setTrackingState?.({ active: false, reason: 'no-permission' });
          return;
        }
        const background = await configureBackgroundLocation(currentUser).catch(() => false);
        setTrackingState?.({ active: true, mode: background ? 'background' : 'foreground' });

        // Эхлэнгүүт шууд нэг удаа байршил илгээх (хөдлөхийг хүлээхгүй)
        try {
          const first = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          await handle(first, true);
        } catch (e) {}

        watchRef.current = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 10000, distanceInterval: 20, mayShowUserSettingsDialog: true },
          (pos) => handle(pos),
          (reason) => setTrackingState?.({ active: false, reason: String(reason || 'location-unavailable') })
        );
      } catch (e) {
        setTrackingState?.({ active: false, reason: e.message });
      }
    })();

    const handle = async (pos, force = false) => {
      if (!validCoords(pos?.coords)) {
        setTrackingState?.({ active: false, reason: 'invalid-coordinate' });
        return;
      }
      const coord = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      const now = Date.now();
      const moved = lastCoord.current ? distanceMeters(lastCoord.current, coord) : Infinity;

      if (force || now - lastUpload.current >= MIN_UPLOAD_MS || moved >= MIN_MOVE_M) {
        lastUpload.current = now;
        lastCoord.current = coord;
        try {
          await tracking.updateMyLocation(currentUser.id, {
            ...coord,
            accuracy: pos.coords.accuracy,
            heading: pos.coords.heading,
            speed: pos.coords.speed,
            timestamp: pos.timestamp,
          });
          await tracking.logLocation({
            userId: currentUser.id,
            userName: currentUser.name,
            ...coord,
            speed: pos.coords.speed,
          });
          setTrackingState?.({ active: true, last: { ...coord, accuracy: pos.coords.accuracy, at: now } });
        } catch (e) {
          // Алдааг харуулах (RLS/сүлжээ) — админ/ажилтан оношилоход тус болно
          setTrackingState?.({ active: false, reason: e.message, last: { ...coord, at: now } });
        }
      }

      // Айлд очсон эсэхийг шалгах
      for (const c of callsRef.current) {
        if (c.latitude == null || visited.current.has(c.id)) continue;
        const d = distanceMeters(coord, { latitude: c.latitude, longitude: c.longitude });
        if (d <= ARRIVE_RADIUS_M) {
          visited.current.add(c.id);
          setPendingVisit?.({
            userId: currentUser.id,
            userName: currentUser.name,
            callId: c.id,
            customer: c.customer,
            problem: c.problem,
            callType: c.type,
            latitude: coord.latitude,
            longitude: coord.longitude,
          });
        }
      }
    };

    return () => {
      active = false;
      if (watchRef.current) {
        watchRef.current.remove();
        watchRef.current = null;
      }
    };
  }, [isCloud, currentUser?.id]);

  return null;
}
