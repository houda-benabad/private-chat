import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { CommonActions } from '@react-navigation/native';
import { db } from '../firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

const AVATAR_COLORS = ['#4D7E82', '#E46C53', '#F1A167', '#ED2F3C', '#F3D292', '#4C7B3B'];

export default function ProfileScreen({ navigation }) {
  const [name, setName] = useState('');
  const [photoUri, setPhotoUri] = useState(null);
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const raw = await AsyncStorage.getItem('user_session');
      if (raw) {
        const profile = JSON.parse(raw);
        setName(profile.name || '');
        setPhotoUri(profile.photoUri || null);
        setAvatarColor(profile.avatarColor || AVATAR_COLORS[0]);
      }
      const raw2 = await AsyncStorage.getItem('pending_phone');
      if (raw2) setPhone(raw2);
    } catch (err) {
      console.warn('ProfileScreen load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo access to change your profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
      setDirty(true);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const profile = {
        name: name.trim(),
        photoUri,
        avatarColor,
        updatedAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem('user_session', JSON.stringify(profile));

      const phoneKey = await AsyncStorage.getItem('pending_phone');
      if (phoneKey) {
        await updateDoc(doc(db, 'users', phoneKey), {
          name: name.trim(),
          avatarColor,
          updatedAt: serverTimestamp(),
        });
      }
      setDirty(false);
    } catch (err) {
      console.warn('ProfileScreen save error:', err);
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem('user_session');
          await AsyncStorage.removeItem('pending_phone');
          navigation.dispatch(
            CommonActions.reset({ index: 0, routes: [{ name: 'Phone' }] })
          );
        },
      },
    ]);
  };

  const initials = name
    ? name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFF9F5" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#E46C53" size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF9F5" />
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            style={styles.avatarTouchable}
            onPress={handlePickPhoto}
            activeOpacity={0.85}
          >
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: avatarColor }]}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )}
            <View style={styles.cameraBadge}>
              <Text style={styles.cameraIcon}>📷</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.profileName}>{name || 'Your Name'}</Text>
          <Text style={styles.profilePhone}>{phone || '—'}</Text>
        </View>

        {/* Display Name */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Display Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={v => { setName(v); setDirty(true); }}
            placeholder="Your name"
            placeholderTextColor="#c4b8ae"
            maxLength={30}
            returnKeyType="done"
          />
          <Text style={styles.charCount}>{name.length}/30</Text>
        </View>

        {/* Phone */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Phone Number</Text>
          <View style={styles.phoneRow}>
            <Text style={styles.phoneText}>{phone || '—'}</Text>
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>✓ Verified</Text>
            </View>
          </View>
          <Text style={styles.fieldHint}>Phone number cannot be changed.</Text>
        </View>

        {/* Avatar Color */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Avatar Color</Text>
          <View style={styles.colorRow}>
            {AVATAR_COLORS.map(color => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: color },
                  avatarColor === color && styles.colorSwatchSelected,
                ]}
                onPress={() => { setAvatarColor(color); setDirty(true); }}
                activeOpacity={0.8}
              />
            ))}
          </View>
        </View>

        {/* Settings Rows */}
        <View style={styles.settingsCard}>
          {['Account', 'Notifications', 'Privacy & security', 'Appearance'].map((item, i, arr) => (
            <TouchableOpacity
              key={item}
              style={[styles.settingsRow, i === arr.length - 1 && styles.settingsRowLast]}
              activeOpacity={0.6}
            >
              <Text style={styles.settingsRowText}>{item}</Text>
              <Text style={styles.settingsChevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Save */}
        <TouchableOpacity
          style={[styles.saveBtn, (!dirty || !name.trim() || saving) && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!dirty || !name.trim() || saving}
          activeOpacity={0.85}
        >
          {saving
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.saveBtnText}>Save Changes</Text>
          }
        </TouchableOpacity>

        {/* Sign Out */}
        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={handleSignOut}
          activeOpacity={0.7}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Z.systems v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF9F5' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { paddingBottom: 48 },

  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0e8e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    letterSpacing: -0.3,
  },

  avatarSection: {
    alignItems: 'center',
    paddingVertical: 28,
    borderBottomWidth: 1,
    borderBottomColor: '#f5efe8',
  },
  avatarTouchable: { position: 'relative', marginBottom: 12 },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2.5,
    borderColor: '#E46C53',
  },
  avatarFallback: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: { fontSize: 28, fontWeight: '700', color: '#fff' },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E46C53',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF9F5',
  },
  cameraIcon: { fontSize: 11 },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 3,
  },
  profilePhone: {
    fontSize: 11,
    color: '#c4b8ae',
  },

  section: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 4,
  },
  sectionLabel: {
    color: '#999',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: '#333',
    fontSize: 14,
    borderWidth: 1.5,
    borderColor: '#f0e8e0',
  },
  charCount: { color: '#c4b8ae', fontSize: 10, textAlign: 'right', marginTop: 6 },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1.5,
    borderColor: '#f0e8e0',
    justifyContent: 'space-between',
  },
  phoneText: { color: '#333', fontSize: 14 },
  verifiedBadge: {
    backgroundColor: 'rgba(76,163,80,0.1)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  verifiedText: { color: '#4CAF50', fontSize: 11, fontWeight: '600' },
  fieldHint: { color: '#c4b8ae', fontSize: 10, marginTop: 8 },

  colorRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  colorSwatch: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2.5,
    borderColor: 'transparent',
  },
  colorSwatchSelected: {
    borderColor: '#333',
    transform: [{ scale: 1.15 }],
  },

  settingsCard: {
    marginHorizontal: 20,
    marginTop: 24,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#f0e8e0',
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f5efe8',
  },
  settingsRowLast: {
    borderBottomWidth: 0,
  },
  settingsRowText: {
    fontSize: 13,
    color: '#555',
  },
  settingsChevron: {
    fontSize: 18,
    color: '#c4b8ae',
    lineHeight: 20,
  },

  saveBtn: {
    marginHorizontal: 20,
    marginTop: 24,
    backgroundColor: '#E46C53',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#E46C53',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  saveBtnDisabled: {
    backgroundColor: '#f0e8e0',
    shadowOpacity: 0,
    elevation: 0,
  },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  signOutBtn: {
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(237,47,60,0.2)',
    backgroundColor: 'rgba(237,47,60,0.04)',
  },
  signOutText: { color: '#ED2F3C', fontSize: 14, fontWeight: '600' },

  versionText: {
    textAlign: 'center',
    color: '#c4b8ae',
    fontSize: 9,
    marginTop: 24,
    letterSpacing: 0.5,
  },
});
