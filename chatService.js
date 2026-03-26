import { db } from './firebase';
import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  writeBatch,
  deleteDoc,
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
  console.log('[getOrCreateChat] chatId:', chatId, '| doc exists:', snap.exists());
  if (!snap.exists()) {
    // Use a client-side Timestamp for lastMessageTime so the compound
    // query (array-contains + orderBy) reflects this doc immediately via
    // the local cache. serverTimestamp() stays null in pending writes and
    // is excluded from compound query results until server confirmation.
    await setDoc(chatRef, {
      users: [currentUserId, otherUserId],
      lastMessage: '',
      lastMessageTime: Timestamp.fromDate(new Date()),
      participantData,
      createdAt: serverTimestamp(),
    });
    console.log('[getOrCreateChat] new chat doc created:', chatId);
  } else {
    console.log('[getOrCreateChat] existing chat doc found:', chatId);
  }
  return chatId;
}

/**
 * Adds a message to the chat and updates lastMessage / lastMessageTime on the chat doc.
 */
export async function sendMessage(chatId, senderId, text) {
  console.log('[sendMessage] chatId:', chatId, '| senderId:', senderId, '| text:', text);
  try {
    const now = Timestamp.fromDate(new Date());
    await addDoc(collection(db, 'chats', chatId, 'messages'), {
      senderId,
      text,
      timestamp: now,
    });
    console.log('[sendMessage] message doc written OK');
    // setDoc with merge instead of updateDoc — safe even if the chat doc
    // doesn't exist yet, and uses a client-side timestamp so the compound
    // listenToChats query picks up the change immediately.
    await setDoc(
      doc(db, 'chats', chatId),
      { lastMessage: text, lastMessageTime: now },
      { merge: true }
    );
    console.log('[sendMessage] chat doc updated OK');
  } catch (err) {
    console.error('[sendMessage] ERROR — code:', err.code, '| message:', err.message);
    throw err; // re-throw so ChatScreen can restore the input text
  }
}

/**
 * Deletes all Firestore data for the given uid:
 *   - All messages in every chat the user is part of
 *   - All chat docs the user is part of
 *   - The user's own doc in the users collection
 *
 * Uses writeBatch for efficiency. Batches are capped at 500 ops each,
 * so large message histories are split into multiple batches automatically.
 */
export async function deleteAccount(uid) {
  // 1. Find all chats this user is part of
  const chatsSnap = await getDocs(
    query(collection(db, 'chats'), where('users', 'array-contains', uid))
  );

  // 2. For each chat, delete all messages then the chat doc itself
  for (const chatDoc of chatsSnap.docs) {
    const messagesSnap = await getDocs(
      collection(db, 'chats', chatDoc.id, 'messages')
    );

    // Delete messages in batches of 499 (leave 1 slot for the chat doc)
    const messageDocs = messagesSnap.docs;
    for (let i = 0; i < messageDocs.length; i += 499) {
      const batch = writeBatch(db);
      messageDocs.slice(i, i + 499).forEach(msgDoc => batch.delete(msgDoc.ref));
      await batch.commit();
    }

    // Delete the chat doc itself
    await deleteDoc(chatDoc.ref);
  }

  // 3. Delete the user's own document (doc id = uid = phone number)
  await deleteDoc(doc(db, 'users', uid));
}

/**
 * Real-time listener on the messages subcollection ordered by timestamp asc.
 * Returns the unsubscribe function.
 */
export function listenToMessages(chatId, callback) {
  console.log('[listenToMessages] subscribing — chatId:', chatId);
  const q = query(
    collection(db, 'chats', chatId, 'messages'),
    orderBy('timestamp', 'asc')
  );
  return onSnapshot(
    q,
    snap => {
      console.log('[listenToMessages] snapshot — chatId:', chatId, '| count:', snap.docs.length);
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    },
    err => console.error('[listenToMessages] ERROR — code:', err.code, '| message:', err.message)
  );
}

/**
 * Real-time listener on all chats where the user is a participant,
 * ordered by lastMessageTime desc.
 * Returns the unsubscribe function.
 */
export function listenToChats(currentUserId, callback) {
  console.log('[listenToChats] subscribing — uid:', currentUserId);
  const q = query(
    collection(db, 'chats'),
    where('users', 'array-contains', currentUserId),
    orderBy('lastMessageTime', 'desc')
  );
  return onSnapshot(
    q,
    snap => {
      console.log('[listenToChats] snapshot — uid:', currentUserId, '| count:', snap.docs.length);
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    },
    err => console.error('[listenToChats] ERROR — code:', err.code, '| message:', err.message, err)
  );
}
