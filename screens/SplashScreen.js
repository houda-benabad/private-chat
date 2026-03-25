import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SplashScreen({ navigation }) {
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const user = await AsyncStorage.getItem('user_session');
      // Small delay so the splash is visible
      await new Promise(resolve => setTimeout(resolve, 1200));
      if (user) {
        navigation.replace('Main');
      } else {
        navigation.replace('Phone');
      }
    } catch {
      navigation.replace('Phone');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoIcon}>💬</Text>
        </View>
        <Text style={styles.appName}>PrivateChat</Text>
        <Text style={styles.tagline}>Secure. Private. Yours.</Text>
      </View>
      <ActivityIndicator
        size="small"
        color="#6C63FF"
        style={styles.loader}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0E17',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#6C63FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 12,
  },
  logoIcon: {
    fontSize: 44,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFE',
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 14,
    color: '#A7A9BE',
    marginTop: 8,
    letterSpacing: 1,
  },
  loader: {
    position: 'absolute',
    bottom: 60,
  },
});
