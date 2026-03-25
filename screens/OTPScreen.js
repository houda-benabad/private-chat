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
} from 'react-native';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

export default function OTPScreen({ navigation, route }) {
  const { phoneNumber } = route.params || {};
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const [canResend, setCanResend] = useState(false);
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
    // Accept only digits
    const digit = text.replace(/[^0-9]/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    // Auto-advance
    if (digit && index < OTP_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleResend = () => {
    if (!canResend) return;
    setOtp(Array(OTP_LENGTH).fill(''));
    setCountdown(RESEND_SECONDS);
    setCanResend(false);
    inputs.current[0]?.focus();
  };

  const isComplete = otp.every(d => d !== '');

  const handleVerify = () => {
    if (isComplete) {
      navigation.navigate('ProfileSetup');
    }
  };

  const formatTime = (s) => `0:${s.toString().padStart(2, '0')}`;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0F0E17" />
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
          style={[styles.button, !isComplete && styles.buttonDisabled]}
          onPress={handleVerify}
          disabled={!isComplete}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>Verify →</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0F0E17',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  back: {
    marginBottom: 36,
  },
  backText: {
    color: '#6C63FF',
    fontSize: 15,
    fontWeight: '600',
  },
  header: {
    marginBottom: 44,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFE',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: '#A7A9BE',
  },
  phone: {
    fontSize: 16,
    color: '#6C63FF',
    fontWeight: '700',
    marginTop: 4,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    gap: 8,
  },
  otpBox: {
    flex: 1,
    aspectRatio: 0.85,
    backgroundColor: '#1A1A2E',
    borderRadius: 14,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFE',
    borderWidth: 1.5,
    borderColor: '#2A2A3E',
  },
  otpBoxFilled: {
    borderColor: '#6C63FF',
    backgroundColor: '#1E1A3A',
  },
  otpBoxActive: {
    borderColor: '#6C63FF',
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 44,
  },
  resendLabel: {
    color: '#A7A9BE',
    fontSize: 14,
  },
  resendActive: {
    color: '#6C63FF',
    fontSize: 14,
    fontWeight: '700',
  },
  resendTimer: {
    color: '#555570',
    fontSize: 14,
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#6C63FF',
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: 'center',
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonDisabled: {
    backgroundColor: '#2A2A3E',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: '#FFFFFE',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
