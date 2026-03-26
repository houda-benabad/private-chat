import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendMessage, listenToMessages } from '../chatService';

function Avatar({ name, photoURL, color, size = 36 }) {
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
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: color || 'rgba(255,255,255,0.25)',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <Text style={{ color: '#fff', fontSize: size * 0.32, fontWeight: '700' }}>
        {initials}
      </Text>
    </View>
  );
}

function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ChatScreen({ navigation, route }) {
  const { chatId, otherName, otherPhotoURL, otherAvatarColor } = route.params || {};
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [myUid, setMyUid] = useState(null);
  const flatListRef = useRef(null);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem('user_session');
      const session = raw ? JSON.parse(raw) : {};
      setMyUid(session.uid);
    })();
  }, []);

  useEffect(() => {
    if (!chatId) return;
    const unsub = listenToMessages(chatId, setMessages);
    return () => unsub();
  }, [chatId]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || !myUid) return;
    setText('');
    try {
      await sendMessage(chatId, myUid, trimmed);
    } catch (err) {
      console.warn('ChatScreen send error:', err);
    }
  };

  const renderMessage = ({ item, index }) => {
    if (item.type === 'system') {
      return (
        <View style={styles.systemMsg}>
          <Text style={styles.systemText}>{item.text}</Text>
        </View>
      );
    }

    const isMe = item.senderId === myUid;
    const prevItem = messages[index - 1];
    const showTime = !prevItem || (
      item.timestamp && prevItem.timestamp &&
      (item.timestamp.toDate?.() - prevItem.timestamp?.toDate?.()) > 5 * 60 * 1000
    );

    return (
      <>
        {showTime && item.timestamp && (
          <Text style={styles.timeDivider}>{formatTime(item.timestamp)}</Text>
        )}
        <View style={[styles.bubbleRow, isMe ? styles.bubbleRowOut : styles.bubbleRowIn]}>
          <View style={[styles.bubble, isMe ? styles.bubbleOut : styles.bubbleIn]}>
            <Text style={[styles.bubbleText, isMe ? styles.bubbleTextOut : styles.bubbleTextIn]}>
              {item.text}
            </Text>
            <Text style={[styles.bubbleTime, isMe ? styles.bubbleTimeOut : styles.bubbleTimeIn]}>
              {formatTime(item.timestamp)}
            </Text>
          </View>
        </View>
      </>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#4D7E82" />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>

        <Avatar
          name={otherName}
          photoURL={otherPhotoURL}
          color={otherAvatarColor}
          size={36}
        />

        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>
            {otherName || 'Chat'}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
          onLayout={() =>
            flatListRef.current?.scrollToEnd({ animated: false })
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>💬</Text>
              <Text style={styles.emptyText}>
                Say hello to {otherName?.split(' ')[0] || 'them'}!
              </Text>
            </View>
          }
        />

        <View style={styles.inputBar}>
          <Text style={styles.emojiIcon}>😊</Text>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#c4b8ae"
            value={text}
            onChangeText={setText}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!text.trim()}
            activeOpacity={0.85}
          >
            <Text style={[styles.sendIcon, !text.trim() && styles.sendIconDisabled]}>
              ➤
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#4D7E82',
  },
  flex: {
    flex: 1,
    backgroundColor: '#FFF9F5',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 12,
    backgroundColor: '#4D7E82',
    gap: 10,
  },
  backBtn: {
    padding: 4,
  },
  backArrow: {
    fontSize: 22,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 24,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },

  messagesList: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 6,
    flexGrow: 1,
  },
  timeDivider: {
    textAlign: 'center',
    fontSize: 9,
    color: '#c4b8ae',
    marginVertical: 8,
    fontWeight: '500',
  },
  bubbleRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  bubbleRowIn: {
    justifyContent: 'flex-start',
  },
  bubbleRowOut: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
    borderRadius: 18,
  },
  bubbleIn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f0e8e0',
    borderBottomLeftRadius: 4,
  },
  bubbleOut: {
    backgroundColor: '#E46C53',
    borderBottomRightRadius: 4,
  },
  bubbleText: {
    fontSize: 12,
    lineHeight: 18,
  },
  bubbleTextIn: {
    color: '#555',
  },
  bubbleTextOut: {
    color: '#fff',
  },
  bubbleTime: {
    fontSize: 8,
    marginTop: 4,
    textAlign: 'right',
  },
  bubbleTimeIn: {
    color: '#c4b8ae',
  },
  bubbleTimeOut: {
    color: 'rgba(255,255,255,0.6)',
  },

  systemMsg: {
    alignSelf: 'center',
    backgroundColor: 'rgba(77,126,130,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(77,126,130,0.12)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginVertical: 8,
  },
  systemText: {
    fontSize: 9,
    color: '#4D7E82',
    fontWeight: '600',
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 12,
    color: '#c4b8ae',
    fontWeight: '500',
  },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0e8e0',
    backgroundColor: '#fff',
    gap: 8,
  },
  emojiIcon: {
    fontSize: 20,
    paddingBottom: 7,
  },
  input: {
    flex: 1,
    backgroundColor: '#FFF9F5',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 12,
    color: '#333',
    borderWidth: 1.5,
    borderColor: '#f0e8e0',
    maxHeight: 100,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E46C53',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E46C53',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  sendBtnDisabled: {
    backgroundColor: '#f0e8e0',
    shadowOpacity: 0,
    elevation: 0,
  },
  sendIcon: {
    color: '#fff',
    fontSize: 13,
    marginLeft: 2,
  },
  sendIconDisabled: {
    color: '#c4b8ae',
  },
});
