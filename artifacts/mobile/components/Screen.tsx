import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppBackground } from '@/components/Brand';

export function useScreenInsets() {
  const insets = useSafeAreaInsets();
  return {
    top: Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top,
    bottom: Platform.OS === 'web' ? Math.max(insets.bottom, 34) : insets.bottom,
  };
}

export function Screen({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const insets = useScreenInsets();
  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }, style]}>
      <AppBackground />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
