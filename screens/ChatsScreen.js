import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Image,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
// auth removed — uid is read from AsyncStorage session instead
import { listenToChats } from '../chatService';

function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  const oneDay = 86400000;
  const oneWeek = 7 * oneDay;

  if (diff < oneDay && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (diff < oneWeek) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function Avatar({ name, photoURL, color, size = 44 }) {
  const initials = name
    ? name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  if (photoURL) {
    return (
      <Image
        source={{ uri: photoURL }}
        style={[styles.avatarImg, { width: size, height: size, borderRadius: size / 2 }]}
      />
    );
  }
  return (
    <View
      style={[
        styles.avatarFallback,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color || '#4D7E82' },
      ]}
    >
      <Text style={[styles.avatarText, { fontSize: size * 0.3 }]}>{initials}</Text>
    </View>
  );
}

function ChatRow({ item, currentUid, onPress }) {
  const otherUid = item.users?.find(u => u !== currentUid);
  const other = item.participantData?.[otherUid] || {};

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => onPress(item, other, otherUid)}
      activeOpacity={0.7}
    >
      <Avatar name={other.name} photoURL={other.photoURL} color={other.avatarColor} />

      <View style={styles.rowContent}>
        <View style={styles.rowTop}>
          <Text style={styles.rowName} numberOfLines={1}>{other.name || 'Unknown'}</Text>
          <Text style={styles.rowTime}>{formatTime(item.lastMessageTime)}</Text>
        </View>
        <Text style={styles.rowPreview} numberOfLines={1}>
          {item.lastMessage || 'No messages yet'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function ChatsScreen({ navigation }) {
  const [chats, setChats] = useState([]);
  const [currentUid, setCurrentUid] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let unsub;
    (async () => {
      const raw = await AsyncStorage.getItem('user_session');
      const session = raw ? JSON.parse(raw) : {};
      const uid = session.uid;
      if (!uid) { setLoading(false); return; }
      setCurrentUid(uid);

      unsub = listenToChats(uid, data => {
        setChats(data);
        setLoading(false);
      });
    })();

    return () => unsub && unsub();
  }, []);

  const handleLogout = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem('user_session');
          await AsyncStorage.removeItem('pending_phone');
          navigation.replace('Phone');
        },
      },
    ]);
  };

  const handleOpenChat = useCallback((chat, otherUser, otherUid) => {
    navigation.navigate('Chat', {
      chatId: chat.id,
      otherUid,
      otherName: otherUser.name,
      otherPhotoURL: otherUser.photoURL || null,
      otherAvatarColor: otherUser.avatarColor || null,
    });
  }, [navigation]);

  const filtered = chats.filter(item => {
    if (!search.trim()) return true;
    const otherUid = item.users?.find(u => u !== currentUid);
    const other = item.participantData?.[otherUid] || {};
    return other.name?.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF9F5" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerBrand}>
          <View style={styles.headerLogo}>
            <Text style={styles.headerLogoLetter}>Z</Text>
          </View>
          <Text style={styles.headerLogoName}>Z.systems</Text>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={handleLogout} activeOpacity={0.7}>
          <Text style={styles.iconBtnText}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchWrapper}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations..."
          placeholderTextColor="#c4b8ae"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <View style={styles.empty}>
          <ActivityIndicator size="large" color="#E46C53" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>💬</Text>
          <Text style={styles.emptyHeading}>No conversations yet</Text>
          <Text style={styles.emptySubtext}>
            Tap the button below to start a private chat.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <ChatRow
              item={item}
              currentUid={currentUid}
              onPress={handleOpenChat}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('ContactsTab')}
        activeOpacity={0.85}
      >
        <Text style={styles.fabIcon}>✏️</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFF9F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerLogo: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E46C53',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogoLetter: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
  },
  headerLogoName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    letterSpacing: 0.3,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f0e8e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnText: { fontSize: 15 },

  searchWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  searchInput: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#f0e8e0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 13,
    color: '#333',
  },

  list: {
    paddingBottom: 80,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  avatarImg: {
    borderWidth: 1,
    borderColor: '#f0e8e0',
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: '600',
  },
  rowContent: {
    flex: 1,
    marginLeft: 10,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  rowName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  rowTime: {
    fontSize: 9,
    color: '#c4b8ae',
  },
  rowPreview: {
    fontSize: 11,
    color: '#999',
  },
  separator: {
    height: 1,
    backgroundColor: '#f5efe8',
    marginLeft: 70,
  },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },

  fab: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E46C53',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E46C53',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 20,
  },
});
