import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Image, KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { localPhoneDigits, normalizeMongolianPhone } from '../lib/phone';
import * as api from '../services/employeeAuthService';
import AmbientBackground from '../components/AmbientBackground';
import { useTheme, useStyles } from '../context/ThemeContext';

export default function EmployeePhoneAuthScreen({ onBack }) {
  const s = useStyles(makeStyles);
  const { colors } = useTheme();
  const { completeEmployeeTokenLogin } = require('../context/AppContext').useApp();
  const [mode, setMode] = useState('phone'); const [phone, setPhone] = useState('');
  const [session, setSession] = useState(null); const [pin, setPin] = useState(''); const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false); const [error, setError] = useState(''); const [seconds, setSeconds] = useState(0); const checking = useRef(false);
  const check = async () => {
    if (!session?.sessionId || checking.current) return; checking.current = true; setLoading(true);
    try { const next = await api.checkVerification(session.sessionId); setSession((old) => ({ ...old, ...next })); if (next.status === 'VERIFIED') { setMode('pinSetup'); setError(''); } else if (next.status === 'EXPIRED') setError('Баталгаажуулах хугацаа дууссан байна.'); }
    catch (e) { setError(e.message); } finally { checking.current = false; setLoading(false); }
  };
  useEffect(() => {
    if (mode !== 'verify') return undefined;
    const timer = setInterval(() => { setSeconds(Math.max(0, Math.ceil((Date.parse(session.expiresAt) - Date.now()) / 1000))); check(); }, 3000);
    const sub = AppState.addEventListener('change', (state) => { if (state === 'active') check(); }); check();
    return () => { clearInterval(timer); sub.remove(); };
  }, [mode, session?.sessionId]);
  const start = async () => {
    try { normalizeMongolianPhone(phone); setLoading(true); setError(''); const next = await api.startVerification(phone, 'PHONE_ACTIVATION'); if (next.activated) { setMode('login'); return; } setSession(next); setMode('verify'); }
    catch (e) { setError(e.message); } finally { setLoading(false); }
  };
  const login = async () => {
    if (!/^\d{4}$/.test(pin)) return setError('Нэвтрэх код 4 оронтой байна.');
    try { setLoading(true); setError(''); const result = await api.loginWithPin(phone, pin); await completeEmployeeTokenLogin(result.customToken); }
    catch (e) { setError(e.message); } finally { setLoading(false); }
  };
  const savePin = async () => {
    if (pin !== confirmPin) return setError('PIN давталт тохирохгүй байна.');
    try { setLoading(true); setError(''); const result = await api.setPin(session.sessionId, session.verificationToken, pin); await completeEmployeeTokenLogin(result.customToken); }
    catch (e) { setError(e.message); } finally { setLoading(false); }
  };
  const back = async () => { if (mode === 'verify' && session) await api.cancelVerification(session.sessionId).catch(() => {}); if (mode === 'phone') onBack?.(); else { setMode('phone'); setSession(null); setPin(''); setConfirmPin(''); setError(''); } };
  return <SafeAreaView style={s.safe}><AmbientBackground/><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView contentContainerStyle={s.wrap} keyboardShouldPersistTaps="handled">
    {onBack ? <TouchableOpacity onPress={back} style={s.back}><Text style={s.backText}>‹</Text></TouchableOpacity> : null}<Image source={require('../../assets/logo.png')} style={s.logo} resizeMode="contain" />
    <Text style={s.title}>{mode === 'verify' ? 'Утас баталгаажуулах' : mode === 'pinSetup' ? 'Нэвтрэх код үүсгэх' : mode === 'login' ? 'Нэвтрэх кодоо оруулна уу' : 'Утасны дугаараа оруулна уу'}</Text>
    {mode === 'verify' ? <Text style={s.subtitle}>{session?.displayInstruction}</Text> : null}
    {mode === 'pinSetup' ? <Text style={s.subtitle}>Мартахгүй 4 оронтой кодоо хоёр удаа оруулна уу</Text> : null}
    {mode === 'phone' && <View style={s.phoneRow}><Image source={{ uri: 'https://em-content.zobj.net/source/emoji-one/5/flag-for-mongolia_1f1f2-1f1f3.png' }} style={s.flag} resizeMode="contain" accessibilityLabel="Монгол Улсын далбаа"/><Text style={s.code}>+976</Text><TextInput value={phone} onChangeText={(v) => setPhone(localPhoneDigits(v))} keyboardType="number-pad" maxLength={8} placeholder="9911 2233" placeholderTextColor={colors.textFaint} style={s.phoneInput}/></View>}
    {mode === 'verify' && <><TouchableOpacity style={s.codeCard} onPress={() => Linking.openURL(session.smsUri)}><Text style={s.smsCode}>{session.displayCode}</Text><Text style={s.shortcode}>144773 дугаарт илгээнэ</Text></TouchableOpacity><Text style={s.price}>SMS-ийн төлбөр 150₮. Та Messages апп дээр Send дарна.</Text><Text style={s.timer}>{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</Text><TouchableOpacity style={s.secondary} onPress={() => Linking.openURL(session.smsUri)}><Text style={s.secondaryText}>Open Messages</Text></TouchableOpacity><TouchableOpacity style={s.secondary} onPress={check}><Text style={s.secondaryText}>Check verification</Text></TouchableOpacity></>}
    {mode === 'login' && <TextInput value={pin} onChangeText={(v) => setPin(v.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" secureTextEntry maxLength={4} placeholder="••••" placeholderTextColor={colors.textFaint} style={s.pin}/>}
    {mode === 'pinSetup' && <><TextInput value={pin} onChangeText={(v) => setPin(v.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" secureTextEntry maxLength={4} placeholder="••••" placeholderTextColor="#777" style={s.pin}/><TextInput value={confirmPin} onChangeText={(v) => setConfirmPin(v.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" secureTextEntry maxLength={4} placeholder="Кодоо давтах" placeholderTextColor="#777" style={s.pin}/></>}
    {!!error && <Text style={s.error}>{error}</Text>}
    {loading && <ActivityIndicator color={colors.primary} style={{ margin: 10 }}/>}{mode === 'phone' && <TouchableOpacity disabled={loading} style={s.primary} onPress={start}><Text style={s.primaryText}>Үргэлжлүүлэх</Text></TouchableOpacity>}
    {mode === 'login' && <TouchableOpacity disabled={loading} style={s.primary} onPress={login}><Text style={s.primaryText}>Нэвтрэх</Text></TouchableOpacity>}
    {mode === 'pinSetup' && <TouchableOpacity disabled={loading} style={s.primary} onPress={savePin}><Text style={s.primaryText}>PIN хадгалах</Text></TouchableOpacity>}
  </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}
const makeStyles = ({ colors }) => StyleSheet.create({ safe:{flex:1,backgroundColor:colors.background},wrap:{flexGrow:1,padding:24,justifyContent:'center'},back:{position:'absolute',top:18,left:22,zIndex:2,width:44,height:44,borderRadius:22,backgroundColor:colors.surfaceContainerHigh,alignItems:'center',justifyContent:'center'},backText:{color:colors.text,fontSize:36,lineHeight:38},logo:{width:120,height:100,alignSelf:'center',marginBottom:24},title:{color:colors.text,fontSize:28,fontWeight:'800',textAlign:'center',marginBottom:32},subtitle:{color:colors.textMuted,fontSize:15,textAlign:'center',lineHeight:22,marginTop:-20,marginBottom:32},phoneRow:{height:64,borderRadius:18,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.borderHi,flexDirection:'row',alignItems:'center',paddingHorizontal:16},flag:{width:30,height:22,borderRadius:3},code:{color:colors.text,fontSize:17,fontWeight:'700',marginHorizontal:10},phoneInput:{flex:1,color:colors.text,fontSize:19,letterSpacing:1},primary:{backgroundColor:colors.primary,borderRadius:18,height:60,alignItems:'center',justifyContent:'center',marginTop:20},primaryText:{color:colors.onPrimary,fontSize:17,fontWeight:'800'},secondary:{borderWidth:1,borderColor:colors.primary,borderRadius:16,height:52,alignItems:'center',justifyContent:'center',marginTop:12},secondaryText:{color:colors.primary,fontWeight:'700'},codeCard:{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.primary,borderRadius:22,padding:28,alignItems:'center'},smsCode:{color:colors.text,fontSize:46,fontWeight:'900',letterSpacing:10},shortcode:{color:colors.textMuted,marginTop:12},price:{color:colors.warning,fontSize:12,textAlign:'center',marginTop:14},timer:{color:colors.text,fontSize:18,textAlign:'center',marginTop:14},pin:{height:64,borderRadius:18,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.borderHi,color:colors.text,fontSize:26,textAlign:'center',letterSpacing:12,marginBottom:14},error:{color:colors.danger,textAlign:'center',marginTop:14}});
