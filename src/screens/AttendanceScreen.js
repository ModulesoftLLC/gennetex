import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Alert,
  Modal,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as Network from 'expo-network';
import { useApp } from '../context/AppContext';
import { Card, Button, Field, Badge, ScreenHeader, SectionTitle, EmptyState } from '../components/ui';
import TimeSelect from '../components/TimeSelect';
import SelfieCamera from '../components/SelfieCamera';
import ProfileSetup from '../components/ProfileSetup';
import * as attApi from '../services/attendanceService';
import * as faceApi from '../services/faceService';
import * as shiftApi from '../services/shiftService';
import * as notifyApi from '../services/notificationService';
import { dayKey, formatDuration, calculateDayWork } from '../lib/workHours';
import {
  WEEKDAYS,
  mergeRestDays,
  emptyRestDays,
  formatRestDaysSummary,
  weekdayLabel,
  isRestDay,
} from '../lib/breakSchedule';
import { distanceMeters } from '../lib/geo';
import { spacing, radius } from '../theme';
import { useTheme, useStyles } from '../context/ThemeContext';

export default function AttendanceScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const { currentUser, isCloud, isAdmin, fetchEmployees } = useApp();
  const profile = currentUser;
  const [cameraVisible, setCameraVisible] = useState(false);
  const [pendingType, setPendingType] = useState('check_in');
  const [pendingRemote, setPendingRemote] = useState(false);
  const [pendingDistance, setPendingDistance] = useState(null);
  const [capturedLoc, setCapturedLoc] = useState({});
  const [busy, setBusy] = useState(false);
  const [records, setRecords] = useState([]);
  const [error, setError] = useState(null);
  const [locations, setLocations] = useState([]);
  const [pending, setPending] = useState([]);

  // Царайны бүртгэл
  const [enrolled, setEnrolled] = useState(true);
  const [faceUuid, setFaceUuid] = useState(null);
  const [enrollCount, setEnrollCount] = useState(0);
  const [enrolling, setEnrolling] = useState(false);

  // Зайнаас хүсэлтийн modal
  const [remoteModal, setRemoteModal] = useState(false);
  const [remoteReason, setRemoteReason] = useState('');
  // Байршил тохируулах modal (admin)
  const [locModal, setLocModal] = useState(false);
  const [locForm, setLocForm] = useState({ name: '', radius: '200'});

  // Хуваарь + ажилласан цаг
  const [myShift, setMyShift] = useState(null);
  const [myRestDays, setMyRestDays] = useState([]);
  const [myDayAttendance, setMyDayAttendance] = useState([]);
  const [hoursModal, setHoursModal] = useState(false);
  const [breakModal, setBreakModal] = useState(false);
  const [breakForm, setBreakForm] = useState({ userId: ''});
  const [restDays, setRestDays] = useState(emptyRestDays());
  const [breakScheduleList, setBreakScheduleList] = useState([]);
  const [migrationHint, setMigrationHint] = useState(null);
  const [todayShifts, setTodayShifts] = useState([]);
  const [shiftModal, setShiftModal] = useState(false);
  const [shiftForm, setShiftForm] = useState({
    userId: '',
    shiftDate: dayKey(),
    startTime: '09:00',
    endTime: '18:00',
    locationId: '',
    note: '',
  });
  const shiftAlertSent = useRef(false);
  const [employees, setEmployees] = useState([]);
  const [attendanceEmployee, setAttendanceEmployee] = useState(null);

  const loadEmployees = useCallback(async () => {
    if (!isCloud || !isAdmin) return;
    try {
      setEmployees(await fetchEmployees());
    } catch (e) {}
  }, [isCloud, isAdmin, fetchEmployees]);

  const loadBreakSchedules = useCallback(async () => {
    if (!isCloud || !isAdmin) return;
    try {
      setBreakScheduleList(await shiftApi.fetchAllBreakSchedules());
    } catch (e) {
      if (shiftApi.isShiftTableMissing(e)) setMigrationHint(shiftApi.MIGRATION_HINT);
    }
  }, [isCloud, isAdmin]);

  const loadMyDay = useCallback(async () => {
    if (!isCloud || !profile?.id || isAdmin) return;
    try {
      const today = dayKey();
      const [shift, restDayRows, attendance] = await Promise.all([
        shiftApi.fetchMyShift(profile.id, today),
        shiftApi.fetchBreakScheduleForUser(profile.id),
        shiftApi.fetchAttendanceForUserDay(profile.id, today),
      ]);
      setMyShift(shift);
      setMyRestDays(mergeRestDays(restDayRows));
      setMyDayAttendance(attendance);
      setMigrationHint(null);
    } catch (e) {
      if (shiftApi.isShiftTableMissing(e)) setMigrationHint(shiftApi.MIGRATION_HINT);
    }
  }, [isCloud, profile?.id, isAdmin]);

  const loadTodayShifts = useCallback(async () => {
    if (!isCloud || !isAdmin) return;
    try {
      setTodayShifts(await shiftApi.fetchShiftsForDate(dayKey()));
      setMigrationHint(null);
    } catch (e) {
      if (shiftApi.isShiftTableMissing(e)) setMigrationHint(shiftApi.MIGRATION_HINT);
    }
  }, [isCloud, isAdmin]);

  const loadRecords = useCallback(async () => {
    if (!isCloud || !isAdmin) return;
    try {
      setRecords(await attApi.fetchAttendance(1000));
      setPending(await attApi.fetchPendingAttendance());
      await loadTodayShifts();
      await loadBreakSchedules();
    } catch (e) {
      setError(e.message);
    }
  }, [isCloud, isAdmin, loadTodayShifts, loadBreakSchedules]);

  const loadLocations = useCallback(async () => {
    if (!isCloud) return;
    try {
      setLocations(await attApi.fetchAttendanceLocations());
    } catch (e) {}
  }, [isCloud]);

  const loadFace = useCallback(async () => {
    if (!isCloud || !profile?.id) {
      setEnrolled(true);
      return;
    }
    try {
      const count = await faceApi.countEnrollments(profile.id);
      setEnrollCount(count);
      setEnrolled(count >= faceApi.ENROLL_TARGET);
      setFaceUuid(await faceApi.getFaceUuid(profile.id));
    } catch (e) {}
  }, [isCloud, profile?.id]);

  useEffect(() => {
    loadRecords();
    loadLocations();
    loadFace();
    loadMyDay();
    loadEmployees();
  }, [loadRecords, loadLocations, loadFace, loadMyDay, loadEmployees]);

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return {};
      const [last, current, network, ip] = await Promise.all([
        Location.getLastKnownPositionAsync({ maxAge: 15000, requiredAccuracy: 100 }).catch(() => null),
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.BestForNavigation }),
        Network.getNetworkStateAsync().catch(() => ({})),
        Network.getIpAddressAsync().catch(() => null),
      ]);
      const pos = last && Number(last.coords?.accuracy) < Number(current.coords?.accuracy) ? last : current;
      const wifi = network?.type === Network.NetworkStateType.WIFI;
      return {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy ?? null,
        capturedAt: new Date(pos.timestamp || Date.now()).toISOString(),
        networkType: network?.type || 'UNKNOWN',
        wifiConnected: wifi,
        wifiPrefix: wifi && ip && ip !== '0.0.0.0' ? String(ip).split('.').slice(0, 3).join('.') : null,
      };
    } catch {
      return {};
    }
  };

  // Одоогийн байршлыг зөвшөөрөгдсөн цэгүүдтэй харьцуулна
  const evaluateLocation = (loc) => {
    const near = attApi.nearestAttendanceLocation(loc, locations);
    if (!locations.length) return { mode: 'onsite', distance: null, locationName: null, verificationMethod: 'face' };
    if (loc.latitude == null) return { mode: 'remote', distance: null, locationName: null };
    const wifiMatched = !!(near.location?.wifi_prefix && loc.wifiConnected && near.location.wifi_prefix === loc.wifiPrefix);
    const accurateGps = Number(loc.accuracy || 9999) <= Math.max(80, Number(near.location?.radius_m || 200));
    const onsite = near.within && (accurateGps || wifiMatched);
    return {
      mode: onsite ? 'onsite' : 'remote',
      distance: near.distance,
      locationName: near.location?.name || null,
      wifiMatched,
      verificationMethod: wifiMatched ? 'face+gps+wifi' : accurateGps ? 'face+gps' : 'face',
    };
  };

  const workSummary = calculateDayWork({
    attendance: myDayAttendance,
    dateKey: dayKey(),
  });
  const todayIsRest = isRestDay(myRestDays);

  const breakSchedulesByUser = breakScheduleList.reduce((acc, row) => {
    if (!acc[row.user_id]) {
      acc[row.user_id] = { user_id: row.user_id, user_name: row.user_name, days: [] };
    }
    acc[row.user_id].days.push(row.day_of_week);
    return acc;
  }, {});

  const pickEmployeeForBreak = async (userId) => {
    setBreakForm({ userId });
    if (!userId) {
      setRestDays(emptyRestDays());
      return;
    }
    try {
      const rows = await shiftApi.fetchBreakScheduleForUser(userId);
      setRestDays(mergeRestDays(rows));
    } catch (e) {
      setRestDays(emptyRestDays());
    }
  };

  const openBreakModal = () => {
    setBreakForm({ userId: ''});
    setRestDays(emptyRestDays());
    setBreakModal(true);
  };

  const toggleRestDay = (day) => {
    setRestDays((prev) =>
      prev.map((d) => (d.day_of_week === day ? { ...d, is_rest: !d.is_rest } : d))
    );
  };

  // Хуваарийн эхлэх цагт ажлын газарт байхгүй бол админд мэдэгдэл (өдөрт нэг удаа)
  useEffect(() => {
    if (!isCloud || isAdmin || !myShift || shiftAlertSent.current) return;
    const check = async () => {
      const [h, m] = (myShift.start_time || '09:00').split(':').map(Number);
      const start = new Date();
      start.setHours(h, m, 0, 0);
      const grace = new Date(start.getTime() + 10 * 60000);
      if (Date.now() < grace.getTime()) return;
      const hasCheckIn = myDayAttendance.some((a) => a.type === 'check_in');
      if (hasCheckIn) return;
      const loc = await getLocation();
      let offSite = true;
      if (myShift.location_id) {
        const shiftLoc = locations.find((l) => l.id === myShift.location_id);
        if (shiftLoc && loc.latitude != null) {
          const d = distanceMeters(loc, { latitude: shiftLoc.latitude, longitude: shiftLoc.longitude });
          offSite = d > (shiftLoc.radius_m || 200);
        }
      } else {
        const ev = evaluateLocation(loc);
        offSite = ev.mode === 'remote';
      }
      if (!offSite) return;
      shiftAlertSent.current = true;
      try {
        await notifyApi.notifyShiftMissed({
          staffName: profile?.name,
          shiftTime: myShift.start_time,
          locationName: myShift.location_name,
        });
      } catch (e) {}
    };
    check();
  }, [isCloud, isAdmin, myShift, myDayAttendance, locations, profile?.name]);

  const startCheck = async (type) => {
    setError(null);
    const loc = await getLocation();
    const { mode, distance, locationName, wifiMatched, verificationMethod } = evaluateLocation(loc);
    setPendingType(type);
    setPendingDistance(distance);
    setCapturedLoc({ ...loc, locationName, wifiMatched, verificationMethod });

    // Анх удаа — царай бүртгэх горим (10 удаа)
    if (isCloud && !enrolled) {
      Alert.alert('Нүүр бүртгэл дутуу', 'Үндсэн апп руу орохын өмнөх 10 удаагийн нүүр бүртгэлээ дуусгаад дахин оролдоно уу.');
      return;
    }

    setEnrolling(false);
    if (mode === 'onsite') {
      setPendingRemote(false);
      setRemoteReason('');
      setCameraVisible(true);
    } else {
      setPendingRemote(true);
      setRemoteReason('');
      setRemoteModal(true);
    }
  };

  const submitRemote = () => {
    setRemoteModal(false);
    setCameraVisible(true);
  };

  const startAdminFaceEnrollment = () => {
    setError(null);
    setEnrolling(true);
    setPendingRemote(false);
    setPendingDistance(null);
    setCapturedLoc({});
    setCameraVisible(true);
  };

  // Царай бүртгэх — 10 удаа selfie авна
  const handleEnrollCapture = async (photo) => {
    setBusy(true);
    setError(null);
    try {
      const photoUrl = await attApi.uploadSelfie(photo.uri, profile.id);
      await faceApi.insertEnrollment({
        userId: profile.id,
        userName: profile.name,
        photoUrl,
        localUri: photo.uri,
      });
      const next = enrollCount + 1;
      setEnrollCount(next);

      if (next < faceApi.ENROLL_TARGET) {
        // Камер нээлттэй хэвээр — дараагийн зураг
        return;
      }

      // 10 хүрсэн — бүртгэл дуусч, ирцээ бас бүртгэнэ
      await faceApi.setFaceEnrolled(profile.id);
      setEnrolled(true);
      setEnrolling(false);
      setFaceUuid(await faceApi.getFaceUuid(profile.id));
      if (isAdmin) {
        setCameraVisible(false);
        Alert.alert('Царай бүртгэгдлээ', 'Системийн админы нүүрийн бүртгэл амжилттай дууслаа. Одоо нүүрээр ирц баталгаажуулах боломжтой.');
        return;
      }
      const status = pendingRemote ? 'pending' : 'approved';
      await attApi.insertAttendance({
        staffId: profile.id,
        staffName: profile.name,
        type: pendingType,
        photoUrl,
        status,
        isRemote: pendingRemote,
        distanceM: pendingDistance,
        note: pendingRemote ? remoteReason.trim() : null,
        locationName: capturedLoc?.locationName || null,
        latitude: capturedLoc?.latitude,
        longitude: capturedLoc?.longitude,
        accuracyM: capturedLoc?.accuracy,
        networkType: capturedLoc?.networkType,
        wifiVerified: capturedLoc?.wifiMatched,
        verificationMethod: capturedLoc?.verificationMethod,
      });
      await loadRecords();
      await loadMyDay();
      setCameraVisible(false);
      Alert.alert(
        'Царай бүртгэгдлээ',
        'Таны царай амжилттай бүртгэгдлээ. Дараагаас нэг удаа selfie авахад л ирц бүртгэгдэнэ.'
      );
    } catch (e) {
      setError(e.message);
      Alert.alert('Алдаа', e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleCapture = async (photo) => {
    // Царай бүртгэх горим бол тусад нь боловсруулна
    if (enrolling) return handleEnrollCapture(photo);

    setBusy(true);
    setError(null);
    try {
      const loc = capturedLoc || {};
      const status = pendingRemote ? 'pending' : 'approved';
      if (isCloud) {
        const photoUrl = await attApi.uploadSelfie(photo.uri, profile.id);
        // Царай таних шалгалт — зөвхөн тухайн ажилтны царайг зөвшөөрнө
        const vr = await faceApi.verifyFace(photoUrl, photo.uri);
        if (!vr.skipped && !vr.match) {
          setBusy(false);
          setCameraVisible(false);
          Alert.alert(
            'Царай таарсангүй',
            'Энэ царай бүртгэлтэй ажилтны царайтай таарахгүй байна. Дахин оролдоно уу.'
          );
          return;
        }
        await attApi.insertAttendance({
          staffId: profile.id,
          staffName: profile.name,
          type: pendingType,
          photoUrl,
          status,
          isRemote: pendingRemote,
          distanceM: pendingDistance,
          note: pendingRemote ? remoteReason.trim() : null,
          locationName: capturedLoc?.locationName || loc.locationName || null,
          latitude: loc.latitude,
          longitude: loc.longitude,
          accuracyM: loc.accuracy,
          networkType: loc.networkType,
          wifiVerified: loc.wifiMatched,
          verificationMethod: loc.verificationMethod,
        });
        await loadRecords();
        await loadMyDay();
      } else {
        setRecords((prev) => [
          {
            id: Date.now().toString(),
            staff_name: profile.name,
            type: pendingType,
            photo_url: photo.uri,
            created_at: new Date().toISOString(),
            status,
            is_remote: pendingRemote,
            ...loc,
          },
          ...prev,
        ]);
      }
      setCameraVisible(false);
      Alert.alert(
        pendingRemote ? 'Хүсэлт илгээгдлээ' : 'Амжилттай',
        pendingRemote
          ? 'Зайнаас бүртгүүлэх хүсэлт админд илгээгдлээ. Зөвшөөрөхийг хүлээнэ үү.'
          : `${pendingType === 'check_in' ? 'Ирсэн' : 'Явсан'} ирц бүртгэгдлээ.`
      );
    } catch (e) {
      setError(e.message);
      Alert.alert('Алдаа', e.message);
    } finally {
      setBusy(false);
    }
  };

  // ---- Admin: хүсэлт зөвшөөрөх/татгалзах ----
  const decide = async (id, status) => {
    try {
      await attApi.setAttendanceStatus(id, status);
      await loadRecords();
    } catch (e) {
      Alert.alert('Алдаа', e.message);
    }
  };

  // ---- Admin: одоогийн байршлыг бүртгэлийн цэг болгох ----
  const saveLocation = async () => {
    if (!locForm.name.trim()) {
      Alert.alert('Нэр оруулна уу', 'Байршлын нэрийг бичнэ үү.');
      return;
    }
    const loc = await getLocation();
    if (loc.latitude == null) {
      Alert.alert('Байршил алга', 'GPS байршил авч чадсангүй.');
      return;
    }
    try {
      await attApi.insertAttendanceLocation({
        name: locForm.name.trim(),
        latitude: loc.latitude,
        longitude: loc.longitude,
        radius_m: Number(locForm.radius) || 200,
        wifi_prefix: loc.wifiConnected ? loc.wifiPrefix : null,
        wifi_enabled: !!(loc.wifiConnected && loc.wifiPrefix),
      });
      setLocModal(false);
      setLocForm({ name: '', radius: '200'});
      await loadLocations();
      Alert.alert('Хадгаллаа', 'Бүртгэлийн байршил нэмэгдлээ.');
    } catch (e) {
      Alert.alert('Алдаа', e.message);
    }
  };

  const saveBreakSchedule = async () => {
    if (!isAdmin) return;
    const worker = employees.find((s) => s.id === breakForm.userId);
    if (!breakForm.userId || !worker) {
      Alert.alert('Ажилтан', 'Ажилтан сонгоно уу');
      return;
    }
    try {
      await shiftApi.saveRestDays({
        userId: breakForm.userId,
        userName: worker.name,
        restDays,
        createdBy: profile?.id,
      });
      setBreakModal(false);
      await loadBreakSchedules();
      Alert.alert('Амжилттай', `${worker.name}-ийн амралтын өдөр хадгалагдлаа.`);
    } catch (e) {
      const msg = shiftApi.isShiftTableMissing(e) ? shiftApi.MIGRATION_HINT : e.message;
      Alert.alert('Алдаа', msg);
    }
  };

  const saveShift = async () => {
    const worker = employees.find((s) => s.id === shiftForm.userId);
    if (!shiftForm.userId || !worker) {
      Alert.alert('Ажилтан', 'Ажилтан сонгоно уу');
      return;
    }
    try {
      await shiftApi.upsertShift({
        userId: shiftForm.userId,
        userName: worker.name,
        shiftDate: shiftForm.shiftDate,
        startTime: shiftForm.startTime,
        endTime: shiftForm.endTime,
        locationId: shiftForm.locationId || null,
        note: shiftForm.note.trim(),
        createdBy: profile?.id,
      });
      setShiftModal(false);
      await loadTodayShifts();
      Alert.alert('Хадгаллаа', 'Хуваарь оноогдлоо');
    } catch (e) {
      const msg = shiftApi.isShiftTableMissing(e) ? shiftApi.MIGRATION_HINT : e.message;
      Alert.alert('Алдаа', msg);
    }
  };

  const removeLocation = (id, name) => {
    Alert.alert('Устгах', `${name} байршлыг устгах уу?`, [
      { text: 'Болих', style: 'cancel'},
      {
        text: 'Устгах',
        style: 'destructive',
        onPress: async () => {
          await attApi.deleteAttendanceLocation(id);
          await loadLocations();
        },
      },
    ]);
  };

  if (!profile) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ProfileSetup title="Ирц бүртгэх"/>
      </SafeAreaView>
    );
  }

  const header = (
    <View>
      <Card style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={styles.faceCircle}>
            <Text style={{ fontSize: 30 }}></Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Царайгаар ирц бүртгэх</Text>
            <Text style={styles.cardSub}>Урд камераар selfie авч баталгаажуулна.</Text>
          </View>
        </View>
        <View style={styles.btnRow}>
          <Button title="Ирсэн" variant="success" style={{ flex: 1 }} onPress={() => startCheck('check_in')} />
          <Button title="Явсан" variant="danger" style={{ flex: 1 }} onPress={() => startCheck('check_out')} />
        </View>
        {isCloud && locations.length > 0 ? (
          <Text style={styles.geoHint}>
             {locations.map((l) => l.name).join(', ')} цэгийн GPS радиус болон боломжтой үед тухайн газрын Wi‑Fi-г давхар баталгаажуулна. Гадуур бол зайнаас хүсэлт илгээнэ.
          </Text>
        ) : null}
        {isCloud && !enrolled ? (
          <View style={styles.enrollBox}>
            <Text style={styles.enrollHint}>Царайны бүртгэл: {enrollCount}/{faceApi.ENROLL_TARGET}. Дараа нь нэг selfie авахад таньж баталгаажуулна.</Text>
            {isAdmin ? <Button title={enrollCount > 0 ? 'Нүүр бүртгэл үргэлжлүүлэх' : 'Нүүрээ бүртгүүлэх'} size="sm" style={{ marginTop: spacing.sm }} onPress={startAdminFaceEnrollment} /> : null}
          </View>
        ) : isCloud ? (
          <Text style={styles.geoHint}> Царай бүртгэгдсэн. Selfie авахад таны царайг таньж бүртгэнэ.</Text>
        ) : null}
      </Card>

      {/* Ажилтан: хуваарь харах */}
      {!isAdmin && isCloud ? (
        <Card style={{ marginTop: spacing.sm }}>
          <Text style={styles.blockTitle}> Хуваарь харах</Text>
          <Text style={styles.privacyText}>
            Ажлын хуваарь, амралтын өдөр, нийт ажилласан цагаа харна.
          </Text>
          <TouchableOpacity
            style={styles.hoursTap}
            onPress={() => navigation.navigate('MyShift')}
            activeOpacity={0.7}
          >
            <Text style={styles.hoursLabel}>Өнөөдөр</Text>
            <Text style={styles.hoursValue}>
              {todayIsRest ? 'Амралт' : myShift ? `${myShift.start_time} – ${myShift.end_time}` : 'Хуваарьгүй'}
            </Text>
            <Text style={styles.hoursHint}>
              Ажилласан: {todayIsRest ? '—' : formatDuration(workSummary.netMs)} · Дэлгэрэнгүй →
            </Text>
          </TouchableOpacity>
        </Card>
      ) : null}

      {migrationHint ? (
        <Card style={{ marginTop: spacing.sm, borderColor: colors.warning, borderWidth: 1 }}>
          <Text style={styles.note}>{migrationHint}</Text>
        </Card>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!isCloud ? (
        <Text style={styles.note}>
           Firebase холбогдоогүй тул ирц зөвхөн энэ утсанд хадгалагдана.
        </Text>
      ) : null}

      {/* Админ: хуваарь оноох */}
      {isAdmin && isCloud ? (
        <Card style={{ marginTop: spacing.sm }}>
          <View style={styles.locHead}>
            <Text style={styles.blockTitle}> Ажилтны хуваарь</Text>
            <Button title="Хуваарь оноох" size="sm" onPress={() => setShiftModal(true)} />
          </View>
          {todayShifts.length === 0 ? (
            <Text style={styles.privacyText}>Өнөөдрийн хуваарь алга.</Text>
          ) : (
            todayShifts.map((s) => (
              <View key={s.id} style={styles.locRow}>
                <Text style={styles.locName}>{s.user_name}</Text>
                <Text style={styles.locRadius}>
                  {s.start_time}–{s.end_time}
                  {s.location_name ? ` · ${s.location_name}` : ''}
                </Text>
              </View>
            ))
          )}
        </Card>
      ) : null}

      {/* Админ: амралтын өдөр */}
      {isAdmin && isCloud ? (
        <Card style={{ marginTop: spacing.sm }}>
          <View style={styles.locHead}>
            <Text style={styles.blockTitle}> Амралтын өдөр</Text>
            <Button title="Өдөр сонгох" size="sm" onPress={openBreakModal} />
          </View>
          {Object.keys(breakSchedulesByUser).length === 0 ? (
            <Text style={styles.privacyText}>Даваа–Ням гаригт амралтын өдөр тохируулаагүй.</Text>
          ) : (
            Object.values(breakSchedulesByUser).map((item) => (
              <View key={item.user_id} style={styles.locRow}>
                <Text style={styles.locName}>{item.user_name}</Text>
                <Text style={styles.locRadius}>
                  {item.days.map((d) => weekdayLabel(d)).join(', ')}
                </Text>
              </View>
            ))
          )}
        </Card>
      ) : null}

      {/* Админ: бүртгэлийн байршлын тохиргоо */}
      {isAdmin && isCloud ? (
        <Card style={{ marginTop: spacing.sm }}>
          <View style={styles.locHead}>
            <Text style={styles.blockTitle}> Бүртгэлийн байршил</Text>
            <Button title="Одоогийн газар нэмэх" size="sm" onPress={() => setLocModal(true)} />
          </View>
          {locations.length === 0 ? (
            <Text style={styles.privacyText}>Байршил тохируулаагүй бол хаанаас ч бүртгэнэ.</Text>
          ) : (
            locations.map((l) => (
              <View key={l.id} style={styles.locRow}>
                <Text style={styles.locName}>{l.name}</Text>
                <Text style={styles.locRadius}>{l.radius_m}м{l.wifi_enabled ? ' · Wi‑Fi ✓' : ''}</Text>
                <TouchableOpacity onPress={() => removeLocation(l.id, l.name)} hitSlop={8}>
                  <Text style={styles.delete}>Устгах</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </Card>
      ) : null}

      {/* Админ: зайнаас бүртгүүлэх хүсэлтүүд */}
      {isAdmin && pending.length > 0 ? (
        <View>
          <SectionTitle style={{ marginTop: spacing.md }}>
             Зайнаас бүртгүүлэх хүсэлт ({pending.length})
          </SectionTitle>
          {pending.map((item) => (
            <Card key={item.id} style={styles.pendCard}>
              <View style={styles.recordRow}>
                {item.photo_url ? (
                  <Image source={{ uri: item.photo_url }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarEmpty]}>
                    <Text style={{ fontSize: 22 }}></Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.recordName}>{item.staff_name}</Text>
                  <Text style={styles.recordDate}>
                    {item.type === 'check_in' ? 'Ирсэн' : 'Явсан'} ·{' '}
                    {new Date(item.created_at).toLocaleString('mn-MN')}
                  </Text>
                  {item.distance_m != null ? (
                    <Text style={styles.recordDate}> Цэгээс ~{item.distance_m}м зайд</Text>
                  ) : null}
                  {item.location_name ? (
                    <Text style={styles.recordDate}> Бүртгсэн: {item.location_name}</Text>
                  ) : null}
                  {item.note ? <Text style={styles.noteText}>{item.note}</Text> : null}
                </View>
              </View>
              <View style={styles.btnRow}>
                <Button title="Зөвшөөрөх" variant="success" size="sm" style={{ flex: 1 }} onPress={() => decide(item.id, 'approved')} />
                <Button title="Татгалзах" variant="danger" size="sm" style={{ flex: 1 }} onPress={() => decide(item.id, 'rejected')} />
              </View>
            </Card>
          ))}
        </View>
      ) : null}

      {isAdmin && isCloud ? (
        <AttendanceActivityPanel
          employees={employees}
          records={records}
          onSelectEmployee={setAttendanceEmployee}
        />
      ) : null}

      {isAdmin ? (
        <SectionTitle style={{ marginTop: spacing.md }}> Бүх ажилчдын ирц</SectionTitle>
      ) : (
        <Card style={{ marginTop: spacing.sm }}>
          <Text style={styles.privacyText}>
             Таны ирцийн бүртгэлийг зөвхөн админ харна. Дээрх товчоор ирцээ бүртгүүлээрэй.
          </Text>
        </Card>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader
        back={false} title="Ирцийн бүртгэл"
        subtitle={`${isCloud ? 'Supabase' : 'Локал'} · ${profile?.name || ''}`}
      />
      <FlatList
        data={isAdmin ? records.filter((r) => r.status !== 'pending') : []}
        keyExtractor={(r, index) => `${r.id || 'attendance'}-${index}`}
        ListHeaderComponent={header}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 110 }}
        renderItem={({ item }) => (
          <Card>
            <View style={styles.recordRow}>
              {item.photo_url ? (
                <Image source={{ uri: item.photo_url }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarEmpty]}>
                  <Text style={{ fontSize: 22 }}></Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.recordName}>{item.staff_name}</Text>
                <Text style={styles.recordDate}>
                  {new Date(item.created_at).toLocaleString('mn-MN')}
                </Text>
                {item.location_name ? (
                  <Text style={styles.recordDate}>{item.location_name}</Text>
                ) : item.is_remote && item.distance_m != null ? (
                  <Text style={styles.recordDate}> Цэгээс ~{item.distance_m}м зайд</Text>
                ) : null}
                <View style={styles.tagRow}>
                  {item.is_remote ? <Badge text="Зайнаас" color={colors.accent} /> : null}
                  {item.wifi_verified ? <Badge text="GPS + Wi‑Fi" color={colors.success} /> : null}
                  {item.accuracy_m != null ? <Badge text={`±${Math.round(item.accuracy_m)}м`} color={colors.primary} /> : null}
                  {item.status === 'rejected' ? <Badge text="Татгалзсан" color={colors.danger} /> : null}
                </View>
              </View>
              <Badge
                text={item.type === 'check_in' ? 'Ирсэн' : 'Явсан'}
                color={item.type === 'check_in' ? colors.success : colors.danger}
              />
            </View>
          </Card>
        )}
        ListEmptyComponent={
          isAdmin ? <EmptyState text="Ирц бүртгэгдээгүй байна."/> : null
        }
      />

      <SelfieCamera
        visible={cameraVisible}
        busy={busy}
        auto
        autoDelayMs={enrolling ? 1200 : 2000}
        progressText={enrolling ? `Царай бүртгэж байна: ${enrollCount}/${faceApi.ENROLL_TARGET}` : null}
        hint={
          enrolling
            ? 'Царайгаа хүрээнд байрлуулаарай — автоматаар дараалан авна'
            : undefined
        }
        onClose={() => {
          setCameraVisible(false);
          setEnrolling(false);
        }}
        onCapture={handleCapture}
      />

      <EmployeeAttendanceModal
        employee={attendanceEmployee}
        records={records}
        onClose={() => setAttendanceEmployee(null)}
      />

      {/* Зайнаас бүртгүүлэх хүсэлт */}
      <Modal visible={remoteModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}> Зайнаас бүртгүүлэх</Text>
            <Text style={styles.sheetSub}>
              Та бүртгэлтэй байршлаас
              {pendingDistance != null ? ` ~${pendingDistance}м` : ''} гадуур байна. Шалтгаанаа бичээд selfie
              авснаар админд хүсэлт илгээгдэнэ.
            </Text>
            <Field
              label="Шалтгаан"
              placeholder="Ж: Талбай дээр ажиллаж байна"
              value={remoteReason}
              onChangeText={setRemoteReason}
            />
            <View style={styles.btnRow}>
              <Button title="Болих" variant="ghost" style={{ flex: 1 }} onPress={() => setRemoteModal(false)} />
              <Button title="Үргэлжлүүлэх" style={{ flex: 1 }} onPress={submitRemote} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Админ: байршил нэмэх */}
      <Modal visible={locModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.sheetTitle}> Бүртгэлийн байршил нэмэх</Text>
              <Text style={styles.sheetSub}>Таны одоо байгаа GPS цэгийг хадгална.</Text>
              <Field
                label="Нэр"
                placeholder="Ж: Төв оффис"
                value={locForm.name}
                onChangeText={(t) => setLocForm({ ...locForm, name: t })}
              />
              <Field
                label="Радиус (метр)"
                placeholder="200"
                keyboardType="numeric"
                value={locForm.radius}
                onChangeText={(t) => setLocForm({ ...locForm, radius: t })}
              />
              <View style={styles.btnRow}>
                <Button title="Болих" variant="ghost" style={{ flex: 1 }} onPress={() => setLocModal(false)} />
                <Button title="Хадгалах" style={{ flex: 1 }} onPress={saveLocation} />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Ажилласан цагийн дэлгэрэнгүй */}
      <Modal visible={hoursModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Нийт ажилласан цаг</Text>
            <Text style={styles.sheetSub}>{dayKey()} · {profile?.name}</Text>
            {todayIsRest ? (
              <Text style={styles.restBadge}> Өнөөдөр амралтын өдөр</Text>
            ) : null}
            {workSummary.pairs.length === 0 ? (
              <Text style={styles.privacyText}>Өнөөдөр ирц бүртгэгдээгүй.</Text>
            ) : (
              workSummary.pairs.map((p, i) => (
                <View key={i} style={styles.hoursRow}>
                  <Text style={styles.hoursRowText}>
                    {new Date(p.checkIn.created_at).toLocaleTimeString('mn-MN', { hour: '2-digit', minute: '2-digit'})}
                    {' – '}
                    {new Date(p.checkOut.created_at).toLocaleTimeString('mn-MN', { hour: '2-digit', minute: '2-digit'})}
                  </Text>
                  <Text style={styles.hoursRowDur}>{formatDuration(p.ms)}</Text>
                </View>
              ))
            )}
            <View style={styles.hoursTotalBox}>
              <Text style={styles.hoursTotalLine}>Нийт: {formatDuration(workSummary.grossMs)}</Text>
              <Text style={styles.hoursTotalNet}>
                {todayIsRest ? 'Амралтын өдөр' : `Цэвэр: ${formatDuration(workSummary.netMs)}`}
              </Text>
            </View>
            <Button title="Хаах" onPress={() => setHoursModal(false)} />
          </View>
        </View>
      </Modal>

      {/* Админ: амралтын өдөр */}
      {isAdmin ? (
      <Modal visible={breakModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.sheetTitle}> Амралтын өдөр</Text>
              <Text style={styles.sheetSub}>
                Даваа гарагаас Ням гариг хүртэл аль өдөр амралттайг сонгоно.
              </Text>
              <Text style={styles.fieldLabel}>Ажилтан</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
                {employees.filter((w) => w.role !== 'admin').map((w) => (
                  <TouchableOpacity
                    key={w.id}
                    style={[styles.chip, breakForm.userId === w.id && styles.chipOn]}
                    onPress={() => pickEmployeeForBreak(w.id)}
                  >
                    <Text style={[styles.chipText, breakForm.userId === w.id && styles.chipTextOn]}>{w.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {WEEKDAYS.map((day) => {
                const slot = restDays.find((s) => s.day_of_week === day.day);
                const on = slot?.is_rest;
                return (
                  <TouchableOpacity
                    key={day.day}
                    style={[styles.restRow, on && styles.restRowOn]}
                    onPress={() => toggleRestDay(day.day)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.restDayLabel, on && styles.restDayLabelOn]}>{day.label}</Text>
                    <Text style={[styles.restStatus, on && styles.restStatusOn]}>
                      {on ? 'Амралт' : 'Ажиллана'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              <View style={styles.btnRow}>
                <Button title="Болих" variant="ghost" style={{ flex: 1 }} onPress={() => setBreakModal(false)} />
                <Button title="Хадгалах" style={{ flex: 1 }} onPress={saveBreakSchedule} />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
      ) : null}

      {/* Админ: хуваарь оноох */}
      <Modal visible={shiftModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.sheetTitle}> Хуваарь оноох</Text>
              <Text style={styles.sheetSub}>Ажилтанд өдрийн эхлэх/дуусах цаг болон байршил онооно.</Text>
              <Field
                label="Огноо (YYYY-MM-DD)"
                value={shiftForm.shiftDate}
                onChangeText={(t) => setShiftForm({ ...shiftForm, shiftDate: t })}
              />
              <Text style={styles.fieldLabel}>Ажилтан</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
                {employees.filter((w) => w.role !== 'admin').map((w) => (
                  <TouchableOpacity
                    key={w.id}
                    style={[styles.chip, shiftForm.userId === w.id && styles.chipOn]}
                    onPress={() => setShiftForm({ ...shiftForm, userId: w.id })}
                  >
                    <Text style={[styles.chipText, shiftForm.userId === w.id && styles.chipTextOn]}>{w.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={styles.timeRow}>
                <TimeSelect
                  label="Эхлэх цаг"
                  value={shiftForm.startTime}
                  onChange={(t) => setShiftForm({ ...shiftForm, startTime: t })}
                  allowClear={false}
                />
                <TimeSelect
                  label="Дуусах цаг"
                  value={shiftForm.endTime}
                  onChange={(t) => setShiftForm({ ...shiftForm, endTime: t })}
                  allowClear={false}
                />
              </View>
              <Text style={styles.fieldLabel}>Байршил</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
                <TouchableOpacity
                  style={[styles.chip, !shiftForm.locationId && styles.chipOn]}
                  onPress={() => setShiftForm({ ...shiftForm, locationId: ''})}
                >
                  <Text style={[styles.chipText, !shiftForm.locationId && styles.chipTextOn]}>Сонгохгүй</Text>
                </TouchableOpacity>
                {locations.map((l) => (
                  <TouchableOpacity
                    key={l.id}
                    style={[styles.chip, shiftForm.locationId === l.id && styles.chipOn]}
                    onPress={() => setShiftForm({ ...shiftForm, locationId: l.id })}
                  >
                    <Text style={[styles.chipText, shiftForm.locationId === l.id && styles.chipTextOn]}>{l.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Field
                label="Тайлбар"
                value={shiftForm.note}
                onChangeText={(t) => setShiftForm({ ...shiftForm, note: t })}
              />
              <View style={styles.btnRow}>
                <Button title="Болих" variant="ghost" style={{ flex: 1 }} onPress={() => setShiftModal(false)} />
                <Button title="Хадгалах" style={{ flex: 1 }} onPress={saveShift} />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function attendanceTime(row) {
  return row?.created_at?.toMillis?.() ?? row?.createdAt?.toMillis?.()
    ?? new Date(row?.created_at || row?.createdAt || 0).getTime();
}

function localDayKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function recentDays(count) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (count - index - 1));
    return { key: localDayKey(date), label: `${date.getMonth() + 1}/${date.getDate()}` };
  });
}

function approvedCheckIns(records) {
  return (records || []).filter((row) => row.type === 'check_in' && row.status !== 'pending' && row.status !== 'rejected');
}

function recordEmployeeKey(row) {
  return String(row?.staff_id || row?.staffId || row?.user_id || row?.userId || row?.staff_name || '').trim();
}

function employeeKey(employee) {
  return String(employee?.id || employee?.user_id || employee?.uid || employee?.name || '').trim();
}

function recordsForEmployee(records, employee) {
  const id = employeeKey(employee);
  const name = String(employee?.name || '').trim().toLowerCase();
  return approvedCheckIns(records).filter((row) => {
    const rowId = recordEmployeeKey(row);
    const rowName = String(row?.staff_name || '').trim().toLowerCase();
    return (id && rowId === id) || (name && rowName === name);
  });
}

function AttendanceActivityPanel({ employees, records, onSelectEmployee }) {
  const styles = useStyles(makeAnalyticsStyles);
  const { colors } = useTheme();
  const days = useMemo(() => recentDays(7), []);
  const checkIns = useMemo(() => approvedCheckIns(records), [records]);
  const daily = useMemo(() => days.map((day) => {
    const rows = checkIns.filter((row) => localDayKey(attendanceTime(row)) === day.key);
    return { ...day, count: new Set(rows.map(recordEmployeeKey).filter(Boolean)).size };
  }), [checkIns, days]);
  const totalEmployees = employees.length;
  const todayCount = daily[daily.length - 1]?.count || 0;
  const activityRate = totalEmployees ? Math.round(todayCount / totalEmployees * 100) : 0;
  const maxCount = Math.max(1, totalEmployees, ...daily.map((day) => day.count));
  const employeeRows = useMemo(() => (employees || []).map((employee) => {
    const own = recordsForEmployee(records, employee);
    const recentKeys = new Set(days.map((day) => day.key));
    const activeDays = new Set(own.map((row) => localDayKey(attendanceTime(row))).filter((key) => recentKeys.has(key))).size;
    const latest = own.reduce((max, row) => Math.max(max, attendanceTime(row)), 0);
    return { employee, activeDays, latest };
  }).sort((a, b) => b.latest - a.latest || String(a.employee.name || '').localeCompare(String(b.employee.name || ''))), [employees, records, days]);

  return (
    <Card style={styles.panel}>
      <View style={styles.titleRow}>
        <View>
          <Text style={styles.eyebrow}>ИРЦИЙН ИДЭВХ</Text>
          <Text style={styles.title}>Нийт ажилтны график</Text>
        </View>
        <View style={styles.ratePill}><Text style={styles.rateText}>{activityRate}%</Text></View>
      </View>
      <View style={styles.metrics}>
        <View style={styles.metric}><Text style={styles.metricValue}>{totalEmployees}</Text><Text style={styles.metricLabel}>Нийт ажилтан</Text></View>
        <View style={styles.metric}><Text style={[styles.metricValue, { color: colors.success }]}>{todayCount}</Text><Text style={styles.metricLabel}>Өнөөдөр ирсэн</Text></View>
        <View style={styles.metric}><Text style={[styles.metricValue, { color: colors.warning }]}>{Math.max(0, totalEmployees - todayCount)}</Text><Text style={styles.metricLabel}>Ирцгүй</Text></View>
      </View>
      <View style={styles.chart}>
        {daily.map((day) => (
          <View key={day.key} style={styles.barColumn}>
            <Text style={styles.barValue}>{day.count}</Text>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { height: `${Math.max(day.count ? 10 : 2, day.count / maxCount * 100)}%` }]} />
            </View>
            <Text style={styles.barLabel}>{day.label}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.sectionLabel}>Ажилтан дээр дарж 30 хоногийн график харах</Text>
      {employeeRows.length ? employeeRows.map(({ employee, activeDays }) => (
        <TouchableOpacity key={employeeKey(employee)} style={styles.employeeRow} onPress={() => onSelectEmployee(employee)} activeOpacity={0.78}>
          <View style={styles.employeeAvatar}><Text style={styles.employeeLetter}>{String(employee.name || '?').charAt(0).toUpperCase()}</Text></View>
          <View style={{ flex: 1 }}><Text style={styles.employeeName}>{employee.name || 'Ажилтан'}</Text><Text style={styles.employeeMeta}>Сүүлийн 7 хоног · {activeDays} өдөр идэвхтэй</Text></View>
          <Text style={styles.employeeDays}>{activeDays}/7</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      )) : <Text style={styles.empty}>Ажилтны мэдээлэл алга.</Text>}
    </Card>
  );
}

function EmployeeAttendanceModal({ employee, records, onClose }) {
  const styles = useStyles(makeAnalyticsStyles);
  const { colors } = useTheme();
  const days = useMemo(() => recentDays(30), [employee?.id]);
  const own = useMemo(() => employee ? recordsForEmployee(records, employee) : [], [employee, records]);
  const daySet = useMemo(() => new Set(own.map((row) => localDayKey(attendanceTime(row)))), [own]);
  const remoteCount = own.filter((row) => row.is_remote).length;
  const wifiCount = own.filter((row) => row.wifi_verified).length;
  const last14 = days.slice(-14);
  return (
    <Modal visible={!!employee} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <View><Text style={styles.eyebrow}>АЖИЛТНЫ ИРЦ</Text><Text style={styles.modalTitle}>{employee?.name || 'Ажилтан'}</Text></View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}><Text style={styles.closeText}>×</Text></TouchableOpacity>
          </View>
          <View style={styles.metrics}>
            <View style={styles.metric}><Text style={[styles.metricValue, { color: colors.success }]}>{daySet.size}</Text><Text style={styles.metricLabel}>Ирсэн өдөр</Text></View>
            <View style={styles.metric}><Text style={styles.metricValue}>{own.length}</Text><Text style={styles.metricLabel}>Нийт check-in</Text></View>
            <View style={styles.metric}><Text style={[styles.metricValue, { color: colors.accent }]}>{remoteCount}</Text><Text style={styles.metricLabel}>Зайнаас</Text></View>
          </View>
          <Text style={styles.sectionLabel}>Сүүлийн 14 хоног</Text>
          <View style={styles.miniChart}>
            {last14.map((day) => {
              const active = daySet.has(day.key);
              return <View key={day.key} style={styles.miniColumn}><View style={[styles.miniBar, active && styles.miniBarActive]} /><Text style={styles.miniLabel}>{day.label.split('/')[1]}</Text></View>;
            })}
          </View>
          <View style={styles.summaryLine}><Text style={styles.summaryLabel}>GPS + Wi‑Fi баталгаатай</Text><Text style={styles.summaryValue}>{wifiCount}</Text></View>
          <View style={styles.summaryLine}><Text style={styles.summaryLabel}>Сүүлд бүртгэсэн</Text><Text style={styles.summaryValue}>{own.length ? new Date(Math.max(...own.map(attendanceTime))).toLocaleDateString('mn-MN') : '—'}</Text></View>
          <Button title="Хаах" variant="ghost" style={{ marginTop: spacing.lg }} onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const makeAnalyticsStyles = ({ colors }) => StyleSheet.create({
  panel:{marginTop:spacing.md,borderWidth:1,borderColor:colors.primary+'35'},
  titleRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  eyebrow:{color:colors.primary,fontSize:10,fontWeight:'900',letterSpacing:1.2},
  title:{color:colors.text,fontSize:18,fontWeight:'900',marginTop:3},
  ratePill:{minWidth:58,height:38,borderRadius:radius.full,backgroundColor:colors.primary+'18',alignItems:'center',justifyContent:'center'},
  rateText:{color:colors.primary,fontSize:16,fontWeight:'900'},
  metrics:{flexDirection:'row',gap:spacing.sm,marginTop:spacing.lg},
  metric:{flex:1,minHeight:68,borderRadius:radius.md,backgroundColor:colors.surfaceAlt,padding:spacing.sm,justifyContent:'center'},
  metricValue:{color:colors.text,fontSize:22,fontWeight:'900'},
  metricLabel:{color:colors.textMuted,fontSize:10,lineHeight:14,marginTop:2},
  chart:{height:150,flexDirection:'row',alignItems:'flex-end',gap:6,marginTop:spacing.lg,paddingTop:8},
  barColumn:{flex:1,height:'100%',alignItems:'center'},
  barValue:{color:colors.text,fontSize:10,fontWeight:'800',height:16},
  barTrack:{flex:1,width:'72%',borderRadius:8,backgroundColor:colors.surfaceAlt,overflow:'hidden',justifyContent:'flex-end'},
  barFill:{width:'100%',borderRadius:8,backgroundColor:colors.primary},
  barLabel:{color:colors.textMuted,fontSize:9,marginTop:5},
  sectionLabel:{color:colors.textMuted,fontSize:11,fontWeight:'800',marginTop:spacing.lg,marginBottom:spacing.sm},
  employeeRow:{minHeight:62,flexDirection:'row',alignItems:'center',gap:10,borderTopWidth:1,borderTopColor:colors.border},
  employeeAvatar:{width:36,height:36,borderRadius:18,backgroundColor:colors.primary+'18',alignItems:'center',justifyContent:'center'},
  employeeLetter:{color:colors.primary,fontWeight:'900'},employeeName:{color:colors.text,fontSize:14,fontWeight:'800'},employeeMeta:{color:colors.textMuted,fontSize:11,marginTop:2},
  employeeDays:{color:colors.primary,fontSize:12,fontWeight:'900'},chevron:{color:colors.textMuted,fontSize:24},empty:{color:colors.textMuted,fontSize:13,paddingVertical:spacing.md},
  modalOverlay:{flex:1,backgroundColor:'#000000bb',justifyContent:'flex-end'},modalSheet:{backgroundColor:colors.surface,borderTopLeftRadius:radius.xl,borderTopRightRadius:radius.xl,padding:spacing.xl,paddingBottom:32},
  modalHandle:{width:40,height:4,borderRadius:2,backgroundColor:colors.borderHi,alignSelf:'center',marginBottom:spacing.lg},modalHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},modalTitle:{color:colors.text,fontSize:23,fontWeight:'900',marginTop:3},
  closeButton:{width:38,height:38,borderRadius:19,backgroundColor:colors.surfaceAlt,alignItems:'center',justifyContent:'center'},closeText:{color:colors.text,fontSize:28,lineHeight:31},
  miniChart:{height:96,flexDirection:'row',alignItems:'flex-end',gap:4},miniColumn:{flex:1,alignItems:'center'},miniBar:{width:'100%',height:12,borderRadius:4,backgroundColor:colors.surfaceAlt},miniBarActive:{height:62,backgroundColor:colors.success},miniLabel:{color:colors.textMuted,fontSize:8,marginTop:4},
  summaryLine:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:spacing.md,borderBottomWidth:1,borderBottomColor:colors.border},summaryLabel:{color:colors.textMuted,fontSize:13},summaryValue:{color:colors.text,fontSize:13,fontWeight:'800'},
});

const makeStyles = ({ colors }) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  heroCard: { marginTop: spacing.lg },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  faceCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '800'},
  cardSub: { color: colors.textMuted, marginTop: 2, fontSize: 13 },
  btnRow: { flexDirection: 'row', gap: spacing.md },
  recordRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 50, height: 50, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  avatarEmpty: { alignItems: 'center', justifyContent: 'center'},
  recordName: { color: colors.text, fontSize: 15, fontWeight: '800'},
  recordDate: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  error: { color: colors.danger, marginBottom: spacing.sm },
  note: { color: colors.warning, fontSize: 12, marginBottom: spacing.sm },
  privacyText: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  geoHint: { color: colors.textMuted, fontSize: 12, marginTop: spacing.md, lineHeight: 17 },
  enrollHint: { color: colors.primary, fontSize: 12, marginTop: spacing.sm, lineHeight: 17, fontWeight: '600'},
  enrollBox: { marginTop: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primary + '35' },
  blockTitle: { color: colors.text, fontSize: 15, fontWeight: '800'},
  locHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  locName: { flex: 1, color: colors.text, fontWeight: '700', fontSize: 14 },
  locRadius: { color: colors.textMuted, fontSize: 13 },
  delete: { color: colors.danger, fontWeight: '700', fontSize: 13 },
  pendCard: { marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.accent + '55'},
  noteText: { color: colors.text, fontSize: 13, marginTop: 2 },
  tagRow: { flexDirection: 'row', gap: spacing.xs, marginTop: 4 },
  overlay: { flex: 1, backgroundColor: '#000000bb', justifyContent: 'flex-end'},
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    maxHeight: '88%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderHi,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  sheetTitle: { color: colors.text, fontSize: 19, fontWeight: '800', marginBottom: spacing.xs },
  sheetSub: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginBottom: spacing.lg },
  shiftLine: { color: colors.text, fontSize: 14, marginTop: spacing.sm, lineHeight: 20 },
  hoursTap: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hoursLabel: { color: colors.textMuted, fontSize: 12 },
  hoursValue: { color: colors.primary, fontSize: 28, fontWeight: '800', marginTop: 4 },
  hoursHint: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  hoursRowText: { color: colors.text, fontSize: 14 },
  hoursRowDur: { color: colors.textMuted, fontSize: 13, fontWeight: '700'},
  hoursTotalBox: { marginVertical: spacing.md, padding: spacing.md, backgroundColor: colors.surfaceAlt, borderRadius: radius.md },
  hoursTotalLine: { color: colors.textMuted, fontSize: 13 },
  hoursTotalNet: { color: colors.text, fontSize: 16, fontWeight: '800', marginTop: 4 },
  fieldLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '700', marginBottom: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipOn: { backgroundColor: colors.primary + '22', borderColor: colors.primary },
  chipText: { color: colors.textMuted, fontSize: 13, fontWeight: '600'},
  chipTextOn: { color: colors.primary },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
  },
  weekDay: { width: 56, color: colors.text, fontWeight: '800', fontSize: 13, paddingTop: spacing.lg },
  timeRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  restBadge: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  restRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  restRowOn: {
    borderColor: colors.accent,
    backgroundColor: colors.accent + '18',
  },
  restDayLabel: { color: colors.text, fontSize: 15, fontWeight: '700'},
  restDayLabelOn: { color: colors.accent },
  restStatus: { color: colors.textMuted, fontSize: 13, fontWeight: '600'},
  restStatusOn: { color: colors.accent, fontWeight: '800' },
});
