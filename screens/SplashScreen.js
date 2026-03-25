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
      await new Promise(resolve => setTimeout(resolve, 1200));
      if (user) {
        navigation.replace('Chats');
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
          <Text style={styles.logoLetter}>Z</Text>
        </View>
        <Text style={styles.appName}>Z Chat</Text>
        <Text style={styles.tagline}>REDEFINING THE GAME</Text>
      </View>
      <ActivityIndicator
        size="small"
        color="rgba(255,255,255,0.65)"
        style={styles.loader}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E46C53',
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
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  logoLetter: {
    fontSize: 48,
    fontWeight: '800',
    color: '#fff',
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 10,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  loader: {
    position: 'absolute',
    bottom: 60,
  },
});
