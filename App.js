import { useEffect, useRef } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer, getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerForPushNotifications } from './notificationService';

import SplashScreen from './screens/SplashScreen';
import PhoneScreen from './screens/PhoneScreen';
import OTPScreen from './screens/OTPScreen';
import ProfileSetupScreen from './screens/ProfileSetupScreen';
import ChatsScreen from './screens/ChatsScreen';
import ContactsScreen from './screens/ContactsScreen';
import ProfileScreen from './screens/ProfileScreen';
import ChatScreen from './screens/ChatScreen';

const Stack = createNativeStackNavigator();
const ChatsStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Chats tab has its own stack so ChatScreen pushes inside it (tab bar hides)
function ChatsNavigator() {
  return (
    <ChatsStack.Navigator screenOptions={{ headerShown: false }}>
      <ChatsStack.Screen name="Chats" component={ChatsScreen} />
      <ChatsStack.Screen
        name="Chat"
        component={ChatScreen}
        options={{ animation: 'slide_from_right' }}
      />
    </ChatsStack.Navigator>
  );
}

// Hide tab bar when ChatScreen is active inside ChatsNavigator
function getTabBarStyle(route) {
  const focused = getFocusedRouteNameFromRoute(route) ?? 'Chats';
  if (focused === 'Chat') return { display: 'none' };
  return {
    backgroundColor: '#fff',
    borderTopColor: '#f0e8e0',
    borderTopWidth: 1,
    height: 56,
    paddingBottom: 6,
    paddingTop: 6,
  };
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#E46C53',
        tabBarInactiveTintColor: '#c4b8ae',
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: '400',
        },
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#f0e8e0',
          borderTopWidth: 1,
          height: 56,
          paddingBottom: 6,
          paddingTop: 6,
        },
      }}
    >
      <Tab.Screen
        name="ChatsTab"
        component={ChatsNavigator}
        options={({ route }) => ({
          tabBarLabel: 'Chats',
          tabBarStyle: getTabBarStyle(route),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-ellipses" size={size ?? 20} color={color} />
          ),
        })}
      />
      <Tab.Screen
        name="ContactsTab"
        component={ContactsScreen}
        options={{
          tabBarLabel: 'Contacts',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size ?? 20} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size ?? 20} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const navigationRef = useRef(null);
  const notificationResponseListener = useRef(null);

  useEffect(() => {
    // Register for push notifications if a session exists
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('user_session');
        const session = raw ? JSON.parse(raw) : null;
        if (session?.uid) {
          registerForPushNotifications(session.uid);
        }
      } catch (err) {
        console.warn('[App] push registration error:', err);
      }
    })();

    // Handle notification taps — navigate to the relevant chat
    notificationResponseListener.current =
      Notifications.addNotificationResponseReceivedListener(response => {
        const data = response.notification.request.content.data;
        if (data?.type === 'new_message' && data?.chatId && navigationRef.current) {
          navigationRef.current.navigate('ChatsTab', {
            screen: 'Chat',
            params: {
              chatId: data.chatId,
              otherUid: data.senderUid,
              otherName: data.senderName || 'Chat',
              otherPhotoURL: null,
              otherAvatarColor: null,
            },
          });
        }
      });

    return () => {
      notificationResponseListener.current?.remove();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator
          initialRouteName="Splash"
          screenOptions={{ headerShown: false, animation: 'fade_from_bottom' }}
        >
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="Phone" component={PhoneScreen} />
          <Stack.Screen
            name="OTP"
            component={OTPScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="ProfileSetup"
            component={ProfileSetupScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="MainTabs"
            component={MainTabs}
            options={{ animation: 'fade' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
