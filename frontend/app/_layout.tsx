import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { AuthProvider } from '@/context/auth';
import { AppThemeProvider } from '@/context/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  // Only runs once when app first loads
  useEffect(() => {
    const checkToken = async () => {
      const token = Platform.OS === 'web'
        ? localStorage.getItem('token')
        : await SecureStore.getItemAsync('token');
      if (!token) setTimeout(() => router.replace('/login'), 0);
    };
    checkToken();
  }, []);


  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AppThemeProvider>
        <AuthProvider>
          <Stack>
            <Stack.Screen name="(tabs)"       options={{ headerShown: false }} />
            <Stack.Screen name="modal"        options={{ presentation: 'modal', title: 'Modal' }} />
            <Stack.Screen name="profile" options={{ headerShown: false }} />
            <Stack.Screen name="student/[id]" options={{ title: 'Student Profile', headerBackTitle: 'Matches' }} />
            <Stack.Screen name="login"        options={{ headerShown: false }} />
            <Stack.Screen name="create_class" options={{ title: 'Create Class', headerBackTitle: 'Home' }} />
            <Stack.Screen name="thread/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="thread/new" options={{ headerShown: false }} />
          </Stack>
        </AuthProvider>
      </AppThemeProvider>
    </ThemeProvider>
  );
}