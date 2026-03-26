import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

// Show a banner + play sound when a notification arrives while the app is open.
// The handler runs BEFORE the notification is displayed, so we can decide per-notification.
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    // If the user is already inside the chat this message came from, suppress the banner.
    const chatId = notification.request.content.data?.chatId;
    if (chatId && chatId === _activeChatId) {
      return { shouldShowAlert: false, shouldPlaySound: false, shouldSetBadge: false };
    }
    return { shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false };
  },
});

// Module-level variable so ChatScreen can register/unregister the active chat.
// This avoids React context overhead for a single scalar value.
let _activeChatId = null;

export function setActiveChatId(chatId) {
  _activeChatId = chatId;
}

export function clearActiveChatId() {
  _activeChatId = null;
}

/**
 * Requests permission, gets the Expo push token, and saves it to Firestore.
 * Safe to call on every app launch — re-registration is idempotent.
 * Returns the token string, or null if running on a simulator / permission denied.
 */
export async function registerForPushNotifications(uid) {
  if (!Device.isDevice) {
    console.log('[notifications] Push notifications require a physical device.');
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[notifications] Permission not granted.');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;
    console.log('[notifications] Expo push token:', token);

    if (uid && token) {
      await setDoc(doc(db, 'users', uid), { expoPushToken: token }, { merge: true });
      console.log('[notifications] Token saved to Firestore for uid:', uid);
    }

    return token;
  } catch (err) {
    console.warn('[notifications] registerForPushNotifications error:', err);
    return null;
  }
}

/**
 * Sends a push notification via the Expo push service.
 * Fire-and-forget — never throws so callers don't need to handle errors.
 */
export async function sendPushNotification({ expoPushToken, senderName, messageText, chatId, senderUid }) {
  if (!expoPushToken) return;

  const body = messageText.length > 100
    ? messageText.substring(0, 100) + '…'
    : messageText;

  const message = {
    to: expoPushToken,
    sound: 'default',
    title: senderName || 'New Message',
    body,
    data: {
      type: 'new_message',
      chatId,
      senderUid,
      senderName: senderName || '',
    },
  };

  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
    const json = await res.json();
    if (json?.data?.status === 'error') {
      console.warn('[notifications] Expo push error:', json.data.message);
    }
  } catch (err) {
    console.warn('[notifications] sendPushNotification fetch error:', err);
  }
}
