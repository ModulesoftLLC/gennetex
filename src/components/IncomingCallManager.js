import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { useApp } from '../context/AppContext';
import VideoCallModal from './VideoCallModal';
import * as callApi from '../services/callService';
import { startIncomingCallAlert, stopIncomingCallAlert } from '../services/callAlertService';
import { spacing, radius } from '../theme';
import { useTheme, useStyles } from '../context/ThemeContext';

export default function IncomingCallManager() {
  const styles = useStyles(makeStyles);
  const { isCloud, currentUser } = useApp();
  const [incoming, setIncoming] = useState(null);
  const [inCall, setInCall] = useState(null);

  useEffect(() => {
    if (!isCloud || !currentUser?.id) return;
    const unsub = callApi.subscribeIncomingCalls(currentUser.id, async (call) => {
      if (call.status === 'ringing') {
        const fresh = Date.now() - new Date(call.created_at).getTime() < 60000;
        if (fresh) {
          setIncoming(call);
          await startIncomingCallAlert(call.caller_name);
        }
      }
    });
    return () => {
      unsub();
      stopIncomingCallAlert();
    };
  }, [isCloud, currentUser?.id]);

  useEffect(() => {
    if (!incoming) stopIncomingCallAlert();
  }, [incoming]);

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

      <VideoCallModal
        visible={!!inCall}
        room={inCall ? `gennetex-${inCall.room}` : ''}
        name={currentUser?.name}
        onClose={endCall}
      />
    </>
  );
}

const makeStyles = ({ colors }) => StyleSheet.create({
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
