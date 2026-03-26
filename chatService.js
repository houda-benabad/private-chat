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
  deleteField,
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
    // Always refresh participantData so profile photo / name changes propagate.
    // Also clear the current user's deletedBy entry so the chat reappears
    // if they previously hid it and are now intentionally restarting it.
    await setDoc(
      chatRef,
      { participantData, deletedBy: { [currentUserId]: deleteField() } },
      { merge: true }
    );
    console.log('[getOrCreateChat] existing chat doc updated with fresh participantData:', chatId);
  }
  return chatId;
}

/**
 * Adds a message to the chat and updates lastMessage / lastMessageTime on the chat doc.
 * senderName is used as the push notification title.
 * Push delivery is fire-and-forget — never blocks or throws from here.
 */
export async function sendMessage(chatId, senderId, text, senderName = '') {
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

    // Fire-and-forget push notification — intentionally not awaited so a
    // notification failure never blocks or surfaces an error to the sender.
    _sendPushToOtherUser({ chatId, senderId, senderName, text });
  } catch (err) {
    console.error('[sendMessage] ERROR — code:', err.code, '| message:', err.message);
    throw err; // re-throw so ChatScreen can restore the input text
  }
}

/**
 * Internal helper: looks up the other participant's push token and fires the
 * Expo push notification. Swallows all errors — never throws.
 */
async function _sendPushToOtherUser({ chatId, senderId, senderName, text }) {
  try {
    // 1. Get the chat doc to find the other user's UID
    const chatSnap = await getDoc(doc(db, 'chats', chatId));
    if (!chatSnap.exists()) return;
    const chatData = chatSnap.data();

    const otherUid = (chatData.users || []).find(u => u !== senderId);
    if (!otherUid) return;

    // 2. Skip if the other user has hidden this conversation (deletedBy entry
    //    exists and no newer messages have been sent since they hid it)
    const otherDeletedAt = chatData.deletedBy?.[otherUid];
    if (otherDeletedAt) {
      const lastTime = chatData.lastMessageTime;
      if (!lastTime || lastTime.toMillis() <= otherDeletedAt.toMillis()) {
        console.log('[notifications] other user hid this chat — skipping push');
        return;
      }
    }

    // 3. Get the other user's push token
    const otherSnap = await getDoc(doc(db, 'users', otherUid));
    if (!otherSnap.exists()) return;
    const expoPushToken = otherSnap.data()?.expoPushToken;
    if (!expoPushToken) return;

    // 4. Send via the Expo push service (imported lazily to avoid circular deps)
    const { sendPushNotification } = await import('./notificationService');
    sendPushNotification({ expoPushToken, senderName, messageText: text, chatId, senderUid: senderId });
  } catch (err) {
    console.warn('[notifications] _sendPushToOtherUser error:', err);
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
 * Hides a chat for the current user only (soft delete).
 * Records a deletedBy timestamp on the chat doc — no documents are removed.
 * The chat reappears automatically if a new message arrives after this timestamp.
 */
export async function hideChat(chatId, currentUserId) {
  await setDoc(
    doc(db, 'chats', chatId),
    { deletedBy: { [currentUserId]: Timestamp.fromDate(new Date()) } },
    { merge: true }
  );
}

/**
 * Real-time listener on the messages subcollection ordered by timestamp asc.
 * If deletedAt (a Firestore Timestamp) is provided, only messages AFTER that
 * time are returned — so users who hid then restarted a chat only see new msgs.
 * Returns the unsubscribe function.
 */
export function listenToMessages(chatId, callback, deletedAt = null) {
  console.log('[listenToMessages] subscribing — chatId:', chatId, '| deletedAt:', deletedAt);
  const q = query(
    collection(db, 'chats', chatId, 'messages'),
    orderBy('timestamp', 'asc')
  );
  return onSnapshot(
    q,
    snap => {
      let messages = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (deletedAt) {
        messages = messages.filter(m => m.timestamp && m.timestamp.toMillis() > deletedAt.toMillis());
      }
      console.log('[listenToMessages] snapshot — chatId:', chatId, '| count:', messages.length);
      callback(messages);
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
      const chats = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(chat => {
          const deletedAt = chat.deletedBy?.[currentUserId];
          if (!deletedAt) return true; // not hidden
          // Reappear if a new message arrived after the user hid it
          const lastTime = chat.lastMessageTime;
          return lastTime && lastTime.toMillis() > deletedAt.toMillis();
        });
      console.log('[listenToChats] snapshot — uid:', currentUserId, '| raw:', snap.docs.length, '| visible:', chats.length);
      callback(chats);
    },
    err => console.error('[listenToChats] ERROR — code:', err.code, '| message:', err.message, err)
  );
}
