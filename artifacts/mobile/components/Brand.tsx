import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useColors } from '@/hooks/useColors';
import { t } from '@/lib/i18n';
import { rtlRowDirection } from '@/lib/rtl';

export function AppBackground() {
  const colors = useColors();
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice">
        <Defs>
          <RadialGradient id="orbPurple" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#5B2BD6" stopOpacity="0.88" />
            <Stop offset="100%" stopColor="#5B2BD6" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="orbGreen" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#7CFF4F" stopOpacity="0.28" />
            <Stop offset="100%" stopColor="#7CFF4F" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="orbViolet" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#7C4DFF" stopOpacity="0.7" />
            <Stop offset="100%" stopColor="#7C4DFF" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width="1000" height="1000" fill={colors.background} />
        <Circle cx="920" cy="85" r="420" fill="url(#orbPurple)" />
        <Circle cx="75" cy="510" r="390" fill="url(#orbGreen)" />
        <Circle cx="850" cy="1010" r="420" fill="url(#orbViolet)" />
      </Svg>
    </View>
  );
}

export function WetrivaLogo({ compact = false }: { compact?: boolean }) {
  const colors = useColors();
  const size = compact ? 42 : 52;
  return (
    <View style={styles.logoRow}>
      <View
        style={[styles.logoMark, { width: size, height: size, borderRadius: compact ? 14 : 17, backgroundColor: colors.primary }]}
        accessibilityLabel={t.brandLogo}
      >
        <Svg width={size * 0.62} height={size * 0.54} viewBox="0 0 40 34">
          <Path
            d="M4 5 L11 28 L20 11 L29 28 L36 5"
            fill="none"
            stroke={colors.primaryForeground}
            strokeWidth="4.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>
      {!compact ? (
        <Text
          accessibilityLabel={t.brand}
          style={[styles.wordmark, { color: colors.foreground }]}
        >
          {t.brand}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  logoRow: { flexDirection: rtlRowDirection, alignItems: 'center', gap: 12 },
  logoMark: { alignItems: 'center', justifyContent: 'center' },
  wordmark: { fontFamily: 'IBMPlexSansArabic_700Bold', fontSize: 26, letterSpacing: 0.4 },
});
