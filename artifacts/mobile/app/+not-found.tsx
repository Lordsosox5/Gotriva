import { Link, Stack } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { t } from '@/lib/i18n';
import { Screen } from '@/components/Screen';

export default function NotFoundScreen() {
  const colors = useColors();

  return (
    <>
      <Stack.Screen options={{ title: t.appTitle }} />
      <Screen style={styles.container}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          {t.errors.generic}
        </Text>

        <Link href="/" style={styles.link}>
          <Text style={[styles.linkText, { color: colors.primary }]}>
            {t.nav.home}
          </Text>
        </Link>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontSize: 14,
  },
});
