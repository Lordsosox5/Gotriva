import React, { useEffect, useState } from 'react';
import { Platform, StatusBar, View } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  useFonts,
} from 'expo-font';
import {
  IBMPlexSansArabic_400Regular,
  IBMPlexSansArabic_500Medium,
  IBMPlexSansArabic_600SemiBold,
  IBMPlexSansArabic_700Bold,
} from '@expo-google-fonts/ibm-plex-sans-arabic';
import { router, Stack, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { AppBackground } from '@/components/Brand';
import { AuthProvider, useAuth } from '@/lib/auth';
import { prepareArabicLayout } from '@/lib/rtl';
import { useColors } from '@/hooks/useColors';
import colors from '@/constants/colors';

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();
const wetrivaNavigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.dark.primary,
    background: 'transparent',
    card: 'transparent',
    text: colors.dark.text,
    border: colors.dark.glassBorder,
    notification: colors.dark.destructive,
  },
};

function RootLayoutNav() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const inAuth = segments[0] === '(auth)';

  useEffect(() => {
    if (loading) return;
    if (!session && !inAuth) {
      router.replace('/(auth)/login');
    } else if (session && inAuth) {
      router.replace('/(tabs)');
    }
  }, [inAuth, loading, session]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="item/[id]" />
      <Stack.Screen
        name="add-item"
        options={{
          presentation: 'modal',
          animation: Platform.OS === 'ios' ? 'slide_from_bottom' : 'fade',
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    IBMPlexSansArabic_400Regular,
    IBMPlexSansArabic_500Medium,
    IBMPlexSansArabic_600SemiBold,
    IBMPlexSansArabic_700Bold,
  });
  const [rtlReady, setRtlReady] = useState(Platform.OS === 'web');
  const colors = useColors();

  useEffect(() => {
    let alive = true;
    void prepareArabicLayout().finally(() => {
      if (alive) setRtlReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if ((fontsLoaded || fontError) && rtlReady) {
      SplashScreen.hideAsync();
    }
  }, [fontError, fontsLoaded, rtlReady]);

  if ((!fontsLoaded && !fontError) || !rtlReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <SafeAreaProvider>
          <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
              <AuthProvider>
                <View style={{ flex: 1, backgroundColor: colors.background }}>
                  <StatusBar barStyle="light-content" />
                  <AppBackground />
                  <ThemeProvider value={wetrivaNavigationTheme}>
                    <RootLayoutNav />
                  </ThemeProvider>
                </View>
              </AuthProvider>
            </QueryClientProvider>
          </ErrorBoundary>
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
