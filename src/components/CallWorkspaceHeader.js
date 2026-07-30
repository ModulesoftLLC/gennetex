import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useStyles } from '../context/ThemeContext';

export default function CallWorkspaceHeader({ title, userName, mode = 'list', onList, onMap }) {
  const { colors } = useTheme(); const styles = useStyles(makeStyles);
  return <View style={styles.shell}>
    <View style={styles.brandRow}><View style={styles.brand}><Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain"/><Text style={styles.title}>{title}</Text></View><View style={styles.user}><Text style={styles.userName} numberOfLines={1}>{userName || ''}</Text><Ionicons name="notifications-outline" size={27} color={colors.text}/></View></View>
    <View style={styles.tabs}><TouchableOpacity style={[styles.tab,mode==='list'&&styles.tabActive]} onPress={onList}><Text style={[styles.tabText,mode==='list'&&styles.tabTextActive]}>Жагсаалт</Text></TouchableOpacity><TouchableOpacity style={[styles.tab,mode==='map'&&styles.tabActive]} onPress={onMap}><Text style={[styles.tabText,mode==='map'&&styles.tabTextActive]}>Map</Text></TouchableOpacity></View>
  </View>;
}
const makeStyles=({colors,shadow})=>StyleSheet.create({shell:{backgroundColor:colors.background,paddingTop:12},brandRow:{minHeight:78,paddingHorizontal:20,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},brand:{flexDirection:'row',alignItems:'center',flex:1},logo:{width:58,height:52},title:{color:colors.text,fontSize:25,fontWeight:'800',marginLeft:8},user:{flexDirection:'row',alignItems:'center',gap:10,maxWidth:'45%'},userName:{color:colors.text,fontSize:15,flexShrink:1},tabs:{height:58,backgroundColor:colors.surfaceAlt,borderRadius:12,flexDirection:'row',overflow:'hidden'},tab:{flex:1,alignItems:'center',justifyContent:'center'},tabActive:{backgroundColor:colors.surface,...shadow.sm},tabText:{color:colors.textMuted,fontSize:20},tabTextActive:{color:colors.text,fontWeight:'700'}});
