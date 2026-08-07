import React, { useRef, useState } from 'react';
import { View, TextInput, Button, Text, StyleSheet } from 'react-native';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import { firebaseApp, firebaseAuth } from '../lib/firebase';
import { signInWithPhoneNumber } from 'firebase/auth';
import { linkOldPhoneWithServer } from '../services/phoneAuth';

// Example PhoneAuthScreen for Expo-managed apps.
// Requires: expo install expo-firebase-recaptcha
// Also ensure EXPO_PUBLIC_FIREBASE_* env vars are set (used by src/lib/firebase.js)

export default function PhoneAuthScreen({ navigation }) {
  const recaptchaRef = useRef(null);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const [status, setStatus] = useState('');

  async function sendSms() {
    try {
      setStatus('Sending SMS...');
      const appVerifier = recaptchaRef.current;
      const confirmationResult = await signInWithPhoneNumber(firebaseAuth, phone, appVerifier);
      setConfirmation(confirmationResult);
      setStatus('SMS sent. Enter code.');
    } catch (err) {
      console.error('sendSms error', err);
      setStatus('Failed to send SMS: ' + (err.message || err));
    }
  }

  async function confirmCode() {
    try {
      setStatus('Verifying code...');
      if (!confirmation) throw new Error('No confirmation result');
      const userCredential = await confirmation.confirm(code);
      setStatus('Phone sign-in successful');

      // Optionally link this phone to an existing user record server-side
      // Replace BASE_URL with your deployed Vercel URL or provide via env
      const baseUrl = process.env.EXPO_PUBLIC_BASE_URL || 'https://your-domain.vercel.app';
      const serverResult = await linkOldPhoneWithServer(baseUrl, phone);
      setStatus('Linked: ' + (serverResult.linkedUid || 'no mapping'));
    } catch (err) {
      console.error('confirmCode error', err);
      setStatus('Verification failed: ' + (err.message || err));
    }
  }

  return (
    <View style={styles.container}>
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaRef}
        firebaseConfig={firebaseApp ? firebaseApp.options : {}}
      />

      <TextInput
        style={styles.input}
        placeholder="+976 99 123456"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />
      <Button title="Send SMS" onPress={sendSms} />

      <TextInput
        style={styles.input}
        placeholder="123456"
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
      />
      <Button title="Confirm Code" onPress={confirmCode} />

      <Text style={styles.status}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  input: { height: 44, borderColor: '#ccc', borderWidth: 1, marginBottom: 12, padding: 8 },
  status: { marginTop: 16 },
});
