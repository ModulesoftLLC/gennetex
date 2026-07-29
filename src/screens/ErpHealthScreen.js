import React, { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Card, ScreenHeader } from '../components/ui';
import { useTheme, useStyles } from '../context/ThemeContext';
import { radius, spacing } from '../theme';
import { analyzeErpHealth } from '../services/erpHealthService';

const LABEL = { critical: 'Яаралтай', warning: 'Анхаарах', info: 'Мэдээлэл' };

export default function ErpHealthScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const load = useCallback(async () => {
    setLoading(true);
    try { setReport(await analyzeErpHealth()); setError(null); }
    catch (e) { setError(e?.message || 'Системийн шалгалт амжилтгүй'); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return <View style={styles.container}>
    <ScreenHeader title="ERP Health Center" subtitle="Firebase өгөгдөл ба sync-ийн автомат хяналт" />
    <ScrollView contentContainerStyle={styles.body} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}>
      {loading && !report ? <ActivityIndicator color={colors.primary} size="large" /> : null}
      {error ? <Card><Text style={styles.error}>{error}</Text><TouchableOpacity onPress={load}><Text style={styles.link}>Дахин шалгах</Text></TouchableOpacity></Card> : null}
      {report ? <>
        <Card style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>Системийн эрүүл мэнд</Text>
          <Text style={[styles.score, { color: report.status === 'critical' ? colors.danger : report.status === 'warning' ? colors.warning : colors.success }]}>{report.score}</Text>
          <Text style={styles.scoreUnit}>/ 100 · {report.issues.length ? `${report.issues.length} төрлийн асуудал` : 'Бүх шалгалт хэвийн'}</Text>
        </Card>
        <View style={styles.counts}>{Object.entries(report.counts).map(([key, value]) => <View key={key} style={styles.count}><Text style={styles.countValue}>{value}</Text><Text style={styles.countLabel}>{key}</Text></View>)}</View>
        {report.issues.length ? report.issues.map((row) => {
          const color = row.severity === 'critical' ? colors.danger : row.severity === 'warning' ? colors.warning : colors.primary;
          return <TouchableOpacity key={row.id} activeOpacity={0.82} onPress={() => row.target && navigation.navigate(row.target)}>
            <Card style={[styles.issue, { borderLeftColor: color }]}>
              <View style={styles.issueTop}><Text style={[styles.severity, { color }]}>{LABEL[row.severity]}</Text><Text style={[styles.issueCount, { color }]}>{row.count}</Text></View>
              <Text style={styles.issueTitle}>{row.title}</Text><Text style={styles.issueDetail}>{row.detail}</Text>
              {row.target ? <Text style={styles.open}>Засах хэсэг рүү орох →</Text> : null}
            </Card>
          </TouchableOpacity>;
        }) : <Card><Text style={styles.healthy}>✓ Одоогоор илэрсэн асуудал алга.</Text></Card>}
      </> : null}
    </ScrollView>
  </View>;
}

const makeStyles = ({ colors, shadow }) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background }, body: { padding: spacing.lg, paddingBottom: 48 },
  scoreCard: { alignItems: 'center', paddingVertical: spacing.xl, ...shadow.md }, scoreLabel: { color: colors.textMuted, fontWeight: '700' },
  score: { fontSize: 56, fontWeight: '900', letterSpacing: -2, marginTop: 4 }, scoreUnit: { color: colors.textMuted, fontSize: 13 },
  counts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md }, count: { minWidth: '30%', flexGrow: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12 },
  countValue: { color: colors.text, fontSize: 20, fontWeight: '900' }, countLabel: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  issue: { borderLeftWidth: 4 }, issueTop: { flexDirection: 'row', justifyContent: 'space-between' }, severity: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase' }, issueCount: { fontSize: 18, fontWeight: '900' },
  issueTitle: { color: colors.text, fontSize: 16, fontWeight: '800', marginTop: 4 }, issueDetail: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: 4 }, open: { color: colors.primary, fontWeight: '800', marginTop: 10, fontSize: 12 },
  error: { color: colors.danger, textAlign: 'center' }, link: { color: colors.primary, fontWeight: '800', textAlign: 'center', marginTop: 10 }, healthy: { color: colors.success, fontSize: 15, fontWeight: '800', textAlign: 'center' },
});
