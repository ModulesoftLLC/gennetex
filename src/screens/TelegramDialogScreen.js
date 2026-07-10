import React, { useCallback, useEffect, useRef, useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useStyles } from '../context/ThemeContext';
import * as tg from '../services/telegramUserService';
import { formatTime } from '../lib/formatTime';

function Bubble({ item }) {
  const styles = useStyles(makeStyles);
  const mine = item.out;
  return (
    <View style={[styles.bubbleWrap, mine ? styles.wrapMine : styles.wrapOther]}>
      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
        <Text style={[styles.text, mine && styles.textMine]}>{item.text}</Text>
        {item.date ? (
          <Text style={[styles.time, mine && styles.timeMine]}>{formatTime(item.date)}</Text>
        ) : null}
      </View>
    </View>
  );
}

export default function TelegramDialogScreen() {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const navigation = useNavigation();
  const route = useRoute();
  const { id, title } = route.params || {};
  const [rows, setRows] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const listRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const data = await tg.fetchMessages(id, 50);
      setRows(data);
      setError(null);
    } catch (e) {
      setError(e.message || 'Мессеж ачаалахад алдаа');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
    let unsub;
    tg.subscribeNewMessages((chatId) => {
      if (String(chatId) === String(id)) load();
    })
      .then((fn) => {
        unsub = fn;
      })
      .catch(() => {});
    return () => {
      if (unsub) unsub();
    };
  }, [id, load]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setText('');
    try {
      const msg = await tg.sendMessage(id, body);
      setRows((prev) => [...prev, msg]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    } catch (e) {
      setText(body);
      setError(e.message || 'Илгээх амжилтгүй');
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{title || 'Чат'}</Text>
      </View>

      {error ? (
        <TouchableOpacity style={styles.errBar} onPress={() => setError(null)}>
          <Text style={styles.errText}>{error}</Text>
        </TouchableOpacity>
      ) : null}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
        ) : (
          <FlatList
            ref={listRef}
            data={rows}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.list}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            renderItem={({ item }) => <Bubble item={item} />}
            ListEmptyComponent={<Text style={styles.empty}>Мессеж алга.</Text>}
          />
        )}

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Мессеж..."
            placeholderTextColor={colors.textFaint}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={4000}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!text.trim() || sending) && styles.sendOff]}
            onPress={send}
            disabled={!text.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
      gap: 4,
    },
    backBtn: { padding: 4 },
    title: { color: colors.text, fontSize: 17, fontWeight: '700', flex: 1 },
    errBar: { backgroundColor: colors.danger + '22', padding: 10, marginHorizontal: 12, marginTop: 8, borderRadius: 8 },
    errText: { color: colors.danger, fontSize: 13 },
    list: { padding: 12, paddingBottom: 8 },
    empty: { textAlign: 'center', color: colors.textMuted, marginTop: 48, fontSize: 14 },
    bubbleWrap: { marginBottom: 8, maxWidth: '85%' },
    wrapMine: { alignSelf: 'flex-end' },
    wrapOther: { alignSelf: 'flex-start' },
    bubble: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 9 },
    bubbleMine: { backgroundColor: '#229ED9', borderBottomRightRadius: 4 },
    bubbleOther: { backgroundColor: colors.surfaceContainerLow, borderBottomLeftRadius: 4 },
    text: { color: colors.text, fontSize: 15, lineHeight: 21 },
    textMine: { color: '#fff' },
    time: { color: colors.textFaint, fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
    timeMine: { color: '#ffffffaa' },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      padding: 10,
      gap: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
    },
    input: {
      flex: 1,
      minHeight: 44,
      maxHeight: 120,
      borderRadius: 22,
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: colors.surfaceContainerLow,
      color: colors.text,
      fontSize: 15,
    },
    sendBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: '#229ED9',
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendOff: { opacity: 0.45 },
  });
