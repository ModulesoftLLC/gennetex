import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Linking, Platform, Alert, TextInput, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { Card, Button, Badge, ScreenHeader, EmptyState } from '../components/ui';
import { CALL_TYPES } from '../data/mockData';
import { STATUS_FILTERS, getCallStatusKey, callBadgeColor, callStatusLabelMn } from '../lib/callStatusColors';
import * as serviceCallApi from '../services/serviceCallService';
import { spacing, radius } from '../theme';
import { useTheme, useStyles } from '../context/ThemeContext';
import CallWorkspaceHeader from '../components/CallWorkspaceHeader';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { callPhone, composeSms } from '../lib/contactActions';
import { normalizeRole, ROLES } from '../lib/roles';

const EMPTY_CALL = { customer: '', phone: '', address: '', problem: '', type: 'repair', assigneeId: '' };

function typeMeta(key) {
  return CALL_TYPES.find((t) => t.key === key) || CALL_TYPES[CALL_TYPES.length - 1];
}

export default function AdminCallsScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const { isCloud, authProfile, currentUser, fetchEmployees } = useApp();
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState(EMPTY_CALL);
  const [assignees, setAssignees] = useState([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const openCreate = async () => {
    setDraft({ ...EMPTY_CALL, assigneeId: authProfile?.id || '' });
    setFormError('');
    setCreateOpen(true);
    try {
      const rows = await fetchEmployees();
      const viewerRole = normalizeRole(authProfile?.role);
      const allowed = (rows || []).filter((person) =>
        viewerRole === ROLES.SUPERADMIN || normalizeRole(person.role) !== ROLES.SUPERADMIN
      );
      if (authProfile && !allowed.some((person) => person.id === authProfile.id)) allowed.unshift(authProfile);
      setAssignees(allowed);
    } catch (error) {
      setFormError(error.message || 'Ажилтны жагсаалт ачаалсангүй.');
    }
  };

  const saveCall = async () => {
    if (!draft.customer.trim() || !draft.phone.trim() || !draft.problem.trim()) {
      setFormError('Харилцагч, утас, дуудлагын мэдээллийг бүрэн оруулна уу.');
      return;
    }
    const assignee = assignees.find((person) => person.id === draft.assigneeId);
    if (!assignee) {
      setFormError('Дуудлага хариуцах ажилтныг сонгоно уу.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      await serviceCallApi.createServiceCall({
        customer: draft.customer,
        phone: draft.phone,
        address: draft.address,
        problem: draft.problem,
        type: draft.type,
        engineer_id: assignee.id,
        engineer_name: assignee.name || assignee.email || 'Ажилтан',
        assignee_role: assignee.role,
        creator_role: authProfile?.role,
        created_by: authProfile?.id,
        created_by_name: authProfile?.name || currentUser?.name,
      });
      setCreateOpen(false);
      await load();
    } catch (error) {
      setFormError(error.message || 'Дуудлага бүртгэж чадсангүй.');
    } finally {
      setSaving(false);
    }
  };

  const load = useCallback(async () => {
    if (!isCloud) return;
    setLoading(true);
    try {
      const rows = await serviceCallApi.fetchServiceCalls();
      setCalls(rows);
    } catch (e) {
      setCalls([]);
    } finally {
      setLoading(false);
    }
  }, [isCloud]);

  useFocusEffect(
    useCallback(() => {
      load();
      if (!isCloud) return undefined;
      const unsub = serviceCallApi.subscribeServiceCalls(load);
      return () => unsub && unsub();
    }, [load, isCloud])
  );

  const filtered = useMemo(
    () => (statusFilter === 'all' ? calls : calls.filter((c) => getCallStatusKey(c) === statusFilter)),
    [calls, statusFilter]
  );

  const counts = useMemo(() => {
    const c = { all: calls.length, pending: 0, progress: 0, done: 0 };
    calls.forEach((call) => {
      const k = getCallStatusKey(call);
      if (k === 'pending') c.pending += 1;
      else if (k === 'progress') c.progress += 1;
      else if (k === 'done') c.done += 1;
    });
    return c;
  }, [calls]);

  const openMaps = (call) => {
    if (call.latitude == null || call.longitude == null) return;
    const url = Platform.select({
      ios: `maps://?q=${call.latitude},${call.longitude}`,
      android: `geo:${call.latitude},${call.longitude}?q=${call.latitude},${call.longitude}(${encodeURIComponent(call.customer || '')})`,
      default: `https://www.google.com/maps/search/?api=1&query=${call.latitude},${call.longitude}`,
    });
    Linking.openURL(url).catch(() => {});
  };

  const changeStatus = async (id, status) => {
    try {
      await serviceCallApi.updateServiceCallStatus(id, status);
      setCalls((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
      setSelected((s) => (s && s.id === id ? { ...s, status } : s));
    } catch (e) {}
  };

  if (!isCloud) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Бүх дуудлага" />
        <EmptyState text="Дуудлага харахын тулд Supabase холболт шаардлагатай." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CallWorkspaceHeader title="Бүх дуудлага" userName={authProfile?.name || currentUser?.name} mode="list" onList={() => {}} onMap={() => navigation.navigate('Live')} />

      <View style={styles.overviewRow}><View style={styles.countBox}><Text style={styles.countStrong}>{filtered.length}</Text><Text style={styles.countText}> илэрц байна</Text></View><TouchableOpacity style={styles.addBtn} onPress={openCreate}><Ionicons name="add" size={22} color="#fff"/><Text style={styles.addBtnText}>Дуудлага бүртгэх</Text></TouchableOpacity><TouchableOpacity style={styles.squareBtn} onPress={load}><Ionicons name="refresh" size={27} color={colors.text}/></TouchableOpacity></View>

      <View style={styles.filterWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {STATUS_FILTERS.map((s) => (
            <Chip
              key={s.key}
              label={s.label}
              color={s.color}
              active={statusFilter === s.key}
              onPress={() => setStatusFilter(s.key)}
            />
          ))}
        </ScrollView>
      </View>

      {filtered.length === 0 ? (
        <EmptyState text={loading ? 'Ачаалж байна...' : 'Дуудлага алга.'} />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {filtered.map((call) => {
            const tm = typeMeta(call.type);
            const phone = serviceCallApi.serviceCallPhone(call);
            return (
              <TouchableOpacity key={call.id} activeOpacity={0.85} onPress={() => setSelected(call)}>
                <Card style={styles.callCard}>
                  <View style={styles.cardTop}>
                    <Badge text={tm.label} color={tm.color} />
                    <Badge text={callStatusLabelMn(call)} color={callBadgeColor(call)} />
                  </View>
                  <Text style={styles.customer}>{call.customer || '—'}</Text>
                  {call.problem ? (
                    <Text style={styles.problem} numberOfLines={2}>{call.problem}</Text>
                  ) : null}
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Инженер:</Text>
                    <Text style={styles.metaValue}>{call.engineer || '—'}</Text>
                  </View>
                  {call.address ? (
                    <Text style={styles.addr} numberOfLines={1}>{call.address}</Text>
                  ) : null}
                  <View style={styles.quickActions}>
                    <TouchableOpacity
                      style={[styles.quickAction, !phone && styles.quickActionDisabled]}
                      disabled={!phone}
                      onPress={() => callPhone(phone).catch((error) => Alert.alert('Дуудлага', error.message))}
                    >
                      <Ionicons name="call" size={17} color="#fff" />
                      <Text style={styles.quickActionText}>Залгах</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.quickAction, styles.quickMessage, !phone && styles.quickActionDisabled]}
                      disabled={!phone}
                      onPress={() => composeSms(phone, `Сайн байна уу. ${currentUser?.name || 'Gennetex-ийн ажилтан'} холбогдож байна.`).catch((error) => Alert.alert('Мессеж', error.message))}
                    >
                      <Ionicons name="chatbubble" size={16} color="#fff" />
                      <Text style={styles.quickActionText}>Мессеж</Text>
                    </TouchableOpacity>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <Modal visible={!!selected} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selected && (
              <ScrollView>
                {(() => {
                  const phone = serviceCallApi.serviceCallPhone(selected);
                  return <>
                <Text style={styles.modalTitle}>{selected.customer}</Text>
                <View style={styles.badgeRow}>
                  <Badge text={typeMeta(selected.type).label} color={typeMeta(selected.type).color} />
                  <Badge text={callStatusLabelMn(selected)} color={callBadgeColor(selected)} />
                </View>
                <Detail label="Инженер" value={selected.engineer || '—'} styles={styles} />
                <Detail label="Утас" value={phone || 'Дугаар бүртгэгдээгүй'} styles={styles} />
                <Detail label="Хаяг" value={selected.address || '—'} styles={styles} />
                <Detail label="Асуудал" value={selected.problem || '—'} styles={styles} />

                <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
                  <View style={styles.contactActions}>
                    <Button title="Залгах" variant="success" style={{ flex: 1 }} disabled={!phone} onPress={() => callPhone(phone).catch((error) => Alert.alert('Дуудлага', error.message))} />
                    <Button title="Мессеж" style={{ flex: 1 }} disabled={!phone} onPress={() => composeSms(phone, `Сайн байна уу. ${currentUser?.name || 'Gennetex-ийн ажилтан'} холбогдож байна.`).catch((error) => Alert.alert('Мессеж', error.message))} />
                  </View>
                  {!phone ? <Text style={styles.phoneHint}>Энэ дуудлагад хэрэглэгчийн утасны дугаар хадгалагдаагүй байна.</Text> : null}
                  {selected.latitude != null && selected.longitude != null ? (
                    <Button title="Google Maps-аар харах" onPress={() => openMaps(selected)} />
                  ) : null}
                  <View style={styles.statusBtns}>
                    <Button
                      title="Явж байгаа"
                      variant="ghost"
                      style={{ flex: 1 }}
                      onPress={() => changeStatus(selected.id, 'Явж байгаа')}
                    />
                    <Button
                      title="Дууссан"
                      variant="success"
                      style={{ flex: 1 }}
                      onPress={() => changeStatus(selected.id, 'Дууссан')}
                    />
                  </View>
                  <Button title="Хаах" variant="ghost" onPress={() => setSelected(null)} />
                </View>
                  </>;
                })()}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={createOpen} transparent animationType="slide" onRequestClose={() => setCreateOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.createModal}>
            <View style={styles.createHeader}><View><Text style={styles.modalTitle}>Дуудлага бүртгэх</Text><Text style={styles.createSub}>Дуудлагыг өөртөө эсвэл ажилтанд хуваарилна</Text></View><TouchableOpacity onPress={() => setCreateOpen(false)}><Ionicons name="close" size={26} color={colors.text}/></TouchableOpacity></View>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
              <Field label="Харилцагч / айл *" value={draft.customer} onChangeText={(value) => setDraft((old) => ({ ...old, customer: value }))} styles={styles}/>
              <Field label="Утасны дугаар *" value={draft.phone} onChangeText={(value) => setDraft((old) => ({ ...old, phone: value.replace(/[^0-9+]/g, '') }))} keyboardType="phone-pad" styles={styles}/>
              <Field label="Хаяг" value={draft.address} onChangeText={(value) => setDraft((old) => ({ ...old, address: value }))} styles={styles}/>
              <Field label="Дуудлагын мэдээлэл *" value={draft.problem} onChangeText={(value) => setDraft((old) => ({ ...old, problem: value }))} multiline styles={styles}/>
              <Text style={styles.fieldLabel}>Дуудлагын төрөл</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionRow}>{CALL_TYPES.map((type) => <TouchableOpacity key={type.key} style={[styles.option, draft.type === type.key && { backgroundColor: type.color, borderColor: type.color }]} onPress={() => setDraft((old) => ({ ...old, type: type.key }))}><Text style={[styles.optionText, draft.type === type.key && styles.optionTextActive]}>{type.label}</Text></TouchableOpacity>)}</ScrollView>
              <Text style={styles.fieldLabel}>Хариуцах ажилтан *</Text>
              <View style={styles.assigneeList}>{assignees.map((person) => { const active = draft.assigneeId === person.id; return <TouchableOpacity key={person.id} style={[styles.assignee, active && styles.assigneeActive]} onPress={() => setDraft((old) => ({ ...old, assigneeId: person.id }))}><View style={[styles.radio, active && styles.radioActive]}>{active ? <View style={styles.radioDot}/> : null}</View><View style={{flex:1}}><Text style={styles.assigneeName}>{person.id === authProfile?.id ? 'Би · ' : ''}{person.name || person.email}</Text><Text style={styles.assigneeRole}>{normalizeRole(person.role) === ROLES.SUPERADMIN ? 'Системийн админ' : normalizeRole(person.role) === ROLES.ADMIN ? 'Админ' : 'Ажилтан'}</Text></View></TouchableOpacity>})}</View>
              {formError ? <Text style={styles.formError}>{formError}</Text> : null}
              <Button title={saving ? 'Хадгалж байна...' : 'Дуудлага хадгалах'} disabled={saving} onPress={saveCall}/>
              {saving ? <ActivityIndicator color={colors.primary}/> : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Field({ label, styles, multiline, ...props }) {
  return <View><Text style={styles.fieldLabel}>{label}</Text><TextInput {...props} multiline={multiline} placeholderTextColor="#94a3b8" style={[styles.input, multiline && styles.textarea]}/></View>;
}

function Detail({ label, value, styles }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function Chip({ label, active, color, onPress }) {
  const styles = useStyles(makeStyles);
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

const makeStyles = ({ colors }) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  overviewRow:{flexDirection:'row',gap:10,padding:spacing.md,paddingBottom:0},countBox:{flex:1,height:48,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,backgroundColor:colors.surface,flexDirection:'row',alignItems:'center',paddingHorizontal:14},countStrong:{color:colors.text,fontSize:18,fontWeight:'900'},countText:{color:colors.text,fontSize:16},squareBtn:{width:48,height:48,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,backgroundColor:colors.surface,alignItems:'center',justifyContent:'center'},
  addBtn:{height:48,paddingHorizontal:13,borderRadius:radius.md,backgroundColor:colors.primary,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:5},addBtnText:{color:'#fff',fontSize:12,fontWeight:'800'},
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
  chipText: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  chipTextActive: { color: '#fff' },
  list: { padding: spacing.md, gap: spacing.md },
  callCard: { marginBottom: 0 },
  cardTop: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  customer: { color: colors.text, fontSize: 17, fontWeight: '800', marginTop: spacing.sm },
  problem: { color: colors.textMuted, marginTop: 4 },
  metaRow: { flexDirection: 'row', gap: 6, marginTop: spacing.sm, alignItems: 'center' },
  metaLabel: { color: colors.textFaint, fontSize: 13 },
  metaValue: { color: colors.text, fontSize: 13, fontWeight: '700' },
  addr: { color: colors.textFaint, fontSize: 12, marginTop: 4 },
  quickActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  quickAction: { flex: 1, minHeight: 40, borderRadius: radius.md, backgroundColor: '#16a34a', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  quickMessage: { backgroundColor: '#2563eb' },
  quickActionDisabled: { opacity: 0.38 },
  quickActionText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: '#000000bb', justifyContent: 'center', padding: spacing.lg },
  modalContent: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl, maxHeight: '85%' },
  modalTitle: { color: colors.text, fontSize: 20, fontWeight: '800', marginBottom: spacing.md },
  badgeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  detailRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  detailLabel: { color: colors.textFaint, fontSize: 14, width: 72 },
  detailValue: { color: colors.text, fontSize: 15, flex: 1, fontWeight: '600' },
  statusBtns: { flexDirection: 'row', gap: spacing.sm },
  contactActions: { flexDirection: 'row', gap: spacing.sm },
  phoneHint: { color: colors.danger, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  createModal:{backgroundColor:colors.surface,borderRadius:radius.xl,maxHeight:'92%',overflow:'hidden'},createHeader:{padding:spacing.lg,paddingBottom:spacing.md,flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',borderBottomWidth:1,borderBottomColor:colors.border},createSub:{color:colors.textMuted,fontSize:12,marginTop:-8},form:{padding:spacing.lg,gap:spacing.md,paddingBottom:32},fieldLabel:{color:colors.text,fontSize:13,fontWeight:'800',marginBottom:7},input:{minHeight:48,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,paddingHorizontal:14,color:colors.text,backgroundColor:colors.surfaceAlt,fontSize:15},textarea:{minHeight:88,paddingTop:12,textAlignVertical:'top'},optionRow:{gap:8},option:{paddingHorizontal:13,paddingVertical:9,borderWidth:1,borderColor:colors.border,borderRadius:radius.pill,backgroundColor:colors.surfaceAlt},optionText:{color:colors.textMuted,fontSize:12,fontWeight:'700'},optionTextActive:{color:'#fff'},assigneeList:{borderWidth:1,borderColor:colors.border,borderRadius:radius.md,overflow:'hidden'},assignee:{minHeight:58,paddingHorizontal:13,flexDirection:'row',alignItems:'center',gap:11,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:colors.border},assigneeActive:{backgroundColor:colors.primarySoft},radio:{width:21,height:21,borderRadius:11,borderWidth:2,borderColor:colors.border,alignItems:'center',justifyContent:'center'},radioActive:{borderColor:colors.primary},radioDot:{width:11,height:11,borderRadius:6,backgroundColor:colors.primary},assigneeName:{color:colors.text,fontSize:14,fontWeight:'800'},assigneeRole:{color:colors.textMuted,fontSize:11,marginTop:2},formError:{color:colors.danger,fontSize:13,lineHeight:18},
});
