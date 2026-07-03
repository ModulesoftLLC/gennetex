import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { ScreenHeader, HeaderButton, EmptyState, SectionTitle } from '../components/ui';
import * as chatApi from '../services/chatService';
import { formatTime } from '../lib/formatTime';
import { isOnline, formatLastSeen } from '../lib/online';
import { colors, spacing, radius } from '../theme';

function initials(name = '') {
  return name.trim().charAt(0).toUpperCase() || ' ?';
}

export default function ChatScreen() {
  const navigation = useNavigation();
  const { currentUser, isCloud, fetchEmployees } = useApp();
  const me = currentUser;
  const [employees, setEmployees] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!isCloud || !me?.id) return;
    try {
      const [emps, convs] = await Promise.all([
        fetchEmployees().catch(() => []),
        chatApi.fetchMyConversations(me.id).catch(() => []),
      ]);
      setEmployees(emps.filter((e) => e.id !== me.id));
      setConversations(convs);
    } catch (e) {
      setError(e.message);
    }
  }, [isCloud, me?.id, fetchEmployees]);

  useFocusEffect(
    useCallback(() => {
      load();
      if (!isCloud || !me?.id) return;
      const unsub = chatApi.subscribeConversations(me.id, load);
      return unsub;
    }, [load, isCloud, me?.id])
  );

  const openDirect = async (emp) => {
    try {
      const conv = await chatApi.getOrCreateDirect(
        { id: me.id, name: me.name },
        { id: emp.id, name: emp.name }
      );
      navigation.navigate('Conversation', {
        conversationId: conv.id,
        title: emp.name,
        isGroup: false,
        otherUser: { id: emp.id, name: emp.name },
      });
    } catch (e) {
      setError(e.message);
    }
  };

  const openConversation = (c) => {
    const other = c.members?.find((m) => m.user_id !== me.id);
    navigation.navigate('Conversation', {
      conversationId: c.id,
      title: c.title,
      isGroup: c.is_group,
      otherUser: other ? { id: other.user_id, name: other.user_name } : null,
    });
  };

  if (!isCloud) {
    return (
      <View style={styles.container}>
        <ScreenHeader back={false} title="Чат"/>
        <EmptyState text="Чат хийхэд Supabase холбогдсон байх шаардлагатай."/>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        back={false} title="Чат"
        subtitle={me?.name || ''}
        right={
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <HeaderButton title="Архив" onPress={() => navigation.navigate('ChatArchive')} />
            <HeaderButton title="Групп" onPress={() => navigation.navigate('NewGroup')} />
          </View>
        }
      />

      <FlatList
        data={conversations}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 110 }}
        ListHeaderComponent={
          <View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <SectionTitle>Ажилчид</SectionTitle>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.lg }}>
              {employees.length === 0 ? (
                <Text style={styles.muted}>Ажилтан алга.</Text>
              ) : (
                employees.map((emp) => (
                  <TouchableOpacity key={emp.id} style={styles.person} onPress={() => openDirect(emp)}>
                    <View style={styles.avatarWrap}>
                      <View style={styles.avatar}>
                        {emp.avatar_url ? (
                          <Image source={{ uri: emp.avatar_url }} style={styles.avatarImg} />
                        ) : (
                          <Text style={styles.avatarText}>{initials(emp.name)}</Text>
                        )}
                      </View>
                      <View
                        style={[
                          styles.onlineDot,
                          { backgroundColor: isOnline(emp.last_seen) ? colors.success : colors.textMuted },
                        ]}
                      />
                    </View>
                    <Text style={styles.personName} numberOfLines={1}>
                      {emp.name || 'Ажилтан'}
                    </Text>
                    <Text style={styles.personStatus} numberOfLines={1}>
                      {formatLastSeen(emp.last_seen)}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
            <SectionTitle>Яриа</SectionTitle>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.convRow} onPress={() => openConversation(item)} activeOpacity={0.8}>
            <View style={[styles.avatar, item.is_group && { backgroundColor: colors.accent + '33'}]}>
              <Text style={styles.avatarText}>{initials(item.title)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.convTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.convLast} numberOfLines={1}>
                {item.last
                  ? `${item.last.sender_name}: ${
                      item.last.content ||
                      (item.last.attachment_type === 'image'
                        ? 'Зураг'
                        : item.last.attachment_type === 'video'
                        ? 'Видео'
                        : item.last.attachment_type === 'file'
                        ? 'Файл'
                        : '')
                    }`
                  : 'Мессеж алга'}
              </Text>
            </View>
            {item.last?.created_at ? (
              <Text style={styles.convTime}>{formatTime(item.last.created_at)}</Text>
            ) : null}
          </TouchableOpacity>
        )}
        ListEmptyComponent={<EmptyState text="Яриа алга. Ажилтан дээр дарж эхлүүлээрэй." />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  error: { color: colors.danger, marginBottom: spacing.sm },
  muted: { color: colors.textMuted, paddingVertical: spacing.md },
  person: { alignItems: 'center', marginRight: spacing.md, width: 72 },
  avatarWrap: { position: 'relative', marginBottom: 4 },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.bg,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primary + '33',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%', borderRadius: 27 },
  avatarText: { color: colors.text, fontSize: 20, fontWeight: '800'},
  personName: { color: colors.textMuted, fontSize: 11, textAlign: 'center'},
  personStatus: { color: colors.textFaint, fontSize: 9, textAlign: 'center', marginTop: 1 },
  convRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  convTitle: { color: colors.text, fontSize: 15, fontWeight: '800'},
  convLast: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  convTime: { color: colors.textFaint, fontSize: 11, marginTop: 2, minWidth: 44, textAlign: 'right' },
});
