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
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { db } from '../firebase';
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';

const USERNAME_REGEX = /^[a-zA-Z0-9 ._]+$/;

export default function ProfileSetupScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');       // validation/taken message
  const [usernameAvailable, setUsernameAvailable] = useState(false); // green checkmark
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [photoUri, setPhotoUri] = useState(null);   // local file URI for preview only
  const [photoBase64, setPhotoBase64] = useState(null); // data URI saved to Firestore
  const [uploading, setUploading] = useState(false);
  const debounceTimer = useRef(null);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Permission to access photos is required.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.3,   // aggressive compression to stay well under Firestore's 1MB doc limit
    });

    if (!result.canceled) {
      const localUri = result.assets[0].uri;
      setPhotoUri(localUri);  // immediate local preview

      // Convert to base64 so it can be stored in Firestore and read by any device
      try {
        const base64 = await FileSystem.readAsStringAsync(localUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        setPhotoBase64(`data:image/jpeg;base64,${base64}`);
      } catch (err) {
        console.warn('ProfileSetup base64 encode error:', err);
        setPhotoBase64(null);
      }
    }
  };

  const AVATAR_COLORS = ['#4D7E82', '#F1A167', '#ED2F3C', '#F3D292', '#6B8E7B', '#C47A8A', '#7B93AD'];

  // Validate and debounce-check username availability as the user types
  const handleUsernameChange = (text) => {
    setUsername(text);
    setUsernameAvailable(false);

    if (text.length === 0) {
      setUsernameError('');
      return;
    }
    if (!USERNAME_REGEX.test(text)) {
      setUsernameError('Only letters, numbers, spaces, dots and underscores allowed.');
      return;
    }
    if (text.trim().length < 3) {
      setUsernameError('Username must be at least 3 characters.');
      return;
    }

    setUsernameError('');
    setCheckingUsername(true);

    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      try {
        const myPhone = await AsyncStorage.getItem('pending_phone');
        const snap = await getDocs(
          query(
            collection(db, 'users'),
            where('usernameLower', '==', text.trim().toLowerCase())
          )
        );
        // Available if no docs found, or the only match is the current user's own doc
        const taken = snap.docs.some(d => d.id !== myPhone);
        if (taken) {
          setUsernameError('Username already taken.');
          setUsernameAvailable(false);
        } else {
          setUsernameError('');
          setUsernameAvailable(true);
        }
      } catch (err) {
        console.warn('ProfileSetup username check error:', err);
      } finally {
        setCheckingUsername(false);
      }
    }, 500);
  };

  // Clean up debounce timer on unmount
  useEffect(() => () => clearTimeout(debounceTimer.current), []);

  const canSave = username.trim().length >= 3 &&
    USERNAME_REGEX.test(username) &&
    !usernameError &&
    usernameAvailable &&
    !uploading;

  const handleSave = async () => {
    if (!canSave) return;
    setUploading(true);

    try {
      const phone = await AsyncStorage.getItem('pending_phone');
      const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
      const trimmedUsername = username.trim();

      const photoData = photoBase64 || null;

      const userProfile = {
        name: trimmedUsername,      // keep 'name' key so participantData is compatible
        username: trimmedUsername,
        photoUri: photoData,
        uid: phone,
        avatarColor,
        createdAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem('user_session', JSON.stringify(userProfile));

      if (phone) {
        await setDoc(
          doc(db, 'users', phone),
          {
            username: trimmedUsername,
            usernameLower: trimmedUsername.toLowerCase(),
            name: trimmedUsername,   // kept for participantData compatibility
            photoUri: photoData,
            uid: phone,
            avatarColor,
            profileCompletedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }
    } catch (err) {
      console.warn('ProfileSetup save error:', err);
    } finally {
      setUploading(false);
    }

    navigation.replace('MainTabs');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#FDF5EE" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Set up your profile</Text>
            <Text style={styles.subtitle}>
              Choose how you appear to others in Z Chat.
            </Text>
          </View>

          {/* Avatar / Photo Upload */}
          <View style={styles.avatarSection}>
            <TouchableOpacity
              style={styles.avatarWrapper}
              onPress={handlePickImage}
              activeOpacity={0.8}
            >
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarPlaceholderIcon}>👤</Text>
                </View>
              )}
              <View style={styles.cameraBadge}>
                <Text style={styles.cameraIcon}>📷</Text>
              </View>
            </TouchableOpacity>
            <Text style={styles.avatarHint}>
              {photoUri ? 'Tap to change photo' : 'Tap to upload a photo'}
            </Text>
          </View>

          {/* Username Input */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Choose a username</Text>
            <View style={styles.usernameRow}>
              <TextInput
                style={[styles.nameInput, styles.usernameInput]}
                placeholder="e.g. Eva Luna"
                placeholderTextColor="#c4b8ae"
                value={username}
                onChangeText={handleUsernameChange}
                maxLength={30}
                returnKeyType="done"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {/* Availability indicator */}
              {checkingUsername && (
                <ActivityIndicator size="small" color="#c4b8ae" style={styles.usernameIndicator} />
              )}
              {!checkingUsername && usernameAvailable && (
                <Text style={[styles.usernameIndicator, styles.usernameAvailable]}>✓</Text>
              )}
              {!checkingUsername && usernameError && username.length > 0 && (
                <Text style={[styles.usernameIndicator, styles.usernameTaken]}>✕</Text>
              )}
            </View>
            {usernameError ? (
              <Text style={styles.usernameErrorText}>{usernameError}</Text>
            ) : (
              <Text style={styles.charCount}>{username.length}/30</Text>
            )}
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.button, !canSave && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={!canSave}
            activeOpacity={0.85}
          >
            {uploading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.buttonText}>Get Started →</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FDF5EE',
  },
  flex: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 32,
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
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 10,
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: '#E46C53',
  },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(77,126,130,0.1)',
    borderWidth: 2,
    borderColor: 'rgba(77,126,130,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderIcon: {
    fontSize: 40,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E46C53',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FDF5EE',
  },
  cameraIcon: {
    fontSize: 13,
  },
  avatarHint: {
    color: '#c4b8ae',
    fontSize: 10,
  },
  section: {
    marginBottom: 28,
  },
  sectionLabel: {
    color: '#999',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  nameInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: '#333',
    fontSize: 15,
    fontWeight: '500',
    borderWidth: 1.5,
    borderColor: '#f0e8e0',
  },
  charCount: {
    color: '#c4b8ae',
    fontSize: 10,
    textAlign: 'right',
    marginTop: 4,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  usernameInput: {
    flex: 1,
  },
  usernameIndicator: {
    marginLeft: 10,
  },
  usernameAvailable: {
    color: '#4CAF50',
    fontSize: 18,
    fontWeight: '700',
  },
  usernameTaken: {
    color: '#ED2F3C',
    fontSize: 16,
    fontWeight: '700',
  },
  usernameErrorText: {
    color: '#ED2F3C',
    fontSize: 10,
    marginTop: 5,
  },
  button: {
    backgroundColor: '#E46C53',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
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
});
