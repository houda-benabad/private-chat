import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function MainScreen({ navigation }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const raw = await AsyncStorage.getItem('user_session');
    if (raw) setUser(JSON.parse(raw));
  };

  const handleLogout = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem('user_session');
          navigation.replace('Phone');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0F0E17" />
      <View style={styles.container}>
        {user && (
          <>
            <View style={[styles.avatar, { backgroundColor: user.avatarColor }]}>
              {user.name ? (
                <Text style={styles.avatarInitials}>
                  {user.name
                    .split(' ')
                    .map(w => w[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
                </Text>
              ) : (
                <Text style={styles.avatarEmoji}>{user.avatarEmoji}</Text>
              )}
            </View>
            <Text style={styles.welcome}>Welcome back,</Text>
            <Text style={styles.name}>{user.name}</Text>
          </>
        )}

        <Text style={styles.placeholder}>
          🚀 You're in! Your chat app lives here.
        </Text>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign out</Text>
        </TouchableOpacity>
      </View>
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  avatarInitials: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFE',
  },
  avatarEmoji: {
    fontSize: 40,
  },
  welcome: {
    fontSize: 16,
    color: '#A7A9BE',
    marginBottom: 4,
  },
  name: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFE',
    marginBottom: 32,
  },
  placeholder: {
    fontSize: 15,
    color: '#555570',
    textAlign: 'center',
    marginBottom: 60,
    lineHeight: 24,
  },
  logoutBtn: {
    position: 'absolute',
    bottom: 40,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A3E',
  },
  logoutText: {
    color: '#A7A9BE',
    fontSize: 15,
    fontWeight: '600',
  },
});
