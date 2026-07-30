import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, useStyles } from '../context/ThemeContext';

const JITSI_DOMAIN = 'meet.ffmuc.net';

function buildHtml(room, name) {
  const safeRoom = String(room).replace(/[^a-zA-Z0-9_-]/g, '');
  const safeName = String(name || 'Ажилтан').replace(/["'<>]/g, '');
  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/><style>html,body,#meet{height:100%;margin:0;background:#05070b;overflow:hidden}iframe{background:#05070b}</style></head><body><div id="meet"></div><script src="https://${JITSI_DOMAIN}/external_api.js"></script><script>
  var api;
  function send(type, data) { if(window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({type:type,data:data||{}})); }
  function command(raw) { try { var m=typeof raw==='string'?JSON.parse(raw):raw; if(!api||!m)return; if(m.command==='hangup')api.executeCommand('hangup'); if(m.command==='audio')api.executeCommand('toggleAudio'); if(m.command==='video')api.executeCommand('toggleVideo'); if(m.command==='camera')api.executeCommand('toggleCamera'); if(m.command==='tile')api.executeCommand('toggleTileView'); } catch(e){} }
  window.addEventListener('message',function(e){command(e.data)}); document.addEventListener('message',function(e){command(e.data)});
  function start(){try{api=new JitsiMeetExternalAPI('${JITSI_DOMAIN}',{roomName:'${safeRoom}',parentNode:document.getElementById('meet'),width:'100%',height:'100%',userInfo:{displayName:'${safeName}'},configOverwrite:{prejoinPageEnabled:false,disableDeepLinking:true,disableThirdPartyRequests:true,startWithAudioMuted:false,startWithVideoMuted:false,resolution:720,constraints:{video:{height:{ideal:720,max:720,min:360},width:{ideal:1280,max:1280,min:640},frameRate:{ideal:30,max:30,min:15}}},p2p:{enabled:true,preferH264:true},disableSimulcast:false,channelLastN:2,enableLayerSuspension:true,enableNoAudioDetection:true,enableNoisyMicDetection:true},interfaceConfigOverwrite:{MOBILE_APP_PROMO:false,SHOW_JITSI_WATERMARK:false,SHOW_BRAND_WATERMARK:false,TOOLBAR_BUTTONS:[],SETTINGS_SECTIONS:[],DISABLE_JOIN_LEAVE_NOTIFICATIONS:true,VIDEO_LAYOUT_FIT:'both'}});
    api.addEventListener('videoConferenceJoined',function(e){send('joined',e)}); api.addEventListener('participantJoined',function(e){send('participantJoined',e)}); api.addEventListener('participantLeft',function(e){send('participantLeft',e)}); api.addEventListener('audioMuteStatusChanged',function(e){send('audio',e)}); api.addEventListener('videoMuteStatusChanged',function(e){send('video',e)}); api.addEventListener('readyToClose',function(){send('close')});
  }catch(e){send('error',{message:e.message})}}
  if(window.JitsiMeetExternalAPI)start();else{var t=setInterval(function(){if(window.JitsiMeetExternalAPI){clearInterval(t);start()}},200)}
  </script></body></html>`;
}

function durationLabel(seconds) {
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function Control({ icon, label, active, danger, onPress }) {
  const styles = useStyles(makeStyles);
  return <View style={styles.controlCol}><TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[styles.control, active && styles.controlActive, danger && styles.controlDanger]} accessibilityRole="button" accessibilityLabel={label}><Ionicons name={icon} size={danger ? 29 : 24} color="#fff" /></TouchableOpacity><Text style={styles.controlLabel}>{label}</Text></View>;
}

export default function VideoCallModal({ visible, room, name, peerName, onClose }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const webRef = useRef(null);
  const [joined, setJoined] = useState(false);
  const [participants, setParticipants] = useState(1);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [tile, setTile] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) { setJoined(false); setParticipants(1); setMuted(false); setCameraOff(false); setTile(false); setSeconds(0); setError(''); return; }
    const timer = setInterval(() => { if (joined) setSeconds((value) => value + 1); }, 1000);
    return () => clearInterval(timer);
  }, [visible, joined]);

  const command = (value) => webRef.current?.postMessage(JSON.stringify({ command: value }));
  const end = () => { command('hangup'); onClose?.(); };
  const handleMessage = (event) => {
    let message;
    try { message = JSON.parse(event.nativeEvent.data); } catch (_) { return; }
    if (message.type === 'joined') setJoined(true);
    if (message.type === 'participantJoined') setParticipants((value) => value + 1);
    if (message.type === 'participantLeft') setParticipants((value) => Math.max(1, value - 1));
    if (message.type === 'audio') setMuted(!!message.data?.muted);
    if (message.type === 'video') setCameraOff(!!message.data?.muted);
    if (message.type === 'error') setError(message.data?.message || 'Дуудлагын алдаа');
    if (message.type === 'close') onClose?.();
  };

  return <Modal visible={visible} animationType="fade" onRequestClose={end} statusBarTranslucent>
    <View style={styles.container}>
      {visible ? <WebView ref={webRef} source={{ html: buildHtml(room, name), baseUrl: `https://${JITSI_DOMAIN}` }} style={styles.webview} originWhitelist={['*']} javaScriptEnabled domStorageEnabled allowsInlineMediaPlayback mediaPlaybackRequiresUserAction={false} mediaCapturePermissionGrantType="grant" userAgent={Platform.OS === 'android' ? 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36' : 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile Safari/604.1'} allowsProtectedMedia onMessage={handleMessage} /> : null}
      <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,.78)','rgba(0,0,0,0)']} style={styles.topFade} />
      <SafeAreaView style={styles.overlay} pointerEvents="box-none" edges={['top','bottom']}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.topButton} onPress={onClose}><Ionicons name="chevron-down" size={25} color="#fff" /></TouchableOpacity>
          <View style={styles.callInfo}><Text style={styles.peerName} numberOfLines={1}>{peerName || 'Видео дуудлага'}</Text><View style={styles.statusLine}><View style={[styles.qualityDot, { backgroundColor: error ? colors.danger : joined ? '#37d67a' : '#fbbf24' }]} /><Text style={styles.status}>{error || (joined ? `${durationLabel(seconds)} · ${participants} хүн · HD` : 'Холбож байна…')}</Text></View></View>
          <View style={styles.secure}><Ionicons name="lock-closed" size={13} color="#fff"/><Text style={styles.secureText}>Secure</Text></View>
        </View>
        {!joined && !error ? <View style={styles.connecting}><ActivityIndicator size="large" color="#fff"/><Text style={styles.connectingTitle}>{peerName || 'Оролцогч'} руу холбож байна</Text><Text style={styles.connectingSub}>Камер болон микрофоныг бэлдэж байна…</Text></View> : null}
        <View style={styles.bottomWrap}>
          <View style={styles.controls}>
            <Control icon={muted ? 'mic-off' : 'mic'} label={muted ? 'Дуу нээх' : 'Mute'} active={muted} onPress={() => { setMuted((v) => !v); command('audio'); }} />
            <Control icon={cameraOff ? 'videocam-off' : 'videocam'} label={cameraOff ? 'Камер нээх' : 'Камер'} active={cameraOff} onPress={() => { setCameraOff((v) => !v); command('video'); }} />
            <Control icon="camera-reverse" label="Эргүүлэх" onPress={() => command('camera')} />
            <Control icon={tile ? 'grid' : 'person'} label="Харагдац" active={tile} onPress={() => { setTile((v) => !v); command('tile'); }} />
            <Control icon="call" label="Дуусгах" danger onPress={end} />
          </View>
          <Text style={styles.powered}>GENNETEX VIDEO · encrypted connection</Text>
        </View>
      </SafeAreaView>
    </View>
  </Modal>;
}

const makeStyles = ({ colors, shadow }) => StyleSheet.create({
  container:{flex:1,backgroundColor:'#05070b'},webview:{...StyleSheet.absoluteFillObject,backgroundColor:'#05070b'},topFade:{position:'absolute',left:0,right:0,top:0,height:180},overlay:{flex:1,justifyContent:'space-between'},topBar:{flexDirection:'row',alignItems:'center',paddingHorizontal:14,paddingTop:8,gap:12},topButton:{width:44,height:44,borderRadius:22,backgroundColor:'rgba(20,24,32,.72)',alignItems:'center',justifyContent:'center'},callInfo:{flex:1,minWidth:0},peerName:{color:'#fff',fontSize:17,fontWeight:'800'},statusLine:{flexDirection:'row',alignItems:'center',gap:6,marginTop:3},qualityDot:{width:7,height:7,borderRadius:4},status:{color:'rgba(255,255,255,.78)',fontSize:12},secure:{height:34,paddingHorizontal:10,borderRadius:17,backgroundColor:'rgba(20,24,32,.72)',flexDirection:'row',alignItems:'center',gap:5},secureText:{color:'#fff',fontSize:10,fontWeight:'700'},connecting:{position:'absolute',top:'36%',alignSelf:'center',alignItems:'center',padding:24,borderRadius:24,backgroundColor:'rgba(6,9,15,.62)'},connectingTitle:{color:'#fff',fontSize:17,fontWeight:'800',marginTop:16},connectingSub:{color:'rgba(255,255,255,.68)',fontSize:12,marginTop:6},bottomWrap:{paddingHorizontal:10,paddingBottom:8},controls:{flexDirection:'row',justifyContent:'space-around',alignItems:'flex-start',paddingVertical:14,paddingHorizontal:6,borderRadius:28,backgroundColor:'rgba(15,18,25,.86)',...shadow.lg},controlCol:{alignItems:'center',width:64},control:{width:52,height:52,borderRadius:26,backgroundColor:'rgba(255,255,255,.16)',alignItems:'center',justifyContent:'center'},controlActive:{backgroundColor:'rgba(255,255,255,.32)'},controlDanger:{backgroundColor:'#ef3340'},controlLabel:{color:'#fff',fontSize:10,fontWeight:'700',marginTop:7},powered:{color:'rgba(255,255,255,.42)',fontSize:9,fontWeight:'700',letterSpacing:.8,textAlign:'center',marginTop:10}
});
