import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { parseMongoliaPlate } from '../lib/mongoliaPlate';

const SIZES = {
  sm: { width: 132, height: 66, band: 24, digits: 22, letters: 18, mgl: 8, border: 2 },
  md: { width: 180, height: 90, band: 32, digits: 30, letters: 24, mgl: 9, border: 3 },
  lg: { width: 240, height: 120, band: 40, digits: 40, letters: 32, mgl: 11, border: 3 },
};

/**
 * Монгол улсын 15×30 см дугаарын загвар (цагаан талбар, хар үсэг, MGL хөх хэсэг).
 */
export default function MongoliaPlate({ plate, size = 'md', style }) {
  const { digits, letters } = parseMongoliaPlate(plate);
  const s = SIZES[size] || SIZES.md;
  const showLetters = letters || (digits.length === 4 ? '···' : '');

  return (
    <View
      style={[
        styles.shell,
        {
          width: s.width,
          height: s.height,
          borderWidth: s.border,
          borderRadius: s.border,
        },
        style,
      ]}
    >
      <View style={[styles.band, { width: s.band }]}>
        <Text style={[styles.mgl, { fontSize: s.mgl }]}>MGL</Text>
      </View>
      <View style={styles.body}>
        <Text style={[styles.digits, { fontSize: s.digits }]} numberOfLines={1}>
          {digits || '····'}
        </Text>
        {showLetters ? (
          <Text style={[styles.letters, { fontSize: s.letters, marginLeft: s.digits * 0.15 }]} numberOfLines={1}>
            {showLetters}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderColor: '#111111',
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  band: {
    backgroundColor: '#003DA5',
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 2,
    borderRightColor: '#111111',
  },
  mgl: {
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: 0.5,
    transform: [{ rotate: '-90deg' }],
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  digits: {
    color: '#111111',
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
  },
  letters: {
    color: '#111111',
    fontWeight: '900',
    letterSpacing: 3,
  },
});
