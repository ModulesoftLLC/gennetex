import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Modal,
  ScrollView,
  Alert,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import QRCode from '../components/QRCode';
import { useApp } from '../context/AppContext';
import {
  Card,
  Button,
  Field,
  Badge,
  ScreenHeader,
  HeaderButton,
  EmptyState,
} from '../components/ui';
import { spacing, radius } from '../theme';
import { useTheme, useStyles } from '../context/ThemeContext';
import * as vehicleApi from '../services/vehicleService';

const EMPTY = { code: '', plate_number: '', liters_per_100km: '12', driver_name: '', driver_id: ''};

export default function VehiclesAdminScreen() {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const { isAdmin, isCloud, fetchEmployees } = useApp();
  const [list, setList] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [modal, setModal] = useState(false);
  const [qrItem, setQrItem] = useState(null);
  const [logsVisible, setLogsVisible] = useState(false);
  const [logs, setLogs] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!isCloud) return;
    try {
      const [veh, emps] = await Promise.all([
        vehicleApi.fetchVehicles(),
        fetchEmployees().catch(() => []),
      ]);
      setList(veh);
      setEmployees(emps);
    } catch (e) {
      setError(e.message);
    }
  }, [isCloud, fetchEmployees]);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    setForm({ ...EMPTY, code: vehicleApi.generateVehicleCode() });
    setError(null);
    setModal(true);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const openLogs = async () => {
    setLogsVisible(true);
    try {
      setLogs(await vehicleApi.fetchVehicleLogs());
    } catch (e) {
      setError(e.message);
    }
  };

  const handleCreate = async () => {
    if (!form.plate_number.trim()) {
      setError('Улсын дугаар оруулна уу.');
      return;
    }
    if (!form.code.trim()) {
      setError('Код хоосон байна.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const saved = await vehicleApi.insertVehicle(form);
      setForm(EMPTY);
      setModal(false);
      setList((prev) => [saved, ...prev]);
      setQrItem(saved); // үүсгэсэн даруй QR-г нээж харуулна
    } catch (e) {
      setError(mapError(e.message));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (item) => {
    Alert.alert('Устгах', `${item.plate_number} машиныг устгах уу?`, [
      { text: 'Болих', style: 'cancel'},
      {
        text: 'Устгах',
        style: 'destructive',
        onPress: async () => {
          try {
            await vehicleApi.deleteVehicle(item.id);
            setList((prev) => prev.filter((v) => v.id !== item.id));
          } catch (e) {
            Alert.alert('Алдаа', e.message);
          }
        },
      },
    ]);
  };

  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Машин удирдлага"/>
        <EmptyState text="Энэ хэсэг зөвхөн админд нээлттэй."/>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Машин удирдлага"
        subtitle={`${list.length} машин · QR үүсгэх`}
        right={
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <HeaderButton title="Логууд" onPress={openLogs} />
            <HeaderButton title="Нэмэх" onPress={openAdd} />
          </View>
        }
      />

      {!isCloud ? (
        <EmptyState text="Машин бүртгэхэд Supabase холбогдсон байх шаардлагатай."/>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(v) => v.id}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          renderItem={({ item }) => (
            <Card style={styles.row}>
              <View style={styles.plateBox}>
                <Text style={styles.plate}>{item.plate_number}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.code}>{item.code}</Text>
                <Text style={styles.sub}>
                  {item.liters_per_100km} л/100км · {item.driver_name || 'жолоочгүй'}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: spacing.xs }}>
                <TouchableOpacity onPress={() => setQrItem(item)}>
                  <Badge text="QR харах" color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={8}>
                  <Text style={styles.delete}>Устгах</Text>
                </TouchableOpacity>
              </View>
            </Card>
          )}
          ListEmptyComponent={<EmptyState text="Машин бүртгэгдээгүй байна."/>}
        />
      )}

      {/* Нэмэх modal */}
      <Modal visible={modal} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.title}>Шинэ машин нэмэх</Text>
              <Field
                label="Улсын дугаар"
                placeholder="Ж: 1234 УБА"
                value={form.plate_number}
                onChangeText={(t) => setForm({ ...form, plate_number: t })}
              />
              <Field
                label="100км-т зарцуулах литр"
                keyboardType="numeric"
                value={form.liters_per_100km}
                onChangeText={(t) => setForm({ ...form, liters_per_100km: t })}
              />
              <Text style={styles.pickLabel}>Анхны жолооч (сонголтоор — QR уншсан ажилтнаар автоматаар солигдоно)</Text>
              {employees.length === 0 ? (
                <Text style={styles.pickHint}>Ажилтан олдсонгүй. Эхлээд ажилтан бүртгэнэ үү.</Text>
              ) : (
                <View style={styles.pickWrap}>
                  {employees.map((e) => (
                    <TouchableOpacity
                      key={e.id}
                      style={[styles.pickBtn, form.driver_id === e.id && styles.pickBtnActive]}
                      onPress={() => setForm({ ...form, driver_id: e.id, driver_name: e.name })}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.pickText, form.driver_id === e.id && styles.pickTextActive]}>{e.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <Field
                label="QR код (автоматаар үүссэн)"
                autoCapitalize="characters"
                value={form.code}
                onChangeText={(t) => setForm({ ...form, code: t })}
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <View style={styles.actions}>
                <Button title="Болих" variant="ghost" style={{ flex: 1 }} onPress={() => setModal(false)} />
                <Button
                  title={saving ? '...' : 'Үүсгэх + QR'}
                  style={{ flex: 1 }}
                  onPress={handleCreate}
                  disabled={saving}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Машины логууд modal */}
      <Modal visible={logsVisible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.title}>Машины логууд</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
              {logs.length === 0 ? (
                <EmptyState text="Лог алга байна."/>
              ) : (
                logs.map((l) => (
                  <View key={l.id} style={styles.logRow}>
                    <Text style={styles.logIcon}>{eventMeta(l.event).icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.logName}>
                        {l.user_name || 'Ажилтан'} · {l.plate_number || l.code || '—'}
                      </Text>
                      <Text style={styles.logSub}>
                        {eventMeta(l.event).label}
                        {l.event === 'trip_end'&& l.distance_km != null
                          ? ` · ${Number(l.distance_km).toFixed(1)}км`
                          : ''}
                      </Text>
                    </View>
                    <Text style={styles.logTime}>
                      {new Date(l.created_at).toLocaleString('mn-MN', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
            <Button title="Хаах" variant="ghost" onPress={() => setLogsVisible(false)} style={{ marginTop: spacing.md }} />
          </View>
        </View>
      </Modal>

      {/* QR харуулах modal */}
      <Modal visible={!!qrItem} transparent animationType="fade">
        <View style={styles.qrOverlay}>
          <View style={styles.qrCard}>
            {qrItem && (
              <>
                <Text style={styles.qrPlate}>{qrItem.plate_number}</Text>
                <Text style={styles.qrCode}>{qrItem.code}</Text>
                <View style={styles.qrBox}>
                  <QRCode value={qrItem.code} size={340} />
                </View>
                <Text style={styles.qrInfo}>
                  {qrItem.liters_per_100km} л/100км
                  {qrItem.driver_name ? ` · ${qrItem.driver_name}` : ''}
                </Text>
                <Text style={styles.qrHint}>
                  Энэ QR-г хэвлээд машин дээр наана. Ажилтан уншиж аялал эхлүүлнэ.
                </Text>
                <Button title="Хаах" variant="ghost" onPress={() => setQrItem(null)} style={{ marginTop: spacing.md }} />
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function mapError(msg = '') {
  if (/duplicate|unique/i.test(msg)) return 'Энэ код давхардаж байна. Өөр код оруулна уу.';
  return msg;
}

function eventMeta(event) {
  switch (event) {
    case 'scan' :
      return { icon: '', label: 'QR уншсан (жолооч боллоо)'};
    case 'trip_start' :
      return { icon: '', label: 'Аялал эхлүүлсэн'};
    case 'trip_end' :
      return { icon: '', label: 'Аялал дуусгасан'};
    default:
      return { icon: '', label: event || 'Үйлдэл'};
  }
}

const makeStyles = ({ colors }) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  plateBox: {
    backgroundColor: colors.bgAlt,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  plate: { color: colors.text, fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },
  code: { color: colors.text, fontSize: 15, fontWeight: '800'},
  sub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  delete: { color: colors.danger, fontSize: 12, fontWeight: '700'},
  overlay: { flex: 1, backgroundColor: '#000000bb', justifyContent: 'flex-end'},
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    maxHeight: '90%',
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderHi, alignSelf: 'center', marginBottom: spacing.lg },
  title: { color: colors.text, fontSize: 20, fontWeight: '800', marginBottom: spacing.lg },
  pickLabel: { color: colors.textMuted, fontSize: 13, fontWeight: '600', marginBottom: spacing.sm },
  pickHint: { color: colors.textFaint, fontSize: 12, fontStyle: 'italic', marginBottom: spacing.md },
  pickWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  pickBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickBtnActive: { backgroundColor: colors.primary + '22', borderColor: colors.primary },
  pickText: { color: colors.textMuted, fontSize: 13, fontWeight: '700'},
  pickTextActive: { color: colors.primary },
  error: { color: colors.danger, marginBottom: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  qrOverlay: { flex: 1, backgroundColor: '#000000cc', alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  qrCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 420,
  },
  qrPlate: { color: colors.text, fontSize: 24, fontWeight: '900', letterSpacing: 1 },
  qrCode: { color: colors.textMuted, fontSize: 14, marginTop: 2, marginBottom: spacing.lg },
  qrBox: { backgroundColor: '#fff', padding: spacing.lg, borderRadius: radius.md },
  qrInfo: { color: colors.text, fontSize: 14, fontWeight: '700', marginTop: spacing.lg },
  qrHint: { color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: spacing.sm, lineHeight: 18 },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  logIcon: { fontSize: 20 },
  logName: { color: colors.text, fontSize: 14, fontWeight: '700' },
  logSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  logTime: { color: colors.textFaint, fontSize: 11 },
});
