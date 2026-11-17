import { useState } from 'react';
import {
  Alert,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { Screen, useScreenInsets } from '@/components/Screen';
import { GlassCard, GlassInput, PillButton } from '@/components/Primitives';
import { WetrivaLogo } from '@/components/Brand';
import { useColors } from '@/hooks/useColors';
import { friendlyError, t } from '@/lib/i18n';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { rtlRowDirection } from '@/lib/rtl';

export function AuthScreen({ mode }: { mode: 'login' | 'register' }) {
  const colors = useColors();
  const insets = useScreenInsets();
  const isLogin = mode === 'login';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorText, setErrorText] = useState('');

  async function submit() {
    setErrorText('');
    if (!isLogin && !name.trim()) {
      setErrorText(t.auth.validationName);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorText(t.auth.validationEmail);
      return;
    }
    if (password.length < 8) {
      setErrorText(t.auth.validationPassword);
      return;
    }
    if (!isLogin && password !== confirmPassword) {
      setErrorText(t.auth.validationConfirm);
      return;
    }
    if (!isSupabaseConfigured) {
      setErrorText(t.errors.setup);
      return;
    }

    setBusy(true);
    try {
      const client = getSupabase();
      if (isLogin) {
        const { error } = await client.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      } else {
        const { data, error } = await client.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { name: name.trim() } },
        });
        if (error) throw error;
        if (!data.session) {
          Alert.alert(t.auth.checkEmail);
          router.replace('/(auth)/login');
        }
      }
    } catch (error) {
      setErrorText(friendlyError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen style={{ paddingTop: 0 }}>
      <KeyboardAwareScrollViewCompat
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: 22,
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 24,
        }}
        bottomOffset={30}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ alignItems: 'center', gap: 15, marginBottom: 28 }}>
          <WetrivaLogo />
          <Text
            style={{
              color: colors.text,
              fontFamily: 'IBMPlexSansArabic_700Bold',
              fontSize: 27,
              textAlign: 'center',
            }}
          >
            {isLogin ? t.auth.loginTitle : t.auth.registerTitle}
          </Text>
          <Text
            style={{
              color: colors.subtleText,
              fontFamily: 'IBMPlexSansArabic_400Regular',
              fontSize: 14,
              textAlign: 'center',
            }}
          >
            {isLogin ? t.auth.loginSubtitle : t.auth.registerSubtitle}
          </Text>
        </View>

        <GlassCard style={{ padding: 20, gap: 16 }}>
          {!isSupabaseConfigured ? (
            <View
              style={{
                padding: 13,
                borderRadius: 14,
                backgroundColor: colors.dangerWash,
                gap: 5,
              }}
            >
              <Text
                style={{
                  color: colors.text,
                  textAlign: 'right',
                  fontFamily: 'IBMPlexSansArabic_600SemiBold',
                  fontSize: 14,
                }}
              >
                {t.auth.configTitle}
              </Text>
              <Text
                style={{
                  color: colors.subtleText,
                  textAlign: 'right',
                  fontFamily: 'IBMPlexSansArabic_400Regular',
                  fontSize: 12,
                  lineHeight: 20,
                }}
              >
                {t.auth.configBody}
              </Text>
            </View>
          ) : null}

          {!isLogin ? (
            <GlassInput
              label={t.auth.name}
              value={name}
              onChangeText={setName}
              placeholder={t.auth.namePlaceholder}
              autoComplete="name"
              autoCapitalize="words"
              returnKeyType="next"
              testID="register-name"
            />
          ) : null}
          <GlassInput
            label={t.auth.email}
            value={email}
            onChangeText={setEmail}
            placeholder={t.auth.emailPlaceholder}
            keyboardType="email-address"
            autoComplete="email"
            autoCapitalize="none"
            textDirection="ltr"
            returnKeyType="next"
            testID="auth-email"
          />
          <GlassInput
            label={t.auth.password}
            value={password}
            onChangeText={setPassword}
            placeholder={t.auth.passwordPlaceholder}
            secureTextEntry
            autoComplete={isLogin ? 'password' : 'new-password'}
            autoCapitalize="none"
            textDirection="ltr"
            returnKeyType={isLogin ? 'done' : 'next'}
            testID="auth-password"
          />
          {!isLogin ? (
            <GlassInput
              label={t.auth.confirmPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder={t.auth.passwordPlaceholder}
              secureTextEntry
              autoComplete="new-password"
              autoCapitalize="none"
              textDirection="ltr"
              returnKeyType="done"
              testID="auth-confirm-password"
            />
          ) : null}

          {errorText ? (
            <Text
              accessibilityRole="alert"
              style={{
                color: colors.destructive,
                textAlign: 'right',
                fontFamily: 'IBMPlexSansArabic_500Medium',
                fontSize: 13,
                lineHeight: 22,
              }}
            >
              {errorText}
            </Text>
          ) : null}

          <PillButton
            label={isLogin ? t.auth.loginAction : t.auth.registerAction}
            onPress={() => void submit()}
            loading={busy}
            disabled={!isSupabaseConfigured}
            testID="auth-submit"
            style={{ marginTop: 2 }}
          />
        </GlassCard>

        <View
          style={{
            flexDirection: rtlRowDirection,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 7,
            marginTop: 22,
            minHeight: 44,
          }}
        >
          <Text
            style={{
              color: colors.subtleText,
              fontFamily: 'IBMPlexSansArabic_400Regular',
              fontSize: 13,
            }}
          >
            {isLogin ? t.auth.noAccount : t.auth.hasAccount}
          </Text>
          <Text
            accessibilityRole="link"
            onPress={() => router.replace(isLogin ? '/(auth)/register' : '/(auth)/login')}
            style={{
              color: colors.primary,
              fontFamily: 'IBMPlexSansArabic_600SemiBold',
              fontSize: 13,
              padding: 8,
            }}
          >
            {isLogin ? t.auth.goRegister : t.auth.goLogin}
          </Text>
        </View>
      </KeyboardAwareScrollViewCompat>
    </Screen>
  );
}
