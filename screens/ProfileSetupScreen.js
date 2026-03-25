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

  const handleSave = async () => {
    if (name.trim().length === 0) return;

    const userProfile = {
      name: name.trim(),
      photoUri: photoUri || null,
      createdAt: new Date().toISOString(),
    };

    await AsyncStorage.setItem('user_session', JSON.stringify(userProfile));
    navigation.replace('Main');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0F0E17" />
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
              Choose how you appear to others in PrivateChat.
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
            <Text style={styles.sectionLabel}>Display Name</Text>
            <TextInput
              style={styles.nameInput}
              placeholder="Enter your name..."
              placeholderTextColor="#555570"
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
            <Text style={styles.buttonText}>Let's go →</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0F0E17',
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
    marginBottom: 36,
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
  avatarSection: {
    alignItems: 'center',
    marginBottom: 36,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 10,
  },
  avatarImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: '#6C63FF',
  },
  avatarPlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#1A1A2E',
    borderWidth: 2,
    borderColor: '#2A2A3E',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  avatarPlaceholderIcon: {
    fontSize: 52,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#6C63FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0F0E17',
  },
  cameraIcon: {
    fontSize: 16,
  },
  avatarHint: {
    color: '#555570',
    fontSize: 13,
  },
  section: {
    marginBottom: 28,
  },
  sectionLabel: {
    color: '#A7A9BE',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  nameInput: {
    backgroundColor: '#1A1A2E',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    color: '#FFFFFE',
    fontSize: 17,
    fontWeight: '500',
    borderWidth: 1,
    borderColor: '#2A2A3E',
  },
  charCount: {
    color: '#555570',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 6,
  },
  button: {
    backgroundColor: '#6C63FF',
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: 12,
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
