import React, { useState } from 'react';
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
} from 'react-native';

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

export default function PhoneScreen({ navigation }) {
  const [selected, setSelected] = useState(COUNTRIES[0]);
  const [phone, setPhone] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.dial.includes(search)
  );

  const handleContinue = () => {
    if (phone.length >= 6) {
      navigation.navigate('OTP', {
        phoneNumber: `${selected.dial} ${phone}`,
      });
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0F0E17" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
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
            placeholderTextColor="#555570"
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
          style={[styles.button, phone.length < 6 && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={phone.length < 6}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>Continue →</Text>
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
            placeholderTextColor="#555570"
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
    backgroundColor: '#0F0E17',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
  },
  header: {
    marginBottom: 40,
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
    lineHeight: 22,
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
    backgroundColor: '#1A1A2E',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: '#2A2A3E',
  },
  flag: {
    fontSize: 20,
  },
  dialCode: {
    color: '#FFFFFE',
    fontSize: 15,
    fontWeight: '600',
  },
  chevron: {
    color: '#6C63FF',
    fontSize: 12,
  },
  phoneInput: {
    flex: 1,
    backgroundColor: '#1A1A2E',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    color: '#FFFFFE',
    fontSize: 17,
    fontWeight: '500',
    borderWidth: 1,
    borderColor: '#2A2A3E',
  },
  hint: {
    fontSize: 12,
    color: '#555570',
    marginBottom: 40,
    lineHeight: 18,
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
  // Modal
  modalSafe: {
    flex: 1,
    backgroundColor: '#0F0E17',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A2E',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFE',
  },
  modalClose: {
    fontSize: 18,
    color: '#A7A9BE',
    padding: 4,
  },
  searchInput: {
    margin: 16,
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#FFFFFE',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#2A2A3E',
  },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  countryRowActive: {
    backgroundColor: '#1A1A2E',
  },
  countryFlag: {
    fontSize: 22,
  },
  countryName: {
    flex: 1,
    color: '#FFFFFE',
    fontSize: 15,
  },
  countryDial: {
    color: '#A7A9BE',
    fontSize: 14,
    fontWeight: '500',
  },
  checkmark: {
    color: '#6C63FF',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 6,
  },
  separator: {
    height: 1,
    backgroundColor: '#1A1A2E',
    marginHorizontal: 20,
  },
});
