import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import NavIcon from '../components/NavIcon';
import { colors, spacing, radius, shadow } from '../theme';
import { roleLabel } from '../lib/roles';
import * as tracking from '../services/trackingService';
import * as vehicleApi from '../services/vehicleService';
import { countTodayCheckIns } from '../services/attendanceService';
import { formatTime, formatDate } from '../lib/formatTime';

const EMPLOYEE_MODULES = [
  { key: 'Inventory', label: 'Бараа авах', icon: 'inventory', color: colors.primary },
  { key: 'MyStock', label: 'Миний үлдэгдэл', icon: 'allocation', color: '#16a34a'},
  { key: 'Tools', label: 'Багаж авах', icon: 'tools', color: '#ea580c'},
  { key: 'MyTools', label: 'Миний багаж', icon: 'allocation', color: '#ca8a04'},
  { key: 'SiteWork', label: 'Ажлын байр', icon: 'location', color: '#059669'},
  { key: 'EmployeeDirectory', label: 'Ажилтны мэдээлэл', icon: 'employees', color: '#0d9488'},
  { key: 'Vehicle', label: 'Машин (код)', icon: 'vehicle', color: colors.warning },
  { key: 'Fuel', label: 'Бензин тооцоо', icon: 'fuel', color: colors.success },
  { key: 'Calls', label: 'Дуудлага', icon: 'calls', color: '#0891b2'},
  { key: 'Attendance', label: 'Ирц', icon: 'attendance', color: '#db2777'},
  { key: 'MyShift', label: 'Хуваарь харах', icon: 'clock', color: '#2563eb'},
  { key: 'EmployeeReport', label: 'Ажилтан тайлан', icon: 'report', color: '#1e3a5f'},
  { key: 'Chat', label: 'Чат', icon: 'chat', color: '#7c3aed'},
];

const ADMIN_MODULES = [
  { key: 'Employees', label: 'Ажилтан бүртгэх', icon: 'employees', color: colors.primary },
  { key: 'AdminReports', label: 'Тайлан', icon: 'report', color: '#1e3a5f'},
  { key: 'EmployeeDirectory', label: 'Ажилтны мэдээлэл', icon: 'employees', color: '#0d9488'},
  { key: 'SiteWork', label: 'Ажлын байр / баг', icon: 'location', color: '#059669'},
  { key: 'VehiclesAdmin', label: 'Машин / QR', icon: 'qr', color: colors.warning },
  { key: 'Live', label: 'Байршил хяналт', icon: 'location', color: colors.success },
  { key: 'Inventory', label: 'Бараа материал', icon: 'inventory', color: colors.primary },
  { key: 'Tools', label: 'Багаж', icon: 'tools', color: '#ea580c'},
  { key: 'ToolAllocation', label: 'Ажилтны үлдэгдэл', icon: 'allocation', color: colors.accent },
];

const ADMIN_KEYS = new Set(ADMIN_MODULES.map((m) => m.key));
/** Админ инженер биш — энэ модуль зөвхөн ажилтанд */
const ADMIN_HIDDEN_KEYS = new Set(['Calls']);

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Өглөөний мэнд';
  if (h < 18) return 'Өдрийн мэнд';
  return 'Оройн мэнд';
}

export default function HomeScreen() {
  const navigation = useNavigation();
  const { authProfile, profile, isAdmin, isSuperAdmin, isCloud, fetchEmployees } = useApp();
  const name = authProfile?.name || profile?.name || 'Ажилтан';

  const [stats, setStats] = useState({ employees: 0, online: 0, vehicles: 0, checkins: 0 });
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(tick);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!isAdmin || !isCloud) return;
      let active = true;
      (async () => {
        try {
          const [emps, workers, vehicles, checkins] = await Promise.all([
            fetchEmployees().catch(() => []),
            tracking.fetchWorkers().catch(() => []),
            vehicleApi.fetchVehicles().catch(() => []),
            countTodayCheckIns().catch(() => 0),
          ]);
          if (!active) return;
          const fiveMinAgo = Date.now() - 5 * 60 * 1000;
          const online = workers.filter(
            (w) => w.latitude != null && w.last_seen && new Date(w.last_seen).getTime() > fiveMinAgo
          ).length;
          setStats({ employees: emps.length, online, vehicles: vehicles.length, checkins });
        } catch (e) {}
      })();
      return () => {
        active = false;
      };
    }, [isAdmin, isCloud, fetchEmployees])
  );

  const dateStr = formatDate(now);

  const serviceModules = useMemo(
    () =>
      (isAdmin ? EMPLOYEE_MODULES.filter((m) => !ADMIN_KEYS.has(m.key) && !ADMIN_HIDDEN_KEYS.has(m.key)) : EMPLOYEE_MODULES),
    [isAdmin]
  );

  const go = (m) => {
    if (m.key === 'Vehicle') {
      navigation.navigate('Vehicle', { autoScan: true });
      return;
    }
    navigation.navigate(m.key);
  };

  const renderTile = (m, i) => (
    <TouchableOpacity
      key={`${m.key}-${i}`}
      style={styles.tile}
      activeOpacity={0.82}
      onPress={() => go(m)}
    >
      <View style={[styles.tileIcon, { backgroundColor: m.color + '14'}]}>
        <NavIcon name={m.icon} size={24} color={m.color} />
      </View>
      <Text style={styles.tileLabel} numberOfLines={2}>
        {m.label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>{greeting()},</Text>
            <Text style={styles.name}>{name}</Text>
            <View style={[styles.roleChip, isAdmin && styles.roleChipAdmin]}>
              <Text style={[styles.roleChipText, isAdmin && styles.roleChipTextAdmin]}>
                {roleLabel(authProfile?.role || (isAdmin ? 'admin' : 'employee'))}
              </Text>
            </View>
            <Text style={styles.date}>{dateStr}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.headerClock}>{formatTime(now)}</Text>
            <TouchableOpacity style={styles.avatar} onPress={() => navigation.navigate('Profile')}>
              {authProfile?.avatar_url ? (
                <Image source={{ uri: authProfile.avatar_url }} style={styles.avatarImg} />
              ) : (
                <Text style={styles.avatarLetter}>{name.charAt(0).toUpperCase()}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.clockCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.clockLabel}>Өнөөдрийн ирц</Text>
            <Text style={styles.clockSub}>Цаг бүртгэл хийх</Text>
          </View>
          <TouchableOpacity style={styles.clockBtn} onPress={() => navigation.navigate('Attendance')} activeOpacity={0.85}>
            <NavIcon name="clock" size={18} color="#fff"/>
            <Text style={styles.clockBtnText}>Цаг бүртгэх</Text>
          </TouchableOpacity>
        </View>

        {isAdmin ? (
          <>
            <View style={styles.adminHeaderRow}>
              <Text style={styles.sectionTitle}>Админ удирдлага</Text>
              <View style={styles.adminTag}>
                <Text style={styles.adminTagText}>{isSuperAdmin ? 'SUPER ADMIN' : 'ADMIN'}</Text>
              </View>
            </View>

            <View style={styles.statRow}>
              <Stat icon="employees" value={stats.employees} label="Ажилтан" color={colors.primary} />
              <Stat icon="online" value={stats.online} label="Online" color={colors.success} />
            </View>
            <View style={styles.statRow}>
              <Stat icon="attendance" value={stats.checkins} label="Өнөөдрийн ирц" color={colors.accent} />
              <Stat icon="vehicle" value={stats.vehicles} label="Машин" color={colors.warning} />
            </View>

            <TouchableOpacity style={styles.adminCta} activeOpacity={0.85} onPress={() => navigation.navigate('Employees')}>
              <View style={styles.adminCtaIcon}>
                <NavIcon name="employees" size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.adminCtaTitle}>Шинэ ажилтан бүртгэх</Text>
                <Text style={styles.adminCtaSub}>Имэйл + 1 удаагийн нууц үг үүсгэнэ</Text>
              </View>
              <Text style={styles.adminCtaArrow}>→</Text>
            </TouchableOpacity>

            <View style={styles.grid}>{ADMIN_MODULES.map(renderTile)}</View>
          </>
        ) : (
          <Text style={styles.welcomeSub}>Доорх үйлчилгээнүүдээс сонгон ажлаа үргэлжлүүлнэ үү.</Text>
        )}

        <Text style={styles.sectionTitle}>{isAdmin ? 'Ажилтны үйлчилгээ' : 'Үйлчилгээ'}</Text>
        <View style={styles.grid}>{serviceModules.map(renderTile)}</View>
      </ScrollView>
    </View>
  );
}

function Stat({ icon, value, label, color }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + '14'}]}>
        <NavIcon name={icon} size={20} color={color} />
      </View>
      <View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );
}

const TILE_GAP = spacing.md;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgAlt },
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', paddingTop: spacing.sm },
  headerRight: { alignItems: 'flex-end', gap: spacing.sm },
  headerClock: { color: colors.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  greeting: { color: colors.textMuted, fontSize: 14 },
  name: { color: colors.text, fontSize: 24, fontWeight: '800', marginTop: 2, letterSpacing: -0.3 },
  date: { color: colors.textMuted, fontSize: 13, marginTop: 4, textTransform: 'capitalize'},
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarImg: { width: '100%', height: '100%', borderRadius: 26 },
  avatarLetter: { color: colors.primary, fontSize: 22, fontWeight: '800'},
  body: { padding: spacing.lg, paddingBottom: 110 },
  clockCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
  },
  clockLabel: { color: colors.textMuted, fontSize: 13 },
  clockSub: { color: colors.text, fontSize: 15, fontWeight: '700', marginTop: 2 },
  clockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.success,
  },
  clockBtnText: { color: '#fff', fontWeight: '800'},
  welcomeSub: { color: colors.textMuted, fontSize: 14, lineHeight: 20, marginBottom: spacing.md },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '800', marginBottom: spacing.md, marginTop: spacing.sm },
  roleChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.bgAlt,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleChipAdmin: { backgroundColor: colors.primarySoft, borderColor: '#dbe4ff'},
  roleChipText: { color: colors.textMuted, fontSize: 12, fontWeight: '700'},
  roleChipTextAdmin: { color: colors.primary },
  adminHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  adminTag: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  adminTagText: { color: colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  statRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
  },
  statIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: { color: colors.text, fontSize: 22, fontWeight: '800'},
  statLabel: { color: colors.textMuted, fontSize: 12 },
  adminCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
  },
  adminCtaIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminCtaTitle: { color: colors.text, fontSize: 16, fontWeight: '800'},
  adminCtaSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  adminCtaArrow: { color: colors.primary, fontSize: 22, fontWeight: '800'},
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: TILE_GAP },
  tile: {
    width: '31%',
    aspectRatio: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
  },
  tileIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  tileLabel: { color: colors.text, fontSize: 12, fontWeight: '600', textAlign: 'center', lineHeight: 16 },
});
