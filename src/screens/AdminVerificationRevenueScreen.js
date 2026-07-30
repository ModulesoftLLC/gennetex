import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenHeader } from '../components/ui';
import { useTheme } from '../context/ThemeContext';
import { getVerificationRevenue } from '../services/employeeAuthService';

export default function AdminVerificationRevenueScreen() {
  const { colors } = useTheme(); const [data, setData] = useState(null); const [error, setError] = useState(''); const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { setLoading(true); try { setData(await getVerificationRevenue()); setError(''); } catch (e) { setError(e.message); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);
  return <View style={[styles.root, { backgroundColor: colors.background }]}><ScreenHeader title="Таны орлого" subtitle="verify.mn 2FA тайлан" back/><ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={load}/>} contentContainerStyle={styles.content}>
    {loading && !data ? <ActivityIndicator color={colors.primary}/> : <View style={styles.grid}><View style={[styles.card,{backgroundColor:colors.surface,borderColor:colors.border}]}><Text style={[styles.label,{color:colors.textMuted}]}>Миний орлого</Text><Text style={[styles.value,{color:colors.success}]}>{Number(data?.revenueMnt || 0).toLocaleString()}₮</Text><Text style={{color:colors.textFaint}}>Амжилттай: {data?.successful || 0}</Text></View><View style={[styles.card,{backgroundColor:colors.surface,borderColor:colors.border}]}><Text style={[styles.label,{color:colors.textMuted}]}>Хүсэлт амжилтгүй</Text><Text style={[styles.value,{color:colors.danger}]}>{data?.failed || 0}</Text><Text style={{color:colors.textFaint}}>Expired / Cancelled / Error</Text></View></View>}
    {!!error && <Text style={{ color: colors.danger, marginTop: 20 }}>{error}</Text>}
  </ScrollView></View>;
}
const styles=StyleSheet.create({root:{flex:1},content:{padding:18},grid:{flexDirection:'row',gap:12},card:{flex:1,borderWidth:1,borderRadius:18,padding:18,minHeight:150},label:{fontSize:13,fontWeight:'700'},value:{fontSize:30,fontWeight:'900',marginVertical:18}});
