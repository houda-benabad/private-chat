import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

export const firebaseConfig = {
  apiKey: "AIzaSyDBOr55OTaN5Zty6e6WcdzO2flLj7rkNRM",
  authDomain: "project-7813e.firebaseapp.com",
  projectId: "project-7813e",
  storageBucket: "project-7813e.firebasestorage.app",
  messagingSenderId: "981479003631",
  appId: "1:981479003631:web:bdcec174a5bd61136f921a",
  measurementId: "G-49RFZ98D4M"
};

const app = initializeApp(firebaseConfig);

const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

export { auth };
export const db = getFirestore(app);
export const storage = getStorage(app);
