import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useStyles } from '../context/ThemeContext';
import * as tg from '../services/telegramUserService';
import { formatTime } from '../lib/formatTime';

function LoginView({ onDone }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const [step, setStep] = useState('phone'); // phone | code | password
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [phoneCodeHash, setPhoneCodeHash] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submitPhone = async () => {
    const p = phone.trim();
    if (!p.startsWith('+')) {
      setError('Улсын кодтой оруулна уу (ж: +976...)');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { phoneCodeHash: hash } = await tg.sendLoginCode(p);
      setPhoneCodeHash(hash);
      setStep('code');
    } catch (e) {
      setError(e.message || 'Код илгээхэд алдаа гарлаа');
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async () => {
    const c = code.trim();
    if (!c) return;
    setBusy(true);
    setError(null);
    try {
      const res = await tg.signInWithCode({
        phoneNumber: phone.trim(),
        phoneCodeHash,
        phoneCode: c,
      });
      if (res.needPassword) {
        setStep('password');
      } else {
        onDone();
      }
    } catch (e) {
      setError(e.message || 'Код буруу байна');
    } finally {
      setBusy(false);
    }
  };

  const submitPassword = async () => {
    if (!password) return;
    setBusy(true);
    setError(null);
    try {
      await tg.signInWithPassword(password);
      onDone();
    } catch (e) {
      setError(e.message || 'Нууц үг буруу байна');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.loginWrap}>
      <View style={styles.loginIcon}>
        <Ionicons name="paper-plane" size={40} color="#fff" />
      </View>
      <Text style={styles.loginTitle}>Өөрийн Telegram-аар нэвтрэх</Text>
      <Text style={styles.loginSub}>
        Утасны дугаараа оруулбал Telegram танд код илгээнэ. Дараа нь бүх чат энд харагдана.
      </Text>

      {error ? <Text style={styles.loginErr}>{error}</Text> : null}

      {step === 'phone' ? (
        <>
          <TextInput
            style={styles.loginInput}
            placeholder="+976 99112233"
            placeholderTextColor={colors.textFaint}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            autoFocus
          />
          <TouchableOpacity style={styles.loginBtn} onPress={submitPhone} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginBtnText}>Код авах</Text>}
          </TouchableOpacity>
        </>
      ) : null}

      {step === 'code' ? (
        <>
          <TextInput
            style={styles.loginInput}
            placeholder="Telegram-аас ирсэн код"
            placeholderTextColor={colors.textFaint}
            keyboardType="number-pad"
            value={code}
            onChangeText={setCode}
            autoFocus
          />
          <TouchableOpacity style={styles.loginBtn} onPress={submitCode} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginBtnText}>Нэвтрэх</Text>}
          </TouchableOpacity>
        </>
      ) : null}

      {step === 'password' ? (
        <>
          <Text style={styles.loginSub}>2FA нууц үгээ оруулна уу.</Text>
          <TextInput
            style={styles.loginInput}
            placeholder="Нууц үг"
            placeholderTextColor={colors.textFaint}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            autoFocus
          />
          <TouchableOpacity style={styles.loginBtn} onPress={submitPassword} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginBtnText}>Баталгаажуулах</Text>}
          </TouchableOpacity>
        </>
      ) : null}
    </View>
  );
}

function DialogRow({ item, onPress }) {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const initials = (item.title || '?').trim().charAt(0).toUpperCase();
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.avatar, item.isChannel && styles.avatarChannel, item.isGroup && styles.avatarGroup]}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
          {item.date ? <Text style={styles.rowTime}>{formatTime(item.date)}</Text> : null}
        </View>
        <View style={styles.rowTop}>
          <Text style={styles.rowMsg} numberOfLines={1}>{item.lastMessage || ' '}</Text>
          {item.unreadCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.unreadCount}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function MyTelegramScreen() {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const navigation = useNavigation();
  const [authed, setAuthed] = useState(null);
  const [dialogs, setDialogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const configured = tg.isConfigured();

  const loadDialogs = useCallback(async () => {
    try {
      const data = await tg.fetchDialogs(60);
      setDialogs(data);
      setError(null);
    } catch (e) {
      setError(e.message || 'Чат ачаалахад алдаа гарлаа');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const checkAuth = useCallback(async () => {
    if (!configured) {
      setAuthed(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ok = await tg.isAuthorized();
    setAuthed(ok);
    if (ok) await loadDialogs();
    else setLoading(false);
  }, [configured, loadDialogs]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useFocusEffect(
    useCallback(() => {
      if (authed) loadDialogs();
    }, [authed, loadDialogs])
  );

  const onLogout = () => {
    Alert.alert('Гарах', 'Telegram-аас гарах уу?', [
      { text: 'Болих', style: 'cancel' },
      {
        text: 'Гарах',
        style: 'destructive',
        onPress: async () => {
          await tg.logout();
          setAuthed(false);
          setDialogs([]);
        },
      },
    ]);
  };

  if (!configured) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.center}>
          <Ionicons name="warning-outline" size={40} color={colors.textMuted} />
          <Text style={styles.notice}>
            Telegram API тохируулаагүй байна.{'\n\n'}
            my.telegram.org → API development tools-оос api_id, api_hash авч .env дотор
            EXPO_PUBLIC_TELEGRAM_API_ID, EXPO_PUBLIC_TELEGRAM_API_HASH болгон нэмнэ үү.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Миний Telegram</Text>
          <Text style={styles.sub}>Өөрийн акаунт · бүх чат</Text>
        </View>
        {authed ? (
          <TouchableOpacity onPress={onLogout} style={styles.headerBtn}>
            <Ionicons name="log-out-outline" size={22} color={colors.onPrimaryContainer} />
          </TouchableOpacity>
        ) : null}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : authed ? (
        <FlatList
          data={dialogs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <DialogRow
              item={item}
              onPress={() => navigation.navigate('TelegramDialog', { id: item.id, title: item.title })}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadDialogs();
              }}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <Text style={styles.empty}>{error || 'Чат алга.'}</Text>
          }
        />
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <LoginView onDone={checkAuth} />
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    notice: { color: colors.textMuted, fontSize: 14, textAlign: 'center', marginTop: 16, lineHeight: 21 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    headerText: { flex: 1 },
    title: { color: colors.text, fontSize: 18, fontWeight: '800' },
    sub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
    headerBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primaryContainer,
      alignItems: 'center',
      justifyContent: 'center',
    },
    empty: { textAlign: 'center', color: colors.textMuted, marginTop: 48, fontSize: 14 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 10,
      gap: 12,
    },
    avatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: '#229ED9',
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarGroup: { backgroundColor: '#0f766e' },
    avatarChannel: { backgroundColor: '#7c3aed' },
    avatarText: { color: '#fff', fontSize: 20, fontWeight: '700' },
    rowBody: { flex: 1, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 10 },
    rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    rowTitle: { color: colors.text, fontSize: 16, fontWeight: '700', flex: 1 },
    rowTime: { color: colors.textFaint, fontSize: 11, marginLeft: 8 },
    rowMsg: { color: colors.textMuted, fontSize: 13, flex: 1, marginTop: 2 },
    badge: {
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: '#229ED9',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 6,
      marginLeft: 8,
    },
    badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    loginWrap: { padding: 24, alignItems: 'center' },
    loginIcon: {
      width: 84,
      height: 84,
      borderRadius: 42,
      backgroundColor: '#229ED9',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 24,
      marginBottom: 20,
    },
    loginTitle: { color: colors.text, fontSize: 20, fontWeight: '800', textAlign: 'center' },
    loginSub: { color: colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 20 },
    loginErr: { color: colors.danger, fontSize: 13, marginTop: 14, textAlign: 'center' },
    loginInput: {
      width: '100%',
      height: 52,
      borderRadius: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.surfaceContainerLow,
      color: colors.text,
      fontSize: 16,
      marginTop: 20,
    },
    loginBtn: {
      width: '100%',
      height: 52,
      borderRadius: 12,
      backgroundColor: '#229ED9',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 14,
    },
    loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  });
