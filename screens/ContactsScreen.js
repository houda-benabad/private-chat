import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { getOrCreateChat } from '../chatService';

function Avatar({ name, photoURL, color, size = 54 }) {
  const initials = name
    ? name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';
  if (photoURL) {
    return (
      <Image
        source={{ uri: photoURL }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: color || '#4D7E82',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ color: '#fff', fontSize: size * 0.33, fontWeight: '700' }}>
        {initials}
      </Text>
    </View>
  );
}

export default function ContactsScreen({ navigation }) {
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [starting, setStarting] = useState(false);

  const handleSearch = async () => {
    const trimmed = searchInput.trim();
    if (!trimmed) return;
    setLoading(true);
    setResult(null);
    try {
      // Query by usernameLower for case-insensitive exact match
      const snap = await getDocs(
        query(
          collection(db, 'users'),
          where('usernameLower', '==', trimmed.toLowerCase())
        )
      );

      if (snap.empty) {
        setResult('not_found');
        return;
      }

      const userDoc = snap.docs[0];
      const data = { id: userDoc.id, ...userDoc.data() };

      // Self-check: compare uid, not phone, so it works regardless of session format
      const raw = await AsyncStorage.getItem('user_session');
      const me = raw ? JSON.parse(raw) : {};
      setResult(data.uid === me.uid ? 'self' : data);
    } catch (err) {
      console.warn('ContactsScreen search error:', err);
      setResult('not_found');
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = async () => {
    if (!result || typeof result === 'string') return;
    setStarting(true);
    try {
      const raw = await AsyncStorage.getItem('user_session');
      const me = raw ? JSON.parse(raw) : {};
      const myUid = me.uid;
      const otherUid = result.uid; // stored in users doc by ProfileSetupScreen

      console.log('[ContactsScreen] handleStartChat — myUid:', myUid, '| otherUid:', otherUid);

      if (!myUid || !otherUid) {
        console.warn('[ContactsScreen] BLOCKED: missing UID(s)', { myUid, otherUid, resultDoc: result });
        setStarting(false);
        return;
      }

      const participantData = {
        [myUid]: {
          name: me.username || me.name || 'Me',
          photoURL: me.photoUri || null,
          avatarColor: me.avatarColor || null,
        },
        [otherUid]: {
          name: result.username || result.name || 'Unknown',
          photoURL: result.photoUri || null,
          avatarColor: result.avatarColor || null,
        },
      };

      console.log('[ContactsScreen] participantData:', JSON.stringify(participantData));

      const chatId = await getOrCreateChat(myUid, otherUid, participantData);

      console.log('[ContactsScreen] chatId returned:', chatId, '— navigating to Chat screen');

      navigation.navigate('Chat', {
        chatId,
        otherUid,
        otherName: result.username || result.name || 'Unknown',
        otherPhotoURL: result.photoUri || null,
        otherAvatarColor: result.avatarColor || null,
      });
    } catch (err) {
      console.warn('ContactsScreen startChat error:', err);
    } finally {
      setStarting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF9F5" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>New Message</Text>
        </View>

        <View style={styles.searchSection}>
          <Text style={styles.label}>Username</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Search by username..."
              placeholderTextColor="#c4b8ae"
              value={searchInput}
              onChangeText={setSearchInput}
              keyboardType="default"
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={handleSearch}
              autoFocus
            />
            <TouchableOpacity
              style={[styles.searchBtn, (!searchInput.trim() || loading) && styles.searchBtnDisabled]}
              onPress={handleSearch}
              disabled={!searchInput.trim() || loading}
              activeOpacity={0.8}
            >
              <Text style={styles.searchBtnText}>Find</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>Enter the exact username to find someone.</Text>
        </View>

        {loading && (
          <View style={styles.center}>
            <ActivityIndicator color="#E46C53" size="large" />
          </View>
        )}

        {!loading && result === 'not_found' && (
          <View style={styles.center}>
            <Text style={styles.feedbackIcon}>🔍</Text>
            <Text style={styles.feedbackTitle}>No user found</Text>
            <Text style={styles.feedbackSub}>
              No one on Z.systems has that username yet.
            </Text>
          </View>
        )}

        {!loading && result === 'self' && (
          <View style={styles.center}>
            <Text style={styles.feedbackIcon}>👋</Text>
            <Text style={styles.feedbackTitle}>That's you!</Text>
            <Text style={styles.feedbackSub}>
              You can't start a conversation with yourself.
            </Text>
          </View>
        )}

        {!loading && result && typeof result === 'object' && (
          <View style={styles.resultCard}>
            <Avatar
              name={result.name}
              photoURL={result.photoUri}
              color={result.avatarColor}
              size={52}
            />
            <View style={styles.resultInfo}>
              <Text style={styles.resultName}>{result.username || result.name || 'Unknown'}</Text>
            </View>
            <TouchableOpacity
              style={[styles.messageBtn, starting && styles.messageBtnBusy]}
              onPress={handleStartChat}
              disabled={starting}
              activeOpacity={0.85}
            >
              {starting
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.messageBtnText}>Message</Text>
              }
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFF9F5',
  },
  flex: { flex: 1 },
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
  searchSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  label: {
    color: '#999',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: '#333',
    fontSize: 14,
    borderWidth: 1.5,
    borderColor: '#f0e8e0',
  },
  searchBtn: {
    backgroundColor: '#E46C53',
    borderRadius: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E46C53',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  searchBtnDisabled: {
    backgroundColor: '#f0e8e0',
    shadowOpacity: 0,
    elevation: 0,
  },
  searchBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  hint: {
    color: '#c4b8ae',
    fontSize: 10,
    marginTop: 10,
    lineHeight: 16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  feedbackIcon: { fontSize: 48, marginBottom: 16 },
  feedbackTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 8 },
  feedbackSub: { fontSize: 12, color: '#999', textAlign: 'center', lineHeight: 20 },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 24,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f0e8e0',
  },
  resultInfo: { flex: 1, marginLeft: 14 },
  resultName: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 3 },
  resultPhone: { fontSize: 12, color: '#999' },
  messageBtn: {
    backgroundColor: '#E46C53',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    minWidth: 84,
    alignItems: 'center',
    shadowColor: '#E46C53',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  messageBtnBusy: { opacity: 0.7 },
  messageBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
