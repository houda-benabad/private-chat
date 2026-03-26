import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { signInWithPhoneNumber } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getConfirmationResult, setConfirmationResult } from '../authSession';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

export default function OTPScreen({ navigation, route }) {
  const { phoneNumber, normalizedPhone } = route.params || {};
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const [canResend, setCanResend] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const inputs = useRef([]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleChange = (text, index) => {
    const digit = text.replace(/[^0-9]/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    if (digit && index < OTP_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setOtp(Array(OTP_LENGTH).fill(''));
    setCountdown(RESEND_SECONDS);
    setCanResend(false);
    inputs.current[0]?.focus();
    try {
      const confirmation = await signInWithPhoneNumber(auth, normalizedPhone);
      setConfirmationResult(confirmation);
    } catch (err) {
      Alert.alert('Error', 'Could not resend the code. Please go back and try again.');
    }
  };

  const isComplete = otp.every(d => d !== '');

  const handleVerify = async () => {
    if (!isComplete || verifying) return;
    setVerifying(true);
    try {
      const userDoc = await getDoc(doc(db, 'users', normalizedPhone));

      if (userDoc.exists() && (userDoc.data().username || userDoc.data().name)) {
        // Returning user — restore session and go straight to Chats
        const data = userDoc.data();
        const userSession = {
          name: data.username || data.name,
          username: data.username || data.name,
          photoUri: data.photoUri || null,
          uid: normalizedPhone,
          avatarColor: data.avatarColor || null,
          createdAt: data.profileCompletedAt || new Date().toISOString(),
        };
        await AsyncStorage.setItem('user_session', JSON.stringify(userSession));
        await AsyncStorage.setItem('pending_phone', normalizedPhone);
        navigation.replace('Chats');
      } else {
        // New user — go to Profile Setup
        navigation.navigate('ProfileSetup');
      }
    } catch (err) {
      console.warn('OTPScreen verify error:', err);
      navigation.navigate('ProfileSetup');
    } finally {
      setVerifying(false);
    }
  };

  const formatTime = (s) => `0:${s.toString().padStart(2, '0')}`;

  return (
    <SafeAreaView style={styles.safe}>

      <StatusBar barStyle="dark-content" backgroundColor="#FDF5EE" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Back */}
        <TouchableOpacity
          style={styles.back}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Verify your number</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit code sent to
          </Text>
          <Text style={styles.phone}>{phoneNumber}</Text>
        </View>

        {/* OTP Boxes */}
        <View style={styles.otpRow}>
          {otp.map((digit, i) => (
            <TextInput
              key={i}
              ref={ref => (inputs.current[i] = ref)}
              style={[
                styles.otpBox,
                digit ? styles.otpBoxFilled : null,
                i === otp.findIndex(d => !d) ? styles.otpBoxActive : null,
              ]}
              value={digit}
              onChangeText={text => handleChange(text, i)}
              onKeyPress={e => handleKeyPress(e, i)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
              caretHidden
            />
          ))}
        </View>

        {/* Resend */}
        <View style={styles.resendRow}>
          <Text style={styles.resendLabel}>Didn't receive the code? </Text>
          {canResend ? (
            <TouchableOpacity onPress={handleResend}>
              <Text style={styles.resendActive}>Resend</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.resendTimer}>
              Resend in {formatTime(countdown)}
            </Text>
          )}
        </View>

        {/* Verify Button */}
        <TouchableOpacity
          style={[styles.button, (!isComplete || verifying) && styles.buttonDisabled]}
          onPress={handleVerify}
          disabled={!isComplete || verifying}
          activeOpacity={0.85}
        >
          {verifying
            ? <ActivityIndicator color="#E46C53" size="small" />
            : <Text style={styles.buttonText}>Verify →</Text>
          }
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FDF5EE',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  back: {
    marginBottom: 32,
  },
  backText: {
    color: '#E46C53',
    fontSize: 13,
    fontWeight: '600',
  },
  header: {
    marginBottom: 36,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 12,
    color: '#999',
  },
  phone: {
    fontSize: 13,
    color: '#E46C53',
    fontWeight: '600',
    marginTop: 4,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
    gap: 8,
  },
  otpBox: {
    flex: 1,
    aspectRatio: 0.85,
    backgroundColor: '#fff',
    borderRadius: 10,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    borderWidth: 1.5,
    borderColor: '#f0e8e0',
  },
  otpBoxFilled: {
    borderColor: '#E46C53',
    backgroundColor: 'rgba(228,108,83,0.04)',
  },
  otpBoxActive: {
    borderColor: '#E46C53',
    shadowColor: '#E46C53',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 36,
  },
  resendLabel: {
    color: '#999',
    fontSize: 11,
  },
  resendActive: {
    color: '#E46C53',
    fontSize: 11,
    fontWeight: '600',
  },
  resendTimer: {
    color: '#E46C53',
    fontSize: 11,
    fontWeight: '600',
  },
  button: {
    backgroundColor: 'transparent',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E46C53',
  },
  buttonDisabled: {
    borderColor: '#f0e8e0',
  },
  buttonText: {
    color: '#E46C53',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
