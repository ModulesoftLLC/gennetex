import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  Linking,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Video, ResizeMode } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useApp } from '../context/AppContext';
import { ScreenHeader, HeaderButton, EmptyState } from '../components/ui';
import VideoCallModal from '../components/VideoCallModal';
import * as chatApi from '../services/chatService';
import * as callApi from '../services/callService';
import VoiceMessageButton from '../components/VoiceMessageButton';
import ChatImagePreview from '../components/ChatImagePreview';
import ChatVideoPreview from '../components/ChatVideoPreview';
import { setActiveChatRoom } from '../lib/chatFocus';
import { formatTime } from '../lib/formatTime';
import { colors, spacing, radius } from '../theme';

const IMAGE_MAX_W = 260;
const IMAGE_MAX_H = 340;

function ChatImage({ uri, onPress }) {
  const [size, setSize] = useState({ width: IMAGE_MAX_W, height: IMAGE_MAX_W * 0.75 });

  useEffect(() => {
    let active = true;
    Image.getSize(
      uri,
      (w, h) => {
        if (!active || !w || !h) return;
        let width = w;
        let height = h;
        if (width > IMAGE_MAX_W) {
          height = (IMAGE_MAX_W / width) * height;
          width = IMAGE_MAX_W;
        }
        if (height > IMAGE_MAX_H) {
          width = (IMAGE_MAX_H / height) * width;
          height = IMAGE_MAX_H;
        }
        setSize({ width: Math.round(width), height: Math.round(height) });
      },
      () => {}
    );
    return () => {
      active = false;
    };
  }, [uri]);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.92}>
      <Image
        source={{ uri }}
        style={[styles.msgImage, { width: size.width, height: size.height }]}
        resizeMode="cover"
      />
    </TouchableOpacity>
  );
}

const VIDEO_THUMB_W = 240;
const VIDEO_THUMB_H = 136;

function ChatVideo({ uri, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.92} style={styles.videoThumb}>
      <Video
        source={{ uri }}
        style={styles.videoThumbPlayer}
        resizeMode={ResizeMode.COVER}
        shouldPlay={false}
        isMuted
      />
      <View style={styles.playBadge}>
        <Text style={styles.playIcon}></Text>
      </View>
    </TouchableOpacity>
  );
}

export default function ConversationScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { conversationId, title, isGroup, otherUser } = route.params || {};
  const { currentUser, isCloud } = useApp();
  const me = currentUser;
  const room = conversationId;

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [error, setError] = useState(null);
  const [callVisible, setCallVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const [voicePreview, setVoicePreview] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [previewVideo, setPreviewVideo] = useState(null);
  const listRef = useRef(null);

  const load = useCallback(async () => {
    if (!isCloud || !room) return;
    try {
      setMessages(await chatApi.fetchMessages(room));
    } catch (e) {
      setError(e.message);
    }
  }, [isCloud, room]);

  useEffect(() => {
    setActiveChatRoom(room);
    return () => setActiveChatRoom(null);
  }, [room]);

  useEffect(() => {
    load();
    if (!isCloud || !room) return;
    const unsub = chatApi.subscribeMessages(room, {
      onInsert: (msg) => {
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      },
      onUpdate: (msg) => {
        setMessages((prev) => prev.map((m) => (m.id === msg.id ? msg : m)));
      },
      onDelete: (msg) => {
        setMessages((prev) => prev.filter((m) => m.id !== msg.id));
      },
    });
    return unsub;
  }, [load, isCloud, room]);

  useEffect(() => {
    if (messages.length) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const send = useCallback(
    async (content) => {
      const body = (typeof content === 'string' ? content : text).trim();
      if (!body || !me) return;
      if (editingId) {
        setText('');
        setEditingId(null);
        try {
          const updated = await chatApi.updateMessage(editingId, me.id, body);
          setMessages((prev) => prev.map((m) => (m.id === editingId ? updated : m)));
        } catch (e) {
          setError(e.message);
          Alert.alert('Алдаа', e.message);
        }
        return;
      }
      setText('');
      try {
        await chatApi.sendMessage({ room, senderId: me.id, senderName: me.name, content: body });
      } catch (e) {
        setError(e.message);
      }
    },
    [text, me, room, editingId]
  );

  const startEdit = useCallback((item) => {
    if (!item.content) return;
    setEditingId(item.id);
    setText(item.content);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setText('');
  }, []);

  const confirmDelete = useCallback(
    (item) => {
      Alert.alert('Устгах уу?', 'Энэ мессежийг бүрмөсөн устгах уу?', [
        { text: 'Болих', style: 'cancel'},
        {
          text: 'Устгах',
          style: 'destructive',
          onPress: async () => {
            try {
              await chatApi.deleteMessage(item.id, me.id);
              setMessages((prev) => prev.filter((m) => m.id !== item.id));
              if (editingId === item.id) cancelEdit();
            } catch (e) {
              setError(e.message);
              Alert.alert('Алдаа', e.message);
            }
          },
        },
      ]);
    },
    [me, editingId, cancelEdit]
  );

  const openMessageActions = useCallback(
    (item) => {
      if (item.sender_id !== me?.id) return;
      const options = [];
      if (item.content) {
        options.push({ text: 'Засах', onPress: () => startEdit(item) });
      }
      options.push({ text: 'Устгах', style: 'destructive', onPress: () => confirmDelete(item) });
      options.push({ text: 'Болих', style: 'cancel'});
      Alert.alert('Мессеж', 'Юу хийх вэ?', options);
    },
    [me, startEdit, confirmDelete]
  );

  const sendVoiceText = useCallback(
    async (spoken) => {
      const body = spoken?.trim();
      if (!body || !me) return;
      setVoicePreview('');
      try {
        await chatApi.sendMessage({ room, senderId: me.id, senderName: me.name, content: body });
      } catch (e) {
        setError(e.message);
        Alert.alert('Алдаа', e.message);
      }
    },
    [me, room]
  );

  const sendAttachment = async ({ uri, type, mimeType, name }) => {
    if (!me || !room) return;
    setUploading(true);
    try {
      const url = await chatApi.uploadChatFile(uri, { room, mimeType, name });
      await chatApi.sendMessage({
        room,
        senderId: me.id,
        senderName: me.name,
        content: '',
        attachmentUrl: url,
        attachmentType: type,
        attachmentName: name,
      });
    } catch (e) {
      setError(e.message);
      Alert.alert('Алдаа', e.message);
    } finally {
      setUploading(false);
    }
  };

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Зөвшөөрөл', 'Зургийн санд хандах зөвшөөрөл өгнө үү.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.6,
    });
    if (!res.canceled) {
      const a = res.assets[0];
      sendAttachment({ uri: a.uri, type: 'image', mimeType: a.mimeType || 'image/jpeg', name: a.fileName || 'image.jpg'});
    }
  };

  const pickFile = async () => {
    const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (!res.canceled && res.assets?.length) {
      const a = res.assets[0];
      sendAttachment({ uri: a.uri, type: 'file', mimeType: a.mimeType, name: a.name });
    }
  };

  const pickVideo = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Зөвшөөрөл', 'Видео сонгоход зөвшөөрөл өгнө үү.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      videoMaxDuration: 120,
      quality: 0.7,
    });
    if (!res.canceled) {
      const a = res.assets[0];
      sendAttachment({
        uri: a.uri,
        type: 'video',
        mimeType: a.mimeType || 'video/mp4',
        name: a.fileName || `video_${Date.now()}.mp4`,
      });
    }
  };

  const chooseAttachment = () => {
    Alert.alert('Хавсаргах', 'Юу илгээх вэ?', [
      { text: 'Зураг', onPress: pickImage },
      { text: 'Видео', onPress: pickVideo },
      { text: 'Файл', onPress: pickFile },
      { text: 'Болих', style: 'cancel'},
    ]);
  };

  const handleCall = async () => {
    setCallVisible(true);
    // 1:1 бол нөгөө хэрэглэгч рүү "залгаж байна"дохио явуулна
    if (!isGroup && otherUser?.id) {
      try {
        await callApi.startCall({ room, caller: me, callee: otherUser });
      } catch (e) {}
    }
    await send(isGroup ? 'Групп видео дуудлага эхэллээ.' : 'Видео дуудлага руу залгаж байна...');
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={title || 'Чат'}
        subtitle={isGroup ? 'Групп яриа' : otherUser?.name || ''}
        right={
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {isGroup ? (
              <HeaderButton title="Нэмэх"
                onPress={() =>
                  navigation.navigate('AddGroupMembers', { conversationId: room, title })
                }
              />
            ) : null}
            <HeaderButton title="Дуудлага" onPress={handleCall} />
          </View>
        }
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.md }}
          renderItem={({ item }) => {
            const mine = item.sender_id === me?.id;
            const hasImage = item.attachment_type === 'image'&& item.attachment_url;
            const hasVideo = item.attachment_type === 'video'&& item.attachment_url;
            const mediaOnly = (hasImage || hasVideo) && !item.content;
            return (
              <View style={[styles.bubbleRow, mine ? styles.rowMine : styles.rowOther]}>
                <TouchableOpacity
                  activeOpacity={mine ? 0.85 : 1}
                  onLongPress={mine ? () => openMessageActions(item) : undefined}
                  delayLongPress={400}
                >
                  <View
                    style={[
                      styles.bubble,
                      mediaOnly
                        ? styles.bubbleImageOnly
                        : mine
                        ? styles.bubbleMine
                        : styles.bubbleOther,
                    ]}
                  >
                    {!mine && !mediaOnly ? <Text style={styles.sender}>{item.sender_name}</Text> : null}
                    {!mine && mediaOnly ? (
                      <Text style={[styles.sender, styles.senderOnImage]}>{item.sender_name}</Text>
                    ) : null}
                    {hasImage ? (
                      <ChatImage uri={item.attachment_url} onPress={() => setPreviewImage(item.attachment_url)} />
                    ) : null}
                    {hasVideo ? (
                      <ChatVideo uri={item.attachment_url} onPress={() => setPreviewVideo(item.attachment_url)} />
                    ) : null}
                    {item.attachment_type === 'file'&& item.attachment_url ? (
                      <TouchableOpacity
                        style={[styles.fileChip, mine && styles.fileChipMine]}
                        onPress={() => Linking.openURL(item.attachment_url)}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.fileIcon}></Text>
                        <Text style={[styles.fileName, mine && styles.msgTextMine]} numberOfLines={1}>
                          {item.attachment_name || 'Файл'}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                    {item.content ? (
                      <Text style={[styles.msgText, mine && styles.msgTextMine]}>
                        {item.content}
                        <Text style={[styles.msgTimeInline, mine && styles.msgTimeMine]}>
                          {item.edited_at ? 'зассан · ' : ''}{formatTime(item.created_at)}
                        </Text>
                      </Text>
                    ) : mediaOnly ? (
                      <Text style={[styles.imageTime, mine && styles.imageTimeMine]}>
                        {item.edited_at ? 'зассан · ' : ''}
                        {formatTime(item.created_at)}
                      </Text>
                    ) : (
                      <View style={styles.msgMeta}>
                        {item.edited_at ? (
                          <Text style={[styles.msgEdited, mine && styles.msgEditedMine]}>зассан</Text>
                        ) : null}
                        <Text style={[styles.msgTime, mine && styles.msgTimeMine]}>{formatTime(item.created_at)}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            );
          }}
          ListEmptyComponent={<EmptyState text="Мессеж алга. Эхний мессежээ бичээрэй."/>}
        />

        <View style={styles.composer}>
          {editingId ? (
            <View style={styles.editBar}>
              <Text style={styles.editLabel}>Мессеж засаж байна</Text>
              <TouchableOpacity onPress={cancelEdit}>
                <Text style={styles.editCancel}>Болих</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          {voiceActive || voicePreview ? (
            <View style={styles.voiceBar}>
              <View style={styles.voiceDot} />
              <Text style={styles.voiceText} numberOfLines={2}>
                {voicePreview || 'Ярьж байна...'}
              </Text>
              <Text style={styles.voiceHint}>Суллана — шууд илгээнэ</Text>
            </View>
          ) : null}
          <View style={styles.inputRow}>
            <TouchableOpacity style={styles.attachBtn} onPress={chooseAttachment} disabled={uploading || voiceActive}>
              {uploading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={styles.attachIcon}></Text>
              )}
            </TouchableOpacity>
            <VoiceMessageButton
              disabled={uploading}
              onPartial={setVoicePreview}
              onFinal={sendVoiceText}
              onListeningChange={setVoiceActive}
            />
            <TextInput
              style={styles.input}
              placeholder={voiceActive ? 'Ярьж байна...' : 'Бичих эсвэл MIC дарж ярина'}
              placeholderTextColor={colors.textMuted}
              value={text}
              onChangeText={setText}
              multiline
              editable={!voiceActive}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!text.trim() || voiceActive) && styles.sendBtnDisabled]}
              onPress={() => send()}
              disabled={!text.trim() || voiceActive}
            >
              <Text style={styles.sendText}>{editingId ? 'Хадгалах' : 'Илгээх'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      <ChatImagePreview uri={previewImage} onClose={() => setPreviewImage(null)} />
      <ChatVideoPreview uri={previewVideo} onClose={() => setPreviewVideo(null)} />

      <VideoCallModal
        visible={callVisible}
        room={`gennetex-${room}`}
        name={me?.name}
        onClose={() => setCallVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  error: { color: colors.danger, paddingHorizontal: spacing.lg },
  bubbleRow: { marginBottom: spacing.sm, flexDirection: 'row'},
  rowMine: { justifyContent: 'flex-end'},
  rowOther: { justifyContent: 'flex-start'},
  bubble: { maxWidth: '80%', borderRadius: radius.md, padding: spacing.md },
  bubbleMine: { backgroundColor: colors.primary, borderTopRightRadius: 2 },
  bubbleOther: { backgroundColor: colors.surface, borderTopLeftRadius: 2, borderWidth: 1, borderColor: colors.border },
  bubbleImageOnly: {
    backgroundColor: 'transparent',
    padding: 0,
    borderWidth: 0,
    overflow: 'visible',
  },
  sender: { color: colors.primary, fontSize: 12, fontWeight: '700', marginBottom: 2 },
  senderOnImage: { marginBottom: spacing.xs, marginLeft: 2 },
  msgText: { color: colors.text, fontSize: 15, lineHeight: 20 },
  msgTextMine: { color: '#fff'},
  msgImage: {
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  imageTime: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
    marginRight: 2,
  },
  imageTimeMine: { color: colors.textFaint },
  videoThumb: {
    width: VIDEO_THUMB_W,
    height: VIDEO_THUMB_H,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: '#111827',
  },
  videoThumbPlayer: { width: '100%', height: '100%'},
  playBadge: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  playIcon: { color: '#fff', fontSize: 36, marginLeft: 4 },
  fileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    marginBottom: 4,
    maxWidth: 220,
  },
  fileChipMine: { backgroundColor: 'rgba(255,255,255,0.2)'},
  fileIcon: { fontSize: 18 },
  fileName: { color: colors.text, fontSize: 14, flexShrink: 1 },
  msgTimeInline: { color: colors.textMuted, fontSize: 10, lineHeight: 20 },
  msgTime: { color: colors.textMuted, fontSize: 10 },
  msgTimeMine: { color: 'rgba(255,255,255,0.8)'},
  msgMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, alignSelf: 'flex-end'},
  msgEdited: { color: colors.textMuted, fontSize: 10, fontStyle: 'italic'},
  msgEditedMine: { color: 'rgba(255,255,255,0.65)'},
  editBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: 4,
    backgroundColor: colors.primary + '15',
  },
  editLabel: { color: colors.primary, fontSize: 13, fontWeight: '600'},
  editCancel: { color: colors.danger, fontSize: 13, fontWeight: '600'},
  composer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  voiceBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: 4,
    backgroundColor: colors.danger + '12',
  },
  voiceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
  },
  voiceText: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '600'},
  voiceHint: { color: colors.textMuted, fontSize: 11 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.md,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  attachBtn: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachIcon: { fontSize: 24, color: colors.primary, lineHeight: 26 },
  sendBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  sendBtnDisabled: { opacity: 0.45 },
  sendText: { color: '#fff', fontWeight: '700' },
});
