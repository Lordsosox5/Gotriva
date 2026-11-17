import React, { type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import {
  AlertCircle,
  Box,
  type LucideIcon,
  Search,
} from 'lucide-react-native';
import { useColors } from '@/hooks/useColors';
import { arabicNumber, initials } from '@/lib/format';
import type { FriendProfile, ItemRow as Item } from '@/lib/database.types';
import { t } from '@/lib/i18n';
import { rtlRowDirection } from '@/lib/rtl';

export function GlassCard({
  children,
  style,
  intensity = 38,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
}) {
  const colors = useColors();
  return (
    <BlurView
      intensity={intensity}
      tint="dark"
      style={[
        styles.glassCard,
        {
          backgroundColor: colors.glass,
          borderColor: colors.glassBorder,
          shadowColor: colors.shadow,
        },
        style,
      ]}
    >
      {children}
    </BlurView>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'quiet';

export function PillButton({
  label,
  onPress,
  variant = 'primary',
  icon: Icon,
  disabled = false,
  loading = false,
  accessibilityLabel,
  style,
  testID,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: LucideIcon;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const colors = useColors();
  const primary = variant === 'primary';
  const danger = variant === 'danger';
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      disabled={disabled || loading}
      onPress={() => {
        if (primary) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [
        styles.pillButton,
        {
          backgroundColor: primary
            ? colors.primary
            : danger
              ? colors.destructive
              : variant === 'secondary'
                ? colors.glassSoft
                : 'transparent',
          borderColor:
            variant === 'secondary' ? colors.glassBorder : 'transparent',
          borderWidth: variant === 'secondary' ? 1 : 0,
          opacity: disabled || loading ? 0.55 : pressed ? 0.84 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={primary ? colors.primaryForeground : colors.text} />
      ) : (
        <>
          {Icon ? (
            <Icon
              size={18}
              color={primary ? colors.primaryForeground : danger ? colors.destructiveForeground : colors.text}
              strokeWidth={1.8}
            />
          ) : null}
          <Text
            style={[
              styles.buttonText,
              {
                color: primary
                  ? colors.primaryForeground
                  : danger
                    ? colors.destructiveForeground
                    : colors.text,
              },
            ]}
          >
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export function Chip({
  label,
  tone = 'neutral',
  selected = false,
  onPress,
  testID,
}: {
  label: string;
  tone?: 'neutral' | 'success' | 'danger';
  selected?: boolean;
  onPress?: () => void;
  testID?: string;
}) {
  const colors = useColors();
  const style = [
    styles.chip,
    {
      backgroundColor:
        tone === 'success'
          ? colors.primary
          : tone === 'danger'
            ? colors.destructive
            : selected
              ? colors.accentWashStrong
              : colors.glassSubtle,
      borderColor:
        tone === 'neutral' && selected ? colors.primary : 'transparent',
      borderWidth: tone === 'neutral' && selected ? 1 : 0,
    },
  ];
  const textColor =
    tone === 'success'
      ? colors.primaryForeground
      : tone === 'danger'
        ? colors.destructiveForeground
        : colors.text;

  if (!onPress) {
    return (
      <View style={style}>
        <Text style={[styles.chipText, { color: textColor }]}>{label}</Text>
      </View>
    );
  }
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [...style, pressed && styles.pressed]}
    >
      <Text style={[styles.chipText, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

export function SegmentedControl({
  options,
  value,
  onChange,
  testID,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  testID?: string;
}) {
  const colors = useColors();
  return (
    <View
      testID={testID}
      accessibilityRole="tablist"
      style={[styles.segmented, { borderColor: colors.glassBorder }]}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={option.label}
            onPress={() => onChange(option.value)}
            style={[
              styles.segment,
              active && { backgroundColor: colors.primary },
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                { color: active ? colors.primaryForeground : colors.subtleText },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function GlassInput({
  label,
  icon: Icon,
  style,
  textDirection = 'rtl',
  ...props
}: TextInputProps & {
  label?: string;
  icon?: LucideIcon;
  textDirection?: 'rtl' | 'ltr';
}) {
  const colors = useColors();
  return (
    <View style={styles.inputWrap}>
      {label ? (
        <Text style={[styles.inputLabel, { color: colors.subtleText }]}>
          {label}
        </Text>
      ) : null}
      <View
        style={[
          styles.inputShell,
          { borderColor: colors.glassBorder, backgroundColor: colors.glass },
        ]}
      >
        {Icon ? <Icon size={19} color={colors.subtleText} strokeWidth={1.8} /> : null}
        <TextInput
          {...props}
          placeholderTextColor={colors.placeholder}
          textAlign={textDirection === 'rtl' ? 'right' : 'left'}
          style={[
            styles.input,
            { color: colors.text, writingDirection: textDirection },
            style,
          ]}
        />
      </View>
    </View>
  );
}

export function Avatar({
  name,
  uri,
  size = 44,
}: {
  name: string | null | undefined;
  uri?: string | null;
  size?: number;
}) {
  const colors = useColors();
  return (
    <View
      accessibilityLabel={name ?? t.common.unknown}
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.accentWashStrong,
          borderColor: colors.glassBorder,
        },
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          contentFit="cover"
        />
      ) : (
        <Text style={[styles.avatarText, { color: colors.primary }]}>
          {initials(name)}
        </Text>
      )}
    </View>
  );
}

export function StatTile({
  title,
  count,
  icon: Icon,
}: {
  title: string;
  count: number;
  icon: LucideIcon;
}) {
  const colors = useColors();
  return (
    <GlassCard style={styles.statTile}>
      <View style={styles.statTop}>
        <Icon size={19} color={colors.primary} strokeWidth={1.8} />
        <Text style={[styles.statNumber, { color: colors.primary }]}>
          {arabicNumber(count)}
        </Text>
      </View>
      <Text style={[styles.statLabel, { color: colors.subtleText }]}>{title}</Text>
    </GlassCard>
  );
}

export function ItemRow({
  item,
  owner,
  onPress,
  badge,
}: {
  item: Item;
  owner?: FriendProfile | null;
  onPress: () => void;
  badge?: { label: string; tone?: 'success' | 'danger' | 'neutral' };
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.title}، ${owner?.name ?? t.common.unknown}`}
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <GlassCard style={styles.itemRow}>
        <View style={[styles.itemPhoto, { backgroundColor: colors.accentWash }]}>
          {item.photo_url ? (
            <Image
              source={{ uri: item.photo_url }}
              contentFit="cover"
              style={StyleSheet.absoluteFill}
              transition={160}
            />
          ) : (
            <Box size={25} color={colors.primary} strokeWidth={1.7} />
          )}
        </View>
        <View style={styles.itemInfo}>
          <Text numberOfLines={1} style={[styles.itemTitle, { color: colors.text }]}>
            {item.title}
          </Text>
          <Text numberOfLines={1} style={[styles.itemSubtitle, { color: colors.subtleText }]}>
            {owner?.name ?? t.common.unknown}
          </Text>
        </View>
        {badge ? <Chip label={badge.label} tone={badge.tone} /> : null}
      </GlassCard>
    </Pressable>
  );
}

export function Skeleton({
  width = '100%',
  height = 18,
  style,
}: {
  width?: number | `${number}%`;
  height?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.skeleton,
        { width, height, backgroundColor: colors.skeleton },
        style,
      ]}
    />
  );
}

export function SkeletonCard() {
  return (
    <GlassCard style={styles.skeletonCard}>
      <Skeleton width={58} height={58} style={{ borderRadius: 15 }} />
      <View style={styles.skeletonText}>
        <Skeleton width="72%" height={15} />
        <Skeleton width="46%" height={12} />
      </View>
    </GlassCard>
  );
}

export function EmptyState({
  title,
  description,
  icon: Icon = Box,
  action,
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
  action?: ReactNode;
}) {
  const colors = useColors();
  return (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.accentWash }]}>
        <Icon size={24} color={colors.primary} strokeWidth={1.8} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.emptyDescription, { color: colors.subtleText }]}>
        {description}
      </Text>
      {action}
    </View>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  const colors = useColors();
  return (
    <View style={styles.errorState}>
      <AlertCircle size={22} color={colors.destructive} strokeWidth={1.8} />
      <Text style={[styles.errorText, { color: colors.text }]}>{message}</Text>
      <PillButton
        label={t.common.retry}
        onPress={onRetry}
        variant="secondary"
        style={{ alignSelf: 'center' }}
      />
    </View>
  );
}

export function SearchIcon() {
  const colors = useColors();
  return <Search size={18} color={colors.subtleText} strokeWidth={1.8} />;
}

const styles = StyleSheet.create({
  glassCard: {
    borderWidth: 1,
    borderRadius: 20,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 9 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 3,
  },
  pillButton: {
    minHeight: 48,
    borderRadius: 28,
    paddingHorizontal: 20,
    gap: 9,
    flexDirection: rtlRowDirection,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontFamily: 'IBMPlexSansArabic_600SemiBold',
    fontSize: 15,
  },
  pressed: { opacity: 0.8, transform: [{ scale: 0.985 }] },
  chip: {
    minHeight: 44,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 13,
  },
  chipText: {
    fontFamily: 'IBMPlexSansArabic_500Medium',
    fontSize: 12,
  },
  segmented: {
    minHeight: 52,
    borderRadius: 28,
    borderWidth: 1,
    padding: 4,
    flexDirection: rtlRowDirection,
  },
  segment: {
    flex: 1,
    minHeight: 42,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  segmentText: {
    fontFamily: 'IBMPlexSansArabic_600SemiBold',
    fontSize: 13,
    textAlign: 'center',
  },
  inputWrap: { gap: 8 },
  inputLabel: {
    textAlign: 'right',
    fontFamily: 'IBMPlexSansArabic_500Medium',
    fontSize: 13,
  },
  inputShell: {
    minHeight: 54,
    borderRadius: 17,
    borderWidth: 1,
    paddingHorizontal: 15,
    flexDirection: rtlRowDirection,
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    minHeight: 50,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: 'IBMPlexSansArabic_400Regular',
    textAlignVertical: 'center',
  },
  avatar: {
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: 'IBMPlexSansArabic_600SemiBold',
    fontSize: 18,
  },
  statTile: {
    flex: 1,
    minHeight: 105,
    padding: 16,
    gap: 8,
  },
  statTop: { flexDirection: rtlRowDirection, justifyContent: 'space-between', alignItems: 'center' },
  statNumber: { fontFamily: 'IBMPlexSansArabic_700Bold', fontSize: 25 },
  statLabel: { textAlign: 'right', fontFamily: 'IBMPlexSansArabic_500Medium', fontSize: 13 },
  itemRow: {
    minHeight: 84,
    padding: 12,
    gap: 12,
    flexDirection: rtlRowDirection,
    alignItems: 'center',
  },
  itemPhoto: {
    width: 58,
    height: 58,
    borderRadius: 15,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: { flex: 1, gap: 4, alignItems: 'flex-end' },
  itemTitle: { fontFamily: 'IBMPlexSansArabic_600SemiBold', fontSize: 15 },
  itemSubtitle: { fontFamily: 'IBMPlexSansArabic_400Regular', fontSize: 12 },
  skeleton: {
    borderRadius: 8,
  },
  skeletonCard: {
    minHeight: 82,
    padding: 12,
    flexDirection: rtlRowDirection,
    alignItems: 'center',
    gap: 12,
  },
  skeletonText: { flex: 1, gap: 11, alignItems: 'flex-end' },
  emptyState: { alignItems: 'center', paddingVertical: 30, paddingHorizontal: 22, gap: 10 },
  emptyIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontFamily: 'IBMPlexSansArabic_600SemiBold', textAlign: 'center', fontSize: 17 },
  emptyDescription: { fontFamily: 'IBMPlexSansArabic_400Regular', textAlign: 'center', fontSize: 13, lineHeight: 22 },
  errorState: { alignItems: 'center', paddingHorizontal: 20, paddingVertical: 28, gap: 15 },
  errorText: { fontFamily: 'IBMPlexSansArabic_500Medium', textAlign: 'center', fontSize: 14, lineHeight: 23 },
});
