import { db } from './firebase';
import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';

function buildChatId(uid1, uid2) {
  return [uid1, uid2].sort().join('_');
}

/**
 * Finds an existing chat between two users or creates one.
 * participantData: { [uid]: { name, photoURL, avatarColor } }
 * Returns the chatId.
 */
export async function getOrCreateChat(currentUserId, otherUserId, participantData = {}) {
  const chatId = buildChatId(currentUserId, otherUserId);
  const chatRef = doc(db, 'chats', chatId);
  const snap = await getDoc(chatRef);
  if (!snap.exists()) {
    await setDoc(chatRef, {
      users: [currentUserId, otherUserId],
      lastMessage: '',
      lastMessageTime: serverTimestamp(),
      participantData,
      createdAt: serverTimestamp(),
    });
  }
  return chatId;
}

/**
 * Adds a message to the chat and updates lastMessage / lastMessageTime on the chat doc.
 */
export async function sendMessage(chatId, senderId, text) {
  await addDoc(collection(db, 'chats', chatId, 'messages'), {
    senderId,
    text,
    timestamp: serverTimestamp(),
  });
  await updateDoc(doc(db, 'chats', chatId), {
    lastMessage: text,
    lastMessageTime: serverTimestamp(),
  });
}

/**
 * Real-time listener on the messages subcollection ordered by timestamp asc.
 * Returns the unsubscribe function.
 */
export function listenToMessages(chatId, callback) {
  const q = query(
    collection(db, 'chats', chatId, 'messages'),
    orderBy('timestamp', 'asc')
  );
  return onSnapshot(
    q,
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    err => console.warn('listenToMessages error:', err)
  );
}

/**
 * Real-time listener on all chats where the user is a participant,
 * ordered by lastMessageTime desc.
 * Returns the unsubscribe function.
 */
export function listenToChats(currentUserId, callback) {
  const q = query(
    collection(db, 'chats'),
    where('users', 'array-contains', currentUserId),
    orderBy('lastMessageTime', 'desc')
  );
  return onSnapshot(
    q,
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    err => console.warn('listenToChats error:', err)
  );
}
