import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Image, KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { localPhoneDigits, normalizeMongolianPhone } from '../lib/phone';
import * as api from '../services/employeeAuthService';
import AmbientBackground from '../components/AmbientBackground';
import { useTheme, useStyles } from '../context/ThemeContext';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

function PinKeypad({ value, onChange, title, hint, loading }) {
  const s = useStyles(makeStyles);
  const { colors } = useTheme();
  const addDigit = (digit) => {
    if (loading || value.length >= 4) return;
    onChange(`${value}${digit}`);
  };
  const erase = () => {
    if (!loading) onChange(value.slice(0, -1));
  };
  return <View style={s.pinStage}>
    <View style={s.pinBrandOrb}>
      <Image source={require('../../assets/logo.png')} style={s.pinBrandLogo} resizeMode="contain" />
    </View>
    <Text style={s.pinTitle}>{title}</Text>
    {!!hint && <Text style={s.pinHint}>{hint}</Text>}
    <View style={s.pinDots} accessibilityLabel={`${value.length} орон оруулсан`}>
      {[0, 1, 2, 3].map((index) => <View key={index} style={[s.pinDot, index < value.length && s.pinDotActive]} />)}
    </View>
    <View style={s.keypad}>
      {KEYS.map((digit) => <TouchableOpacity key={digit} style={s.key} onPress={() => addDigit(digit)} accessibilityRole="button" accessibilityLabel={`${digit}`}><Text style={s.keyText}>{digit}</Text></TouchableOpacity>)}
      <View style={s.key}><Ionicons name="scan-outline" size={21} color={colors.textMuted} /></View>
      <TouchableOpacity style={s.key} onPress={() => addDigit('0')} accessibilityRole="button" accessibilityLabel="0"><Text style={s.keyText}>0</Text></TouchableOpacity>
      <TouchableOpacity style={s.key} onPress={erase} accessibilityRole="button" accessibilityLabel="Сүүлийн тоог арилгах"><Ionicons name="backspace-outline" size={22} color={colors.text} /></TouchableOpacity>
    </View>
    {loading && <View style={s.pinProgress}><ActivityIndicator color={colors.primary} /><Text style={s.pinProgressText}>Шалгаж байна…</Text></View>}
  </View>;
}

export default function EmployeePhoneAuthScreen({ onBack }) {
  const s = useStyles(makeStyles);
  const { colors } = useTheme();
  const { completeEmployeeTokenLogin } = require('../context/AppContext').useApp();
  const [mode, setMode] = useState('phone'); const [phone, setPhone] = useState('');
  const [session, setSession] = useState(null); const [pin, setPin] = useState(''); const [confirmPin, setConfirmPin] = useState('');
  const [pinStep, setPinStep] = useState('create');
  const [verificationPurpose, setVerificationPurpose] = useState('PHONE_ACTIVATION'); const [pendingPin, setPendingPin] = useState('');
  const [loading, setLoading] = useState(false); const [error, setError] = useState(''); const [seconds, setSeconds] = useState(0); const checking = useRef(false);
  const check = async () => {
    if (!session?.sessionId || checking.current) return; checking.current = true; setLoading(true);
    try { const next = await api.checkVerification(session.sessionId); setSession((old) => ({ ...old, ...next })); if (next.status === 'VERIFIED') { setError(''); if (verificationPurpose === 'PIN_SETUP') { const result = await api.setPin(session.sessionId, next.verificationToken, pendingPin); await completeEmployeeTokenLogin(result.customToken); } else { setMode('pinSetup'); } } else if (next.status === 'EXPIRED') setError('Баталгаажуулах хугацаа дууссан байна.'); }
    catch (e) { setError(e.message); } finally { checking.current = false; setLoading(false); }
  };
  useEffect(() => {
    if (mode !== 'verify') return undefined;
    const timer = setInterval(() => { setSeconds(Math.max(0, Math.ceil((Date.parse(session.expiresAt) - Date.now()) / 1000))); check(); }, 3000);
    const sub = AppState.addEventListener('change', (state) => { if (state === 'active') check(); }); check();
    return () => { clearInterval(timer); sub.remove(); };
  }, [mode, session?.sessionId, verificationPurpose, pendingPin]);
  const start = async () => {
    try { normalizeMongolianPhone(phone); setLoading(true); setError(''); setVerificationPurpose('PHONE_ACTIVATION'); const next = await api.startVerification(phone, 'PHONE_ACTIVATION'); if (next.activated) { setMode('login'); return; } setSession(next); setMode('verify'); }
    catch (e) { setError(e.message); } finally { setLoading(false); }
  };
  const login = async (enteredPin = pin) => {
    if (!/^\d{4}$/.test(enteredPin)) return setError('Нэвтрэх код 4 оронтой байна.');
    try { setLoading(true); setError(''); const result = await api.loginWithPin(phone, enteredPin); await completeEmployeeTokenLogin(result.customToken); }
    catch (e) { setError(e.message); } finally { setLoading(false); }
  };
  const savePin = async (createdPin = pin, repeatedPin = confirmPin) => {
    if (!/^\d{4}$/.test(createdPin)) return setError('Нэвтрэх код 4 оронтой байна.');
    if (createdPin !== repeatedPin) { setPin(''); setConfirmPin(''); setPinStep('create'); return setError('Кодууд тохирохгүй байна. Дахин оруулна уу.'); }
    try { setLoading(true); setError(''); const next = await api.startVerification(phone, 'PIN_SETUP'); setPendingPin(createdPin); setVerificationPurpose('PIN_SETUP'); setSession(next); setMode('verify'); }
    catch (e) { setError(e.message); } finally { setLoading(false); }
  };
  const changeLoginPin = (next) => { setPin(next); setError(''); if (next.length === 4) login(next); };
  const changeSetupPin = (next) => {
    setError('');
    if (pinStep === 'create') {
      setPin(next);
      if (next.length === 4) { setPinStep('confirm'); setConfirmPin(''); }
      return;
    }
    setConfirmPin(next);
    if (next.length === 4) savePin(pin, next);
  };
  const back = async () => { if (mode === 'verify' && session) await api.cancelVerification(session.sessionId).catch(() => {}); if (mode === 'phone') onBack?.(); else { setMode('phone'); setSession(null); setPin(''); setConfirmPin(''); setPinStep('create'); setError(''); } };
  return <SafeAreaView style={s.safe}><AmbientBackground/><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView contentContainerStyle={s.wrap} keyboardShouldPersistTaps="handled">
    {onBack ? <TouchableOpacity onPress={back} style={s.back}><Text style={s.backText}>‹</Text></TouchableOpacity> : null}{mode !== 'login' && mode !== 'pinSetup' ? <Image source={require('../../assets/logo.png')} style={s.logo} resizeMode="contain" /> : null}
    {mode !== 'login' && mode !== 'pinSetup' ? <Text style={s.title}>{mode === 'verify' ? 'Утас баталгаажуулах' : 'Утасны дугаараа оруулна уу'}</Text> : null}
    {mode === 'verify' ? <Text style={s.subtitle}>{session?.displayInstruction}</Text> : null}
    {mode === 'phone' && <View style={s.phoneRow}><Image source={{ uri: 'https://em-content.zobj.net/source/emoji-one/5/flag-for-mongolia_1f1f2-1f1f3.png' }} style={s.flag} resizeMode="contain" accessibilityLabel="Монгол Улсын далбаа"/><Text style={s.code}>+976</Text><TextInput value={phone} onChangeText={(v) => setPhone(localPhoneDigits(v))} keyboardType="number-pad" maxLength={8} placeholder="9911 2233" placeholderTextColor={colors.textFaint} style={s.phoneInput}/></View>}
    {mode === 'verify' && <><TouchableOpacity style={s.codeCard} onPress={() => Linking.openURL(session.smsUri)}><Text style={s.smsCode}>{session.displayCode}</Text><Text style={s.shortcode}>144773 дугаарт илгээнэ</Text></TouchableOpacity><Text style={s.price}>SMS-ийн төлбөр 150₮. Код дээр дараад Messages апп-д Send дарна уу.</Text><Text style={s.timer}>{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</Text></>}
    {mode === 'login' && <PinKeypad value={pin} onChange={changeLoginPin} title="Нэвтрэх кодоо оруулна уу" hint="Таны 4 оронтой PIN" loading={loading} />}
    {mode === 'pinSetup' && <PinKeypad value={pinStep === 'create' ? pin : confirmPin} onChange={changeSetupPin} title={pinStep === 'create' ? 'Шинэ PIN үүсгэх' : 'PIN-ээ давтан оруулна уу'} hint={pinStep === 'create' ? 'Мартахгүй 4 оронтой код сонгоно уу' : 'Баталгаажуулахын тулд дахин оруулна уу'} loading={loading} />}
    {!!error && <Text style={s.error}>{error}</Text>}
    {loading && mode !== 'login' && mode !== 'pinSetup' && <ActivityIndicator color={colors.primary} style={{ margin: 10 }}/>} {mode === 'phone' && <TouchableOpacity disabled={loading} style={s.primary} onPress={start}><Text style={s.primaryText}>Үргэлжлүүлэх</Text></TouchableOpacity>}
  </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}
const makeStyles = ({ colors }) => StyleSheet.create({ safe:{flex:1,backgroundColor:colors.background},wrap:{flexGrow:1,padding:24,justifyContent:'center'},back:{position:'absolute',top:18,left:22,zIndex:2,width:44,height:44,borderRadius:22,backgroundColor:colors.surfaceContainerHigh,alignItems:'center',justifyContent:'center'},backText:{color:colors.text,fontSize:36,lineHeight:38},logo:{width:120,height:100,alignSelf:'center',marginBottom:24},title:{color:colors.text,fontSize:28,fontWeight:'800',textAlign:'center',marginBottom:32},subtitle:{color:colors.textMuted,fontSize:15,textAlign:'center',lineHeight:22,marginTop:-20,marginBottom:32},phoneRow:{height:64,borderRadius:18,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.borderHi,flexDirection:'row',alignItems:'center',paddingHorizontal:16},flag:{width:30,height:22,borderRadius:3},code:{color:colors.text,fontSize:17,fontWeight:'700',marginHorizontal:10},phoneInput:{flex:1,color:colors.text,fontSize:19,letterSpacing:1},primary:{backgroundColor:colors.primary,borderRadius:18,height:60,alignItems:'center',justifyContent:'center',marginTop:20},primaryText:{color:colors.onPrimary,fontSize:17,fontWeight:'800'},secondary:{borderWidth:1,borderColor:colors.primary,borderRadius:16,height:52,alignItems:'center',justifyContent:'center',marginTop:12},secondaryText:{color:colors.primary,fontWeight:'700'},codeCard:{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.primary,borderRadius:22,padding:28,alignItems:'center'},smsCode:{color:colors.text,fontSize:46,fontWeight:'900',letterSpacing:10},shortcode:{color:colors.textMuted,marginTop:12},price:{color:colors.warning,fontSize:12,textAlign:'center',marginTop:14},timer:{color:colors.text,fontSize:18,textAlign:'center',marginTop:14},error:{color:colors.danger,textAlign:'center',marginTop:14},pinStage:{width:'100%',maxWidth:340,alignSelf:'center',alignItems:'center',paddingTop:12},pinBrandOrb:{width:66,height:66,borderRadius:33,backgroundColor:colors.surfaceContainerHigh,borderWidth:1,borderColor:colors.borderHi,alignItems:'center',justifyContent:'center',marginBottom:28,shadowColor:colors.primary,shadowOpacity:.24,shadowRadius:18,shadowOffset:{width:0,height:8},elevation:8},pinBrandLogo:{width:49,height:49},pinTitle:{color:colors.text,fontSize:18,fontWeight:'800',textAlign:'center'},pinHint:{color:colors.textMuted,fontSize:13,textAlign:'center',marginTop:8},pinDots:{flexDirection:'row',gap:15,marginTop:24,marginBottom:34},pinDot:{width:12,height:12,borderRadius:6,backgroundColor:colors.surfaceContainerHigh,borderWidth:1,borderColor:colors.borderHi},pinDotActive:{backgroundColor:colors.primary,borderColor:colors.primary,transform:[{scale:1.08}]},keypad:{width:276,flexDirection:'row',flexWrap:'wrap'},key:{width:92,height:64,alignItems:'center',justifyContent:'center'},keyText:{color:colors.text,fontSize:23,fontWeight:'500'},pinProgress:{height:36,flexDirection:'row',alignItems:'center',gap:9,marginTop:8},pinProgressText:{color:colors.textMuted,fontSize:13}});
