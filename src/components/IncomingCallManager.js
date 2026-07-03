<<<<<<< HEAD
import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import VideoCallModal from './VideoCallModal';
import CallScreen from './CallScreen';
import * as callApi from '../services/callService';
import { startIncomingCallAlert, stopIncomingCallAlert } from '../services/callAlertService';
import {
  isNativeIncomingCallAvailable,
  showNativeIncomingCall,
  hideNativeIncomingCall,
} from '../services/nativeIncomingCallService';
import { incomingCallBridge } from '../lib/incomingCallBridge';
=======
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { useApp } from '../context/AppContext';
import VideoCallModal from './VideoCallModal';
import * as callApi from '../services/callService';
import { startIncomingCallAlert, stopIncomingCallAlert } from '../services/callAlertService';
import { colors, spacing, radius } from '../theme';
>>>>>>> c08b25b (first commit)

export default function IncomingCallManager() {
  const { isCloud, currentUser } = useApp();
  const [incoming, setIncoming] = useState(null);
  const [inCall, setInCall] = useState(null);
<<<<<<< HEAD
  const incomingRef = useRef(null);
  const useNative = isNativeIncomingCallAvailable();

  useEffect(() => {
    incomingRef.current = incoming;
  }, [incoming]);

  // Supabase realtime — над руу ирж буй дуудлага
  useEffect(() => {
    if (!isCloud || !currentUser?.id) return;
    const unsub = callApi.subscribeIncomingCalls(currentUser.id, async (call) => {
      if (call.status !== 'ringing') return;
      const fresh = Date.now() - new Date(call.created_at).getTime() < 60000;
      if (!fresh) return;
      setIncoming(call);
      if (useNative) {
        // Утасны жинхэнэ дуудлагын дэлгэц (өөрийн ringtone-той)
        showNativeIncomingCall(call);
      } else {
        await startIncomingCallAlert(call.caller_name);
=======

  useEffect(() => {
    if (!isCloud || !currentUser?.id) return;
    const unsub = callApi.subscribeIncomingCalls(currentUser.id, async (call) => {
      if (call.status === 'ringing') {
        const fresh = Date.now() - new Date(call.created_at).getTime() < 60000;
        if (fresh) {
          setIncoming(call);
          await startIncomingCallAlert(call.caller_name);
        }
>>>>>>> c08b25b (first commit)
      }
    });
    return () => {
      unsub();
      stopIncomingCallAlert();
    };
<<<<<<< HEAD
  }, [isCloud, currentUser?.id, useNative]);

  // Native дуудлагын дэлгэцээс ирэх answer / decline / timeout
  useEffect(() => {
    const unsub = incomingCallBridge.subscribe(({ type, data }) => {
      // incomingRef хоосон байвал (push-аар ирсэн) payload-оос сэргээнэ
      const call =
        incomingRef.current ||
        (data?.callId
          ? { id: data.callId, room: data.room, caller_id: data.callerId, caller_name: data.callerName }
          : null);
      if (!call) return;
      if (type === 'answer') {
        acceptCall(call);
      } else {
        declineCall(call, type === 'timeout' ? 'ended' : 'declined');
      }
    });
    return unsub;
  }, []);
=======
  }, [isCloud, currentUser?.id]);
>>>>>>> c08b25b (first commit)

  useEffect(() => {
    if (!incoming) stopIncomingCallAlert();
  }, [incoming]);

<<<<<<< HEAD
  const acceptCall = async (call) => {
    if (!call) return;
    await stopIncomingCallAlert();
    hideNativeIncomingCall();
    try {
      await callApi.setCallStatus(call.id, 'accepted');
    } catch (e) {}
    setInCall(call);
    setIncoming(null);
  };

  const declineCall = async (call, status = 'declined') => {
    if (!call) return;
    await stopIncomingCallAlert();
    hideNativeIncomingCall();
    try {
      await callApi.setCallStatus(call.id, status);
=======
  const accept = async () => {
    if (!incoming) return;
    await stopIncomingCallAlert();
    try {
      await callApi.setCallStatus(incoming.id, 'accepted');
    } catch (e) {}
    setInCall(incoming);
    setIncoming(null);
  };

  const decline = async () => {
    if (!incoming) return;
    await stopIncomingCallAlert();
    try {
      await callApi.setCallStatus(incoming.id, 'declined');
>>>>>>> c08b25b (first commit)
    } catch (e) {}
    setIncoming(null);
  };

  const endCall = async () => {
    if (inCall) {
      try {
        await callApi.setCallStatus(inCall.id, 'ended');
      } catch (e) {}
    }
    setInCall(null);
  };

  const caller = incoming?.caller_name || 'Ажилтан';

  return (
    <>
<<<<<<< HEAD
      {/* Native ажиллахгүй үед (iOS г.м) л апп доторх дуудлагын дэлгэц харуулна */}
      {!useNative ? (
        <CallScreen
          visible={!!incoming}
          mode="incoming"
          name={caller}
          video
          onAccept={() => acceptCall(incoming)}
          onDecline={() => declineCall(incoming, 'declined')}
        />
      ) : null}
=======
      <Modal visible={!!incoming} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.card}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{caller.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={styles.caller}>{caller}</Text>
            <Text style={styles.sub}>видео дуудлага руу залгаж байна</Text>
            <View style={styles.actions}>
              <TouchableOpacity style={[styles.btn, styles.decline]} onPress={decline}>
                <Text style={styles.btnIcon}></Text>
                <Text style={styles.btnText}>Татгалзах</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.accept]} onPress={accept}>
                <Text style={styles.btnIcon}></Text>
                <Text style={styles.btnText}>Хариулах</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
>>>>>>> c08b25b (first commit)

      <VideoCallModal
        visible={!!inCall}
        room={inCall ? `gennetex-${inCall.room}` : ''}
        name={currentUser?.name}
        onClose={endCall}
      />
    </>
  );
}
<<<<<<< HEAD
=======

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#000000dd', alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl, alignItems: 'center', width: '100%'},
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  avatarText: { color: colors.primary, fontSize: 40, fontWeight: '900'},
  caller: { color: colors.text, fontSize: 22, fontWeight: '900'},
  sub: { color: colors.textMuted, fontSize: 14, marginTop: 4, textAlign: 'center'},
  actions: { flexDirection: 'row', gap: spacing.xl, marginTop: spacing.xl },
  btn: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderRadius: radius.lg, minWidth: 120 },
  accept: { backgroundColor: colors.success },
  decline: { backgroundColor: colors.danger },
  btnIcon: { color: '#fff', fontSize: 22, fontWeight: '900'},
  btnText: { color: '#fff', fontWeight: '800', marginTop: 4 },
});
>>>>>>> c08b25b (first commit)
