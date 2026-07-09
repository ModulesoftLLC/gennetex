import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { plateCompactText } from '../lib/mongoliaPlate';
import { PLATE_MGL_SVG, PLATE_SOYMBOL_SVG } from '../lib/plateAssets';

const SIZES = {
  sm: { font: 15, soyW: 8, soyH: 17, mglW: 24, mglH: 13, padH: 10, padV: 4, gap: 5 },
  md: { font: 18, soyW: 10, soyH: 19, mglW: 30, mglH: 16, padH: 12, padV: 5, gap: 6 },
  lg: { font: 24, soyW: 12, soyH: 23, mglW: 38, mglH: 20, padH: 14, padV: 7, gap: 8 },
};

/** autobox.mn загвар: соёмбо + 5394УКК + MGL */
export default function MongoliaPlate({ plate, size = 'md', style }) {
  const s = SIZES[size] || SIZES.md;
  const text = plateCompactText(plate);

  return (
    <View
      style={[
        styles.shell,
        {
          paddingHorizontal: s.padH,
          paddingVertical: s.padV,
          gap: s.gap,
        },
        style,
      ]}
    >
      <SvgXml xml={PLATE_SOYMBOL_SVG} width={s.soyW} height={s.soyH} />
      <Text style={[styles.text, { fontSize: s.font }]} numberOfLines={1}>
        {text}
      </Text>
      <SvgXml xml={PLATE_MGL_SVG} width={s.mglW} height={s.mglH} />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DEE2E6',
    borderRadius: 8,
  },
  text: {
    color: '#111111',
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
