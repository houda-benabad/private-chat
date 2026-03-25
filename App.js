import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SplashScreen from './screens/SplashScreen';
import PhoneScreen from './screens/PhoneScreen';
import OTPScreen from './screens/OTPScreen';
import ProfileSetupScreen from './screens/ProfileSetupScreen';
import MainScreen from './screens/MainScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
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
          name="Main"
          component={MainScreen}
          options={{ animation: 'fade' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
