import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { signInWithPhoneNumber } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { setConfirmationResult } from '../authSession';

const COUNTRIES = [
  { name: 'Morocco', code: 'MA', dial: '+212', flag: '🇲🇦' },
  { name: 'United States', code: 'US', dial: '+1', flag: '🇺🇸' },
  { name: 'United Kingdom', code: 'GB', dial: '+44', flag: '🇬🇧' },
  { name: 'Canada', code: 'CA', dial: '+1', flag: '🇨🇦' },
  { name: 'Australia', code: 'AU', dial: '+61', flag: '🇦🇺' },
  { name: 'Germany', code: 'DE', dial: '+49', flag: '🇩🇪' },
  { name: 'France', code: 'FR', dial: '+33', flag: '🇫🇷' },
  { name: 'India', code: 'IN', dial: '+91', flag: '🇮🇳' },
  { name: 'Brazil', code: 'BR', dial: '+55', flag: '🇧🇷' },
  { name: 'Japan', code: 'JP', dial: '+81', flag: '🇯🇵' },
  { name: 'South Korea', code: 'KR', dial: '+82', flag: '🇰🇷' },
  { name: 'China', code: 'CN', dial: '+86', flag: '🇨🇳' },
  { name: 'Mexico', code: 'MX', dial: '+52', flag: '🇲🇽' },
  { name: 'Italy', code: 'IT', dial: '+39', flag: '🇮🇹' },
  { name: 'Spain', code: 'ES', dial: '+34', flag: '🇪🇸' },
  { name: 'Russia', code: 'RU', dial: '+7', flag: '🇷🇺' },
  { name: 'Saudi Arabia', code: 'SA', dial: '+966', flag: '🇸🇦' },
  { name: 'UAE', code: 'AE', dial: '+971', flag: '🇦🇪' },
  { name: 'Turkey', code: 'TR', dial: '+90', flag: '🇹🇷' },
  { name: 'Nigeria', code: 'NG', dial: '+234', flag: '🇳🇬' },
  { name: 'South Africa', code: 'ZA', dial: '+27', flag: '🇿🇦' },
  { name: 'Egypt', code: 'EG', dial: '+20', flag: '🇪🇬' },
  { name: 'Pakistan', code: 'PK', dial: '+92', flag: '🇵🇰' },
  { name: 'Bangladesh', code: 'BD', dial: '+880', flag: '🇧🇩' },
  { name: 'Indonesia', code: 'ID', dial: '+62', flag: '🇮🇩' },
  { name: 'Philippines', code: 'PH', dial: '+63', flag: '🇵🇭' },
  { name: 'Vietnam', code: 'VN', dial: '+84', flag: '🇻🇳' },
  { name: 'Thailand', code: 'TH', dial: '+66', flag: '🇹🇭' },
  { name: 'Malaysia', code: 'MY', dial: '+60', flag: '🇲🇾' },
  { name: 'Argentina', code: 'AR', dial: '+54', flag: '🇦🇷' },
  { name: 'Colombia', code: 'CO', dial: '+57', flag: '🇨🇴' },
  { name: 'Netherlands', code: 'NL', dial: '+31', flag: '🇳🇱' },
  { name: 'Sweden', code: 'SE', dial: '+46', flag: '🇸🇪' },
  { name: 'Norway', code: 'NO', dial: '+47', flag: '🇳🇴' },
  { name: 'Switzerland', code: 'CH', dial: '+41', flag: '🇨🇭' },
  { name: 'Poland', code: 'PL', dial: '+48', flag: '🇵🇱' },
  { name: 'Portugal', code: 'PT', dial: '+351', flag: '🇵🇹' },
  { name: 'Israel', code: 'IL', dial: '+972', flag: '🇮🇱' },
  { name: 'Greece', code: 'GR', dial: '+30', flag: '🇬🇷' },
  { name: 'New Zealand', code: 'NZ', dial: '+64', flag: '🇳🇿' },
  { name: 'Singapore', code: 'SG', dial: '+65', flag: '🇸🇬' },
];

function normalizePhone(dial, local) {
  const localDigits = local.replace(/\D/g, '').replace(/^0+/, '');
  const dialDigits = dial.replace(/\D/g, '');
  return `+${dialDigits}${localDigits}`;
}

export default function PhoneScreen({ navigation }) {
  const [selected, setSelected] = useState(COUNTRIES[0]);
  const [phone, setPhone] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const filtered = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.dial.includes(search)
  );

  const handleContinue = async () => {
    if (phone.length < 6) return;
    setLoading(true);
    try {
      const normalized = normalizePhone(selected.dial, phone);
      const displayPhone = `${selected.dial} ${phone}`;
      console.log('Normalized phone:', normalized);

      await setDoc(
        doc(db, 'users', normalized),
        {
          phone: normalized,
          displayPhone,
          country: selected.name,
          countryCode: selected.code,
          registeredAt: serverTimestamp(),
        },
        { merge: true }
      );
      console.log('Firestore save success');

      await AsyncStorage.setItem('pending_phone', normalized);

      navigation.navigate('OTP', { phoneNumber: displayPhone, normalizedPhone: normalized });
    } catch (err) {
      console.log('Full error:', JSON.stringify(err));
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>

      <StatusBar barStyle="dark-content" backgroundColor="#FDF5EE" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Brand */}
        <View style={styles.brand}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoLetter}>Z</Text>
          </View>
          <Text style={styles.logoName}>Z.systems</Text>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Enter your phone</Text>
          <Text style={styles.subtitle}>
            We'll send a verification code to confirm your number.
          </Text>
        </View>

        {/* Input Row */}
        <View style={styles.inputRow}>
          <TouchableOpacity
            style={styles.countryPicker}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.flag}>{selected.flag}</Text>
            <Text style={styles.dialCode}>{selected.dial}</Text>
            <Text style={styles.chevron}>▾</Text>
          </TouchableOpacity>

          <TextInput
            style={styles.phoneInput}
            placeholder="Phone number"
            placeholderTextColor="#c4b8ae"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            maxLength={15}
          />
        </View>

        <Text style={styles.hint}>
          Standard rates may apply. Number is used only for verification.
        </Text>

        {/* Continue Button */}
        <TouchableOpacity
          style={[styles.button, (phone.length < 6 || loading) && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={phone.length < 6 || loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.buttonText}>Continue →</Text>
          }
        </TouchableOpacity>
      </KeyboardAvoidingView>

      {/* Country Code Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Country</Text>
            <TouchableOpacity onPress={() => { setModalVisible(false); setSearch(''); }}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.searchInput}
            placeholder="Search country or code..."
            placeholderTextColor="#c4b8ae"
            value={search}
            onChangeText={setSearch}
          />

          <FlatList
            data={filtered}
            keyExtractor={item => item.code}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.countryRow,
                  selected.code === item.code && styles.countryRowActive,
                ]}
                onPress={() => {
                  setSelected(item);
                  setModalVisible(false);
                  setSearch('');
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.countryFlag}>{item.flag}</Text>
                <Text style={styles.countryName}>{item.name}</Text>
                <Text style={styles.countryDial}>{item.dial}</Text>
                {selected.code === item.code && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </SafeAreaView>
      </Modal>
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
    paddingTop: 32,
  },
  brand: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E46C53',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#E46C53',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  logoLetter: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
  },
  logoName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    letterSpacing: 0.5,
  },
  header: {
    marginBottom: 28,
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
    lineHeight: 20,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  countryPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 15,
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#f0e8e0',
  },
  flag: {
    fontSize: 18,
  },
  dialCode: {
    color: '#555',
    fontSize: 13,
    fontWeight: '600',
  },
  chevron: {
    color: '#E46C53',
    fontSize: 12,
  },
  phoneInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 15,
    color: '#333',
    fontSize: 15,
    fontWeight: '500',
    borderWidth: 1.5,
    borderColor: '#f0e8e0',
  },
  hint: {
    fontSize: 10,
    color: '#c4b8ae',
    marginBottom: 40,
    lineHeight: 16,
  },
  button: {
    backgroundColor: '#E46C53',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#E46C53',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  buttonDisabled: {
    backgroundColor: '#f0e8e0',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  // Modal
  modalSafe: {
    flex: 1,
    backgroundColor: '#FDF5EE',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0e8e0',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  modalClose: {
    fontSize: 16,
    color: '#999',
    padding: 4,
  },
  searchInput: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#333',
    fontSize: 13,
    borderWidth: 1.5,
    borderColor: '#f0e8e0',
  },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 13,
    gap: 12,
  },
  countryRowActive: {
    backgroundColor: 'rgba(228,108,83,0.06)',
  },
  countryFlag: {
    fontSize: 20,
  },
  countryName: {
    flex: 1,
    color: '#333',
    fontSize: 13,
  },
  countryDial: {
    color: '#999',
    fontSize: 12,
    fontWeight: '500',
  },
  checkmark: {
    color: '#E46C53',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 6,
  },
  separator: {
    height: 1,
    backgroundColor: '#f5efe8',
    marginHorizontal: 20,
  },
});
