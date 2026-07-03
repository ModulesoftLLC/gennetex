import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Platform,
  Linking,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import MapView, { Marker, PROVIDER_GOOGLE } from '../components/Map';
import { useApp } from '../context/AppContext';
import { Card, Button, Badge, ScreenHeader, EmptyState } from '../components/ui';
import { CALL_TYPES } from '../data/mockData';
import { colors, spacing, radius } from '../theme';

const UB_REGION = {
  latitude: 47.9185,
  longitude: 106.9176,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

const STATUS_COLORS = {
  'Хүлээгдэж буй' : colors.warning,
  'Явж байгаа' : colors.primary,
  'Дууссан' : colors.success,
};

function typeMeta(key) {
  return CALL_TYPES.find((t) => t.key === key) || CALL_TYPES[CALL_TYPES.length - 1];
}

export default function CallsMapScreen() {
  const { calls, updateCallStatus, refreshCalls, isCloud, isAdmin, currentUser } = useApp();
  const [selected, setSelected] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (isAdmin || !isCloud) return;
      setLoading(true);
      refreshCalls()
        .catch(() => {})
        .finally(() => setLoading(false));
    }, [isAdmin, isCloud, refreshCalls])
  );

  const filtered = useMemo(
    () => calls.filter((c) => typeFilter === 'all' || (c.type || 'other') === typeFilter),
    [calls, typeFilter]
  );

  const openInGoogleMaps = (call) => {
    const url = Platform.select({
      ios: `maps://?q=${call.latitude},${call.longitude}`,
      android: `geo:${call.latitude},${call.longitude}?q=${call.latitude},${call.longitude}(${encodeURIComponent(call.customer)})`,
      default: `https://www.google.com/maps/search/?api=1&query=${call.latitude},${call.longitude}`,
    });
    Linking.openURL(url).catch(() => {});
  };

  const pending = filtered.filter((c) => c.status !== 'Дууссан').length;

  if (isAdmin) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Инженерүүдийн дуудлага"/>
        <EmptyState text="Дуудлага бүртгэхийг админ вэб (admin-web) хэсгээс хийнэ. Энэ дэлгэц зөвхөн инженерүүдэд зориулагдсан."/>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Миний дуудлага"
        subtitle={loading ? 'Шинэчилж байна...' : `${filtered.length} дуудлага · ${pending} хүлээгдэж буй`}
      />

      {!isCloud ? (
        <EmptyState text="Дуудлага хүлээн авахын тулд Supabase холболт шаардлагатай."/>
      ) : (
        <>
          <View style={styles.filterWrap}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              <Chip label="Бүгд" active={typeFilter === 'all'} onPress={() => setTypeFilter('all')} />
              {CALL_TYPES.map((t) => (
                <Chip
                  key={t.key}
                  label={`${t.label}`}
                  color={t.color}
                  active={typeFilter === t.key}
                  onPress={() => setTypeFilter(t.key)}
                />
              ))}
            </ScrollView>
          </View>

          {filtered.length === 0 ? (
            <EmptyState text={`${currentUser?.name || 'Танд'} оноогдсон дуудлага алга. Админ шинэ дуудлага оноох хүртэл хүлээнэ үү.`} />
          ) : (
            <>
              <MapView
                style={styles.map}
                provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                initialRegion={UB_REGION}
              >
                {filtered.filter((c) => c.latitude != null && c.longitude != null).map((call) => (
                  <Marker
                    key={call.id}
                    coordinate={{ latitude: call.latitude, longitude: call.longitude }}
                    title={`${call.customer}`}
                    description={typeMeta(call.type).label}
                    pinColor={typeMeta(call.type).color}
                    onCalloutPress={() => setSelected(call)}
                    onPress={() => setSelected(call)}
                  />
                ))}
              </MapView>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.listRow}>
                {filtered.map((call) => {
                  const tm = typeMeta(call.type);
                  return (
                    <TouchableOpacity key={call.id} onPress={() => setSelected(call)}>
                      <Card style={styles.miniCard}>
                        <View style={styles.miniTop}>
                          <Badge text={`${tm.label}`} color={tm.color} />
                          <Badge text={call.status} color={STATUS_COLORS[call.status] || colors.danger} />
                        </View>
                        <Text style={styles.miniName}>{call.customer}</Text>
                        <Text style={styles.miniProblem} numberOfLines={1}>
                          {call.problem}
                        </Text>
                        <Text style={styles.miniAddr} numberOfLines={1}>
                          {call.address}
                        </Text>
                      </Card>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          )}
        </>
      )}

      <Modal visible={!!selected} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selected && (
              <>
                <Text style={styles.modalTitle}>{selected.customer}</Text>
                <View style={styles.badgeRow}>
                  <Badge
                    text={`${typeMeta(selected.type).label}`}
                    color={typeMeta(selected.type).color}
                  />
                  <Badge text={selected.status} color={STATUS_COLORS[selected.status] || colors.danger} />
                </View>
                <Text style={styles.detail}>{selected.phone || '—'}</Text>
                <Text style={styles.detail}>{selected.address}</Text>
                <Text style={styles.detail}>{selected.problem}</Text>

                <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
                  {selected.phone ? (
                    <Button title="Залгах" variant="success" onPress={() => Linking.openURL(`tel:${selected.phone}`)} />
                  ) : null}
                  <Button title="Google Maps-аар чиглүүлэх" onPress={() => openInGoogleMaps(selected)} />
                  <View style={styles.statusBtns}>
                    <Button
                      title="Явж байгаа"
                      variant="ghost"
                      style={{ flex: 1 }}
                      onPress={async () => {
                        await updateCallStatus(selected.id, 'Явж байгаа');
                        setSelected({ ...selected, status: 'Явж байгаа'});
                      }}
                    />
                    <Button
                      title="Дууссан"
                      variant="success"
                      style={{ flex: 1 }}
                      onPress={async () => {
                        await updateCallStatus(selected.id, 'Дууссан');
                        setSelected({ ...selected, status: 'Дууссан'});
                      }}
                    />
                  </View>
                  <Button title="Хаах" variant="ghost" onPress={() => setSelected(null)} />
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Chip({ label, active, color, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && (color ? { backgroundColor: color, borderColor: color } : styles.chipActive)]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  map: { flex: 1 },
  filterWrap: { paddingVertical: spacing.sm, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  chipRow: { paddingHorizontal: spacing.md, gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textMuted, fontSize: 13, fontWeight: '700'},
  chipTextActive: { color: '#fff'},
  listRow: { padding: spacing.md, gap: spacing.md },
  miniCard: { width: 230, marginBottom: 0 },
  miniTop: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap'},
  miniName: { color: colors.text, fontSize: 16, fontWeight: '800', marginTop: spacing.sm },
  miniProblem: { color: colors.textMuted, marginTop: 2 },
  miniAddr: { color: colors.textFaint, fontSize: 12, marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: '#000000bb', justifyContent: 'center', padding: spacing.lg },
  modalContent: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl, maxHeight: '85%'},
  modalTitle: { color: colors.text, fontSize: 20, fontWeight: '800', marginBottom: spacing.md },
  badgeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  detail: { color: colors.text, fontSize: 15, marginTop: spacing.sm },
  statusBtns: { flexDirection: 'row', gap: spacing.sm },
});
