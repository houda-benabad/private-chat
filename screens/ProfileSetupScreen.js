import React, { useState } from 'react';
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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { db } from '../firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function ProfileSetupScreen({ navigation }) {
  const [name, setName] = useState('');
  const [photoUri, setPhotoUri] = useState(null);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Permission to access photos is required.');
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
    }
  };

  const AVATAR_COLORS = ['#4D7E82', '#F1A167', '#ED2F3C', '#F3D292', '#6B8E7B', '#C47A8A', '#7B93AD'];

  const handleSave = async () => {
    if (name.trim().length === 0) return;

    const phone = await AsyncStorage.getItem('pending_phone');
    const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

    const userProfile = {
      name: name.trim(),
      photoUri: photoUri || null,
      uid: phone,
      avatarColor,
      createdAt: new Date().toISOString(),
    };

    await AsyncStorage.setItem('user_session', JSON.stringify(userProfile));

    // Update the Firestore user doc with profile info, using phone as uid
    try {
      if (phone) {
        await setDoc(
          doc(db, 'users', phone),
          {
            name: name.trim(),
            photoUri: photoUri || null,
            uid: phone,
            avatarColor,
            profileCompletedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }
    } catch (err) {
      console.warn('ProfileSetup Firestore save error:', err);
    }

    navigation.replace('Chats');
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

          {/* Name Input */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Display name</Text>
            <TextInput
              style={styles.nameInput}
              placeholder="Enter your name..."
              placeholderTextColor="#c4b8ae"
              value={name}
              onChangeText={setName}
              maxLength={30}
              returnKeyType="done"
            />
            <Text style={styles.charCount}>{name.length}/30</Text>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[
              styles.button,
              name.trim().length === 0 && styles.buttonDisabled,
            ]}
            onPress={handleSave}
            disabled={name.trim().length === 0}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>Get Started →</Text>
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
