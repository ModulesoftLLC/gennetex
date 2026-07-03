import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { Button, Field } from '../components/ui';
import { colors, spacing, radius, shadow } from '../theme';

export default function LoginScreen() {
  const { signIn, isCloud } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Имэйл болон нууц үгээ оруулна уу.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (e) {
      setError(mapError(e.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.bg}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <View style={styles.logoWrap}>
              <Image source={require('../../assets/logo.png')} style={styles.logoImg} resizeMode="contain"/>
              <Text style={styles.appName}>Gennetex ERP</Text>
              <Text style={styles.appSub}>Имэйл, нууц үгээр нэвтэрнэ үү</Text>
            </View>

            <Field
              label="Имэйл"
              placeholder="name@company.mn"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <Field
              label="Нууц үг"
              placeholder="••••••••"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button
              title={loading ? 'Түр хүлээнэ үү...' : 'Нэвтрэх'}
              size="lg"
              onPress={handleLogin}
              disabled={loading}
              style={{ marginTop: spacing.sm }}
            />
            {!isCloud ? (
              <Text style={styles.note}>
                Supabase холбогдоогүй байна. Нэвтрэлт ажиллахын тулд .env тохируулна уу.
              </Text>
            ) : (
              <Text style={styles.hint}>
                Шинэ ажилтныг админ бүртгэнэ. Эрх авахын тулд админд хандана уу.
              </Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function mapError(msg = '') {
  if (/invalid login credentials/i.test(msg)) return 'Имэйл эсвэл нууц үг буруу байна.';
  if (/email not confirmed/i.test(msg)) return 'Имэйл баталгаажаагүй байна.';
  return msg;
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.bgAlt },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.md,
  },
  logoWrap: { alignItems: 'center', marginBottom: spacing.xl },
  logoImg: { width: 88, height: 88, marginBottom: spacing.md },
  appName: { color: colors.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.3 },
  appSub: { color: colors.textMuted, marginTop: 6, fontSize: 14 },
  error: {
    color: colors.danger,
    backgroundColor: '#fef2f2',
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginBottom: spacing.md,
    fontSize: 13,
  },
  note: { color: colors.warning, fontSize: 12, marginTop: spacing.md, textAlign: 'center', lineHeight: 18 },
  hint: { color: colors.textMuted, fontSize: 12, marginTop: spacing.md, textAlign: 'center', lineHeight: 18 },
});
