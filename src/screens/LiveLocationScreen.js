import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Circle, Marker, PROVIDER_GOOGLE } from '../components/Map';
import { Badge, ScreenHeader, EmptyState } from '../components/ui';
import { useApp } from '../context/AppContext';
import { CALL_TYPES } from '../data/mockData';
import { spacing, radius } from '../theme';
import { useTheme, useStyles } from '../context/ThemeContext';
import * as tracking from '../services/trackingService';

function callTypeLabel(key) {
  const t = CALL_TYPES.find((x) => x.key === key);
  return t ? `${t.label}` : null;
}

function initials(name) {
  if (!name) return ' ?';
  return name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

const UB_REGION = {
  latitude: 47.9185,
  longitude: 106.9176,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4'];
const ONLINE_MS = 5 * 60 * 1000;
const isValidCoordinate = (w) => Number.isFinite(Number(w?.latitude))
  && Number.isFinite(Number(w?.longitude))
  && Math.abs(Number(w.latitude)) <= 90
  && Math.abs(Number(w.longitude)) <= 180;
const timestampMs = (value) => value?.toMillis?.() ?? new Date(value || 0).getTime();

function timeAgo(ts) {
  if (!ts) return 'мэдээлэлгүй';
  const diff = Date.now() - timestampMs(ts);
  if (!Number.isFinite(diff)) return 'хугацаа тодорхойгүй';
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'дөнгөж сая';
  if (m < 60) return `${m} мин өмнө`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} цаг өмнө`;
  return `${Math.floor(h / 24)} өдөр өмнө`;
}

function WorkerMarker({ worker, color, visit, onPress }) {
  const styles = useStyles(makeStyles);
  const [tracks, setTracks] = useState(!!worker.avatar_url);

  return (
    <Marker
      coordinate={{ latitude: worker.latitude, longitude: worker.longitude }}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={tracks}
      title={worker.name || 'Ажилтан'}
      description={
        visit
          ? ` ${visit.customer || 'Айл'}${visit.problem ? '· ' + visit.problem : ''}`
          : timeAgo(worker.last_seen)
      }
      onPress={onPress}
    >
      <View style={[styles.marker, { borderColor: color }]}>
        {worker.avatar_url ? (
          <Image
            source={{ uri: worker.avatar_url }}
            style={styles.markerImg}
            onLoad={() => setTracks(false)}
            onError={() => setTracks(false)}
          />
        ) : (
          <View style={[styles.markerFallback, { backgroundColor: color }]}>
            <Text style={styles.markerInitials}>{initials(worker.name)}</Text>
          </View>
        )}
      </View>
    </Marker>
  );
}

export default function LiveLocationScreen() {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const { isCloud, isAdmin, trackingState, authProfile, profile } = useApp();
  const [workers, setWorkers] = useState([]);
  const [visits, setVisits] = useState([]);
  const [tab, setTab] = useState('workers'); // workers | visits
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapType, setMapType] = useState('standard');
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const mapRef = useRef(null);

  const load = async () => {
    if (!isCloud) return;
    try {
      const viewerRole = authProfile?.role || profile?.role || (isAdmin ? 'admin' : 'employee');
      const [w, v] = await Promise.all([tracking.fetchWorkers(viewerRole), tracking.fetchVisitLogs()]);
      setWorkers(w);
      setVisits(v);
      setError(null);
    } catch (e) {
      setError(e?.message || 'Байршлын мэдээлэл ачаалж чадсангүй');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    if (!isCloud) return;
    const unsub = tracking.subscribeWorkers(() => load());
    const timer = setInterval(load, 20000);
    return () => {
      unsub?.();
      clearInterval(timer);
    };
  }, [isCloud, authProfile?.role, profile?.role, isAdmin]);

  // Ажилтан бүрийн хамгийн сүүлд очсон айл (visits нь arrived_at-аар буурахаар эрэмбэлэгдсэн)
  const latestVisitByUser = useMemo(() => {
    const map = {};
    for (const v of visits) {
      if (v.user_id && !map[v.user_id]) map[v.user_id] = v;
    }
    return map;
  }, [visits]);

  const located = workers
    .filter(isValidCoordinate)
    .map((w, i) => ({ ...w, latitude: Number(w.latitude), longitude: Number(w.longitude), color: COLORS[i % COLORS.length], visit: latestVisitByUser[w.id], online: Date.now() - timestampMs(w.last_seen) <= ONLINE_MS }));
  const onlineCount = located.filter((w) => w.online).length;
  const visibleWorkers = onlineOnly ? located.filter((w) => w.online) : located;
  const selectedWorker = located.find((w) => w.id === selectedId) || null;

  const fitWorkers = () => {
    if (!mapReady || !visibleWorkers.length) return;
    if (visibleWorkers.length === 1) {
      mapRef.current?.animateToRegion?.({ latitude: visibleWorkers[0].latitude, longitude: visibleWorkers[0].longitude, latitudeDelta: 0.006, longitudeDelta: 0.006 }, 450);
      return;
    }
    mapRef.current?.fitToCoordinates?.(visibleWorkers.map(({ latitude, longitude }) => ({ latitude, longitude })), {
      edgePadding: { top: 70, right: 45, bottom: 250, left: 45 }, animated: true,
    });
  };

  useEffect(() => { fitWorkers(); }, [mapReady, onlineOnly, located.map((w) => `${w.id}:${w.latitude}:${w.longitude}`).join('|')]);

  return (
    <View style={styles.container}>
      <ScreenHeader title={isAdmin ? 'Ажилчдын хяналт' : 'Байршил'}
        subtitle={`Firebase · ${onlineCount} online · ${located.length} байршилтай`}
        right={
          <Badge
            text={trackingState?.active ? 'Илгээж байна' : 'Идэвхгүй'}
            color={trackingState?.active ? colors.success : colors.textFaint}
          />
        }
      />

      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        mapType={mapType}
        initialRegion={UB_REGION}
        showsUserLocation
        showsMyLocationButton
        showsCompass
        showsScale
        showsTraffic
        showsBuildings
        showsIndoors
        toolbarEnabled
        loadingEnabled
        onMapReady={() => setMapReady(true)}
      >
        {selectedWorker && Number(selectedWorker.location_accuracy) > 0 ? <Circle
          center={{ latitude: selectedWorker.latitude, longitude: selectedWorker.longitude }}
          radius={Math.max(5, Number(selectedWorker.location_accuracy))}
          strokeColor={colors.primary + 'CC'}
          fillColor={colors.primary + '24'}
          strokeWidth={2}
        /> : null}
        {visibleWorkers.map((w) => (
          <WorkerMarker
            key={w.id}
            worker={w}
            color={w.color}
            visit={w.visit}
            onPress={() => { setSelectedId(w.id); mapRef.current?.animateToRegion?.({
              latitude: w.latitude,
              longitude: w.longitude,
              latitudeDelta: 0.004,
              longitudeDelta: 0.004,
            }, 400); }}
          />
        ))}
      </MapView>

      <TouchableOpacity style={styles.fitButton} onPress={fitWorkers} activeOpacity={0.85}>
        <Text style={styles.fitButtonText}>Бүгдийг харах</Text>
      </TouchableOpacity>
      <View style={styles.mapTools}>
        <TouchableOpacity style={[styles.mapTool, mapType === 'satellite' && styles.mapToolActive]} onPress={() => setMapType((value) => value === 'standard' ? 'satellite' : 'standard')} accessibilityLabel="Газрын зургийн төрлийг солих">
          <Ionicons name="layers-outline" size={20} color={mapType === 'satellite' ? '#fff' : colors.text} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.mapTool, onlineOnly && styles.mapToolActive]} onPress={() => setOnlineOnly((value) => !value)} accessibilityLabel="Зөвхөн онлайн ажилтан">
          <Ionicons name="pulse-outline" size={20} color={onlineOnly ? '#fff' : colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.panel}>
        {loading ? (
          <View style={styles.stateRow}><ActivityIndicator color={colors.primary} /><Text style={styles.note}>Байршил ачаалж байна...</Text></View>
        ) : error ? (
          <TouchableOpacity style={styles.errorCard} onPress={load}><Text style={styles.errorText}>{error}</Text><Text style={styles.retryText}>Дахин оролдох</Text></TouchableOpacity>
        ) : !isCloud ? (
          <Text style={styles.note}>
            Firebase холболтгүй тул бусад ажилчдын байршил харагдахгүй.
          </Text>
        ) : (
          <>
            <View style={styles.tabs}>
              <Tab active={tab === 'workers'} label={`Ажилчид (${located.length})`} onPress={() => setTab('workers')} />
              <Tab active={tab === 'visits'} label={`Очсон лог (${visits.length})`} onPress={() => setTab('visits')} />
            </View>

            {selectedWorker ? <View style={styles.locationDetail}>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailName}>{selectedWorker.name || 'Ажилтан'}</Text>
                <Text style={styles.detailMeta}>Нарийвчлал ±{Math.round(Number(selectedWorker.location_accuracy) || 0)}м · Хурд {Math.max(0, (Number(selectedWorker.location_speed) || 0) * 3.6).toFixed(1)} км/ц</Text>
                <Text style={styles.detailMeta}>Чиглэл {Math.round(Number(selectedWorker.location_heading) || 0)}° · {selectedWorker.location_source === 'background' ? 'Background GPS' : 'Live GPS'} · {timeAgo(selectedWorker.last_seen)}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedId(null)} style={styles.detailClose}><Ionicons name="close" size={18} color={colors.textMuted}/></TouchableOpacity>
            </View> : null}

            <ScrollView style={{ maxHeight: 220 }}>
              {tab === 'workers' ? (
                located.length === 0 ? (
                  <EmptyState text="Байршлаа илгээсэн ажилтан алга."/>
                ) : (
                  located.map((w) => (
                    <TouchableOpacity
                      key={w.id}
                      style={styles.row}
                      activeOpacity={0.7}
                      onPress={() => { setSelectedId(w.id); mapRef.current?.animateToRegion?.({
                        latitude: w.latitude,
                        longitude: w.longitude,
                        latitudeDelta: 0.004,
                        longitudeDelta: 0.004,
                      }, 400); }}
                    >
                      <View style={[styles.rowAvatar, { borderColor: w.color }]}>
                        {w.avatar_url ? (
                          <Image source={{ uri: w.avatar_url }} style={styles.rowAvatarImg} />
                        ) : (
                          <View style={[styles.markerFallback, { backgroundColor: w.color }]}>
                            <Text style={styles.markerInitials}>{initials(w.name)}</Text>
                          </View>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={styles.nameLine}><View style={[styles.onlineDot, { backgroundColor: w.online ? colors.success : colors.textFaint }]} /><Text style={styles.rowName}>{w.name || 'Нэргүй'}</Text></View>
                        {w.visit ? (
                          <Text style={styles.rowActivity} numberOfLines={1}>
                             {w.visit.customer || 'Айл'}
                            {callTypeLabel(w.visit.call_type) ? ` · ${callTypeLabel(w.visit.call_type)}` : ''}
                            {w.visit.problem ? ` · ${w.visit.problem}` : ''}
                          </Text>
                        ) : (
                          <Text style={styles.rowSub}>
                            {w.latitude.toFixed(4)}, {w.longitude.toFixed(4)}
                          </Text>
                        )}
                      </View>
                      <Text style={styles.rowTime}>{timeAgo(w.last_seen)}</Text>
                    </TouchableOpacity>
                  ))
                )
              ) : visits.length === 0 ? (
                <EmptyState text="Очсон бүртгэл алга." />
              ) : (
                visits.map((v) => (
                  <View key={v.id} style={styles.row}>
                    <Text style={{ fontSize: 18, marginRight: spacing.sm }}></Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowName}>{v.customer || 'Айл'}</Text>
                      <Text style={styles.rowSub}>
                         {v.user_name}
                        {callTypeLabel(v.call_type) ? ` · ${callTypeLabel(v.call_type)}` : ''}
                        {v.problem ? ` · ${v.problem}` : ''}
                      </Text>
                    </View>
                    <Text style={styles.rowTime}>{timeAgo(v.arrived_at)}</Text>
                  </View>
                ))
              )}
            </ScrollView>
          </>
        )}
      </View>
    </View>
  );
}

function Tab({ active, label, onPress }) {
  const styles = useStyles(makeStyles);
  return (
    <TouchableOpacity
      style={[styles.tab, active && styles.tabActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const makeStyles = ({ colors, shadow }) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  map: { flex: 1 },
  panel: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    marginTop: -radius.xl,
    ...shadow.md,
  },
  fitButton: { position: 'absolute', right: 16, top: 86, backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: colors.border, ...shadow.md },
  fitButtonText: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  mapTools: { position: 'absolute', right: 16, top: 132, gap: 8 },
  mapTool: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', ...shadow.md },
  mapToolActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  stateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  errorCard: { padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.danger + '12', borderWidth: 1, borderColor: colors.danger + '35' },
  errorText: { color: colors.danger, textAlign: 'center', fontSize: 13 },
  retryText: { color: colors.primary, textAlign: 'center', fontWeight: '800', marginTop: 6 },
  note: { color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.md },
  tabs: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  locationDetail: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primary + '55', borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  detailName: { color: colors.text, fontSize: 14, fontWeight: '800', marginBottom: 4 },
  detailMeta: { color: colors.textMuted, fontSize: 11, lineHeight: 17 },
  detailClose: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { color: colors.textMuted, fontWeight: '700', fontSize: 13 },
  tabTextActive: { color: '#fff'},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: spacing.md },
  rowName: { color: colors.text, fontSize: 15, fontWeight: '700'},
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  onlineDot: { width: 8, height: 8, borderRadius: 4 },
  rowSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  rowActivity: { color: colors.primary, fontSize: 12, marginTop: 2, fontWeight: '600'},
  rowTime: { color: colors.textFaint, fontSize: 11 },
  rowAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    marginRight: spacing.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
  },
  rowAvatarImg: { width: '100%', height: '100%', resizeMode: 'cover'},
  marker: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    ...shadow.md,
  },
  markerImg: { width: '100%', height: '100%', resizeMode: 'cover'},
  markerFallback: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center'},
  markerInitials: { color: '#fff', fontWeight: '900', fontSize: 14 },
});
