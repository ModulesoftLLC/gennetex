import React, { useEffect, useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SelfieCamera from '../components/SelfieCamera';
import { Button } from '../components/ui';
import { useApp } from '../context/AppContext';
import { useStyles } from '../context/ThemeContext';
import { spacing, radius } from '../theme';
import * as attendance from '../services/attendanceService';
import * as face from '../services/faceService';

const HINTS = ['Эгц хараарай', 'Толгойгоо бага зэрэг зүүн эргүүлээрэй', 'Толгойгоо бага зэрэг баруун эргүүлээрэй', 'Эрүүгээ үл ялиг дээшлүүлээрэй'];

export default function FaceEnrollmentGateScreen({ initialCount = 0, onComplete }) {
  const styles = useStyles(makeStyles);
  const { currentUser, updateMyProfile, signOut } = useApp();
  const [count, setCount] = useState(initialCount);
  const [camera, setCamera] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { setCount(initialCount); }, [initialCount]);

  const capture = async (photo) => {
    if (busy || !currentUser?.id) return;
    setBusy(true); setError('');
    try {
      const photoUrl = await attendance.uploadSelfie(photo.uri, currentUser.id);
      const result = await face.insertEnrollment({ photoUrl, localUri: photo.uri });
      const next = Number(result.count ?? count + 1);
      setCount(next);
      if (result.complete || next >= face.ENROLL_TARGET) {
        await updateMyProfile({ face_enrolled: true });
        setCamera(false);
        Alert.alert('Бүртгэл амжилттай', 'Таны царай 10 удаагийн өгөгдлөөр хамгаалагдан бүртгэгдлээ.', [{ text: 'Апп руу орох', onPress: onComplete }]);
      }
    } catch (e) {
      const message = e?.message || 'Царай бүртгэж чадсангүй.';
      setError(message);
      Alert.alert('Нүүр бүртгэлийн алдаа', message);
    } finally { setBusy(false); }
  };

  return <SafeAreaView style={styles.safe}>
    <View style={styles.content}>
      <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
      <Text style={styles.eyebrow}>АЮУЛГҮЙ НЭВТРЭЛТ</Text>
      <Text style={styles.title}>Царайгаа бүртгүүлнэ үү</Text>
      <Text style={styles.subtitle}>Үндсэн апп руу орохын өмнө царайгаа 10 удаа өөр өнцгөөр баталгаажуулна. Дараа нь “Ирц” дээр нэг selfie авахад автоматаар танина.</Text>
      <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.min(100, count / face.ENROLL_TARGET * 100)}%` }]} /></View>
      <Text style={styles.count}>{count} / {face.ENROLL_TARGET}</Text>
      {!!error && <Text style={styles.error}>{error}</Text>}
      <Button title="Камер үргэлжлүүлэх" onPress={() => setCamera(true)} />
      <Button title="Гарах" variant="ghost" style={{ marginTop: spacing.sm }} onPress={signOut} />
    </View>
    <SelfieCamera visible={camera} busy={busy} auto autoDelayMs={1600} progressText={`Нүүр бүртгэл ${count}/${face.ENROLL_TARGET}`} hint={HINTS[count % HINTS.length]} onCapture={capture} onClose={() => { setCamera(false); signOut(); }} />
  </SafeAreaView>;
}

const makeStyles = ({ colors }) => StyleSheet.create({safe:{flex:1,backgroundColor:colors.background},content:{flex:1,justifyContent:'center',padding:spacing.xl,maxWidth:520,width:'100%',alignSelf:'center'},logo:{width:100,height:82,alignSelf:'center',marginBottom:spacing.lg},eyebrow:{color:colors.primary,fontSize:11,fontWeight:'900',letterSpacing:1.5,textAlign:'center'},title:{color:colors.text,fontSize:28,fontWeight:'900',textAlign:'center',marginTop:8},subtitle:{color:colors.textMuted,fontSize:14,lineHeight:21,textAlign:'center',marginTop:12,marginBottom:spacing.xl},progressTrack:{height:12,borderRadius:radius.pill,backgroundColor:colors.surfaceContainerHigh,overflow:'hidden'},progressFill:{height:'100%',borderRadius:radius.pill,backgroundColor:colors.primary},count:{color:colors.text,fontSize:18,fontWeight:'900',textAlign:'center',marginVertical:spacing.lg},error:{color:colors.danger,textAlign:'center',marginBottom:spacing.md}});
