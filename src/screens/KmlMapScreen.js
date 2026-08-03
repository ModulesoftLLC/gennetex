import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { WebView } from 'react-native-webview';
import { ScreenHeader } from '../components/ui';
import { useTheme, useStyles } from '../context/ThemeContext';

const SONGINOHAIRKHAN = require('../../assets/kml/songinohairkhan.json');
const BAYANGOL = require('../../assets/kml/bayangol.json');

const MAPS_API_KEY =
  Constants.expoConfig?.android?.config?.googleMaps?.apiKey ||
  Constants.manifest2?.extra?.expoClient?.android?.config?.googleMaps?.apiKey ||
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  '';

const LAYERS = {
  songinohairkhan: {
    title: 'Сонгинохайрхан дүүрэг',
    subtitle: 'Сүлжээ, хил зааг, цэгүүд',
    color: '#1565C0',
    data: SONGINOHAIRKHAN,
  },
  bayangol: {
    title: 'Баянгол бүх он сүлжээ',
    subtitle: 'Сүлжээ болон цэгүүд',
    color: '#E65100',
    data: BAYANGOL,
  },
};

function mapHtml(apiKey) {
  return `<!doctype html>
<html><head><meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no,width=device-width"/>
<style>html,body,#map{height:100%;width:100%;margin:0;padding:0;background:#e8edf3}.notice{position:fixed;z-index:2;bottom:18px;left:16px;right:16px;padding:10px 12px;border-radius:10px;background:#ffffffeb;color:#344054;font:13px Arial;text-align:center;box-shadow:0 2px 8px #0003}</style>
</head><body><div id="map"></div><div class="notice" id="notice">Газрын зургийг ачаалж байна...</div>
<script>
let map, overlays=[], pointFeatures=[], pointsVisible=false;
const notice=(text)=>document.getElementById('notice').textContent=text;
function clearLayer(){overlays.forEach(x=>x.setMap(null));overlays=[];pointFeatures=[];}
function fit(bounds){if(!bounds.isEmpty()) map.fitBounds(bounds,{top:48,right:36,bottom:48,left:36});}
function renderPoints(){
  if(!map) return;
  const zoom=map.getZoom()||0;
  const shouldShow=zoom>=15;
  if(shouldShow===pointsVisible) return;
  pointsVisible=shouldShow;
  pointFeatures.forEach(marker=>marker.setMap(shouldShow?map:null));
  notice(shouldShow ? 'Бүх цэгийг харуулж байна' : 'Цэгүүдийг харахын тулд газрын зургийг ойртуулна уу');
}
function loadLayer(payload){
  clearLayer(); pointsVisible=false;
  const {data,color,title}=payload;
  const bounds=new google.maps.LatLngBounds();
  (data.lines||[]).forEach(item=>{
    const path=item.c.map(([lng,lat])=>({lat,lng}));
    if(path.length<2) return;
    path.forEach(p=>bounds.extend(p));
    overlays.push(new google.maps.Polyline({path,strokeColor:color,strokeOpacity:.88,strokeWeight:2,map}));
  });
  (data.polygons||[]).forEach(item=>{
    const paths=item.c.map(ring=>ring.map(([lng,lat])=>({lat,lng})));
    paths.flat().forEach(p=>bounds.extend(p));
    overlays.push(new google.maps.Polygon({paths,strokeColor:color,strokeOpacity:.9,strokeWeight:2,fillColor:color,fillOpacity:.10,map}));
  });
  (data.points||[]).forEach(item=>{
    const position={lat:item.c[1],lng:item.c[0]}; bounds.extend(position);
    const marker=new google.maps.Marker({position,title:item.n||title,icon:{path:google.maps.SymbolPath.CIRCLE,scale:3,fillColor:color,fillOpacity:.85,strokeColor:'#fff',strokeWeight:1}});
    pointFeatures.push(marker);
  });
  fit(bounds);
  renderPoints();
  window.ReactNativeWebView?.postMessage(JSON.stringify({type:'loaded',title,lines:(data.lines||[]).length,polygons:(data.polygons||[]).length,points:(data.points||[]).length}));
}
function initMap(){
  map=new google.maps.Map(document.getElementById('map'),{center:{lat:47.92,lng:106.91},zoom:11,mapTypeControl:true,streetViewControl:false,fullscreenControl:false,gestureHandling:'greedy'});
  map.addListener('zoom_changed',renderPoints);
  notice('Layer сонгоно уу');
  window.ReactNativeWebView?.postMessage(JSON.stringify({type:'ready'}));
}
window.addEventListener('error',e=>window.ReactNativeWebView?.postMessage(JSON.stringify({type:'error',message:e.message})));
</script><script async src="https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&callback=initMap"></script></body></html>`;
}

export default function KmlMapScreen() {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const webRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState('songinohairkhan');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const html = useMemo(() => mapHtml(MAPS_API_KEY), []);

  const openLayer = useCallback((key) => {
    const layer = LAYERS[key];
    if (!layer) return;
    setSelected(key);
    setLoading(true);
    const payload = JSON.stringify({
      title: layer.title,
      color: layer.color,
      data: layer.data,
    });
    webRef.current?.injectJavaScript(`loadLayer(${payload}); true;`);
  }, []);

  const onMessage = useCallback((event) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (message.type === 'ready') {
        setReady(true);
        openLayer('songinohairkhan');
      } else if (message.type === 'loaded') {
        setLoading(false);
        setError(null);
      } else if (message.type === 'error') {
        setError(message.message || 'Газрын зураг ачаалж чадсангүй');
        setLoading(false);
      }
    } catch {
      setError('Газрын зургийн layer хариу уншигдсангүй');
      setLoading(false);
    }
  }, [openLayer]);

  if (!MAPS_API_KEY) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="KML газрын зураг" />
        <View style={styles.center}><Text style={styles.error}>Google Maps API key тохируулагдаагүй байна.</Text></View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <ScreenHeader title="KML газрын зураг" subtitle="Google Earth файл · app дотор" />
        <View style={styles.layerBar}>
          {Object.entries(LAYERS).map(([key, layer]) => (
            <TouchableOpacity
              key={key}
              style={[styles.layerButton, selected === key && { backgroundColor: layer.color, borderColor: layer.color }]}
              onPress={() => openLayer(key)}
              disabled={!ready}
            >
              <Ionicons name="layers-outline" size={17} color={selected === key ? '#fff' : layer.color} />
              <Text style={[styles.layerText, selected === key && styles.layerTextSelected]} numberOfLines={1}>{layer.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>
      <WebView
        ref={webRef}
        source={{ html }}
        style={styles.map}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        onMessage={onMessage}
        onError={() => { setError('Газрын зургийн сүлжээний холболт амжилтгүй боллоо'); setLoading(false); }}
      />
      {loading ? <View style={styles.loading}><ActivityIndicator color={colors.primary} /><Text style={styles.loadingText}>KML layer ачаалж байна...</Text></View> : null}
      {error ? <View style={styles.errorBox}><Text style={styles.error}>{error}</Text></View> : null}
    </View>
  );
}

const makeStyles = ({ colors }) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  safe: { backgroundColor: colors.surface },
  layerBar: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingBottom: 10 },
  layerButton: { flex: 1, minWidth: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, paddingVertical: 10, paddingHorizontal: 7, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  layerText: { color: colors.text, fontSize: 12, fontWeight: '700', flexShrink: 1 },
  layerTextSelected: { color: '#fff' },
  map: { flex: 1 },
  loading: { position: 'absolute', top: 128, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, backgroundColor: colors.surface, elevation: 4 },
  loadingText: { color: colors.text, fontSize: 12, fontWeight: '700' },
  errorBox: { position: 'absolute', bottom: 24, left: 16, right: 16, padding: 12, borderRadius: 10, backgroundColor: '#FEE2E2' },
  error: { color: '#B91C1C', textAlign: 'center', fontSize: 13 },
  center: { flex: 1, justifyContent: 'center', padding: 24 },
});
