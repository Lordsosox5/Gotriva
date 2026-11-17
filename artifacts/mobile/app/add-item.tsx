import { useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Camera, ImagePlus, X } from 'lucide-react-native';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { Chip, GlassCard, GlassInput, PillButton, Skeleton } from '@/components/Primitives';
import { Screen, useScreenInsets } from '@/components/Screen';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/lib/auth';
import { fetchItemWithOwner } from '@/lib/data';
import { getSupabase } from '@/lib/supabase';
import { t } from '@/lib/i18n';
import { rtlRowDirection } from '@/lib/rtl';

type Condition = 'excellent' | 'good' | 'fair';
type SelectedPhoto = { uri: string; mimeType?: string | null };

const conditionOptions: { value: Condition; label: string }[] = [
  { value: 'excellent', label: t.item.excellent },
  { value: 'good', label: t.item.good },
  { value: 'fair', label: t.item.fair },
];

export default function AddItemScreen() {
  const colors = useColors();
  const insets = useScreenInsets();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ id?: string }>();
  const itemId = Array.isArray(params.id) ? params.id[0] : params.id;
  const editMode = Boolean(itemId);
  const itemQuery = useQuery({
    queryKey: ['item', itemId],
    enabled: Boolean(itemId),
    queryFn: () => fetchItemWithOwner(itemId!),
  });
  const item = itemQuery.data;
  const [draft, setDraft] = useState<{
    title?: string;
    category?: string;
    condition?: Condition;
    description?: string;
  }>({});
  const [selectedPhoto, setSelectedPhoto] = useState<SelectedPhoto | null>(null);
  const [busy, setBusy] = useState(false);
  const title = draft.title ?? item?.title ?? '';
  const category = draft.category ?? item?.category ?? t.explore.categories[6];
  const condition = draft.condition ?? (item?.condition === 'excellent' || item?.condition === 'fair' ? item.condition : 'good');
  const description = draft.description ?? item?.description ?? '';
  const photoUri = selectedPhoto?.uri ?? item?.photo_url ?? null;

  async function selectImage(camera: boolean) {
    try {
      const permission = camera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(t.addItem.photoPermission);
        return;
      }
      const result = camera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.82,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.82,
          });
      if (!result.canceled && result.assets[0]) {
        setSelectedPhoto({
          uri: result.assets[0].uri,
          mimeType: result.assets[0].mimeType,
        });
      }
    } catch {
      Alert.alert(t.addItem.photoPermission);
    }
  }

  async function uploadPhoto(photo: SelectedPhoto): Promise<string> {
    const extension = photo.mimeType?.includes('png') ? 'png' : 'jpg';
    const key = `${user!.id}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${extension}`;
    const file = new File(photo.uri);
    const { error } = await getSupabase()
      .storage.from('item-photos')
      .upload(key, file, {
        contentType: photo.mimeType ?? 'image/jpeg',
        upsert: false,
      });
    if (error) throw error;
    return getSupabase().storage.from('item-photos').getPublicUrl(key).data.publicUrl;
  }

  async function saveItem() {
    if (!title.trim()) {
      Alert.alert(t.addItem.validationTitle);
      return;
    }
    if (!user) return;
    setBusy(true);
    try {
      const photoUrl = selectedPhoto
        ? await uploadPhoto(selectedPhoto)
        : item?.photo_url ?? null;
      const payload = {
        title: title.trim(),
        category,
        condition,
        description: description.trim() || null,
        photo_url: photoUrl,
      };
      if (itemId) {
        const { error } = await getSupabase()
          .from('items')
          .update(payload)
          .eq('id', itemId);
        if (error) throw error;
      } else {
        const { error } = await getSupabase().from('items').insert({
          ...payload,
          owner_id: user.id,
          is_available: true,
        });
        if (error) throw error;
      }
      await queryClient.invalidateQueries();
      Alert.alert(t.addItem.saved);
      router.back();
    } catch {
      Alert.alert(t.addItem.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View style={styles.pageHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.common.close}
          onPress={() => router.back()}
          style={[styles.iconButton, { borderColor: colors.glassBorder }]}
        >
          <X size={20} color={colors.text} strokeWidth={1.8} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {editMode ? t.addItem.editTitle : t.addItem.addTitle}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      {editMode && itemQuery.isLoading ? (
        <View style={{ padding: 20, gap: 14 }}>
          <Skeleton height={210} style={{ borderRadius: 20 }} />
          <Skeleton height={55} style={{ borderRadius: 18 }} />
          <Skeleton height={55} style={{ borderRadius: 18 }} />
        </View>
      ) : (
        <KeyboardAwareScrollViewCompat
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: insets.bottom + 24,
            gap: 17,
          }}
          bottomOffset={75}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.fieldLabel, { color: colors.subtleText }]}>{t.addItem.photo}</Text>
          <GlassCard style={styles.photoCard}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : (
              <View style={[styles.photoPlaceholder, { backgroundColor: colors.accentWash }]}>
                <ImagePlus size={34} color={colors.primary} strokeWidth={1.7} />
              </View>
            )}
          </GlassCard>
          <View style={styles.photoActions}>
            <PillButton
              label={t.addItem.choosePhoto}
              icon={ImagePlus}
              variant="secondary"
              onPress={() => void selectImage(false)}
              style={{ flex: 1 }}
            />
            <PillButton
              label={t.addItem.takePhoto}
              icon={Camera}
              variant="secondary"
              onPress={() => void selectImage(true)}
              style={{ flex: 1 }}
            />
          </View>

          <GlassInput
            label={t.addItem.title}
            value={title}
            onChangeText={(value) => setDraft((current) => ({ ...current, title: value }))}
            placeholder={t.addItem.titlePlaceholder}
            returnKeyType="next"
            testID="item-title"
          />

          <View style={{ gap: 9 }}>
            <Text style={[styles.fieldLabel, { color: colors.subtleText }]}>{t.addItem.category}</Text>
            <View style={styles.chipWrap}>
              {t.explore.categories.slice(1).map((itemCategory) => (
                <Chip
                  key={itemCategory}
                  label={itemCategory}
                  selected={category === itemCategory}
                  onPress={() => setDraft((current) => ({ ...current, category: itemCategory }))}
                />
              ))}
            </View>
          </View>

          <View style={{ gap: 9 }}>
            <Text style={[styles.fieldLabel, { color: colors.subtleText }]}>{t.addItem.condition}</Text>
            <View style={styles.chipWrap}>
              {conditionOptions.map((option) => (
                <Chip
                  key={option.value}
                  label={option.label}
                  selected={condition === option.value}
                  onPress={() => setDraft((current) => ({ ...current, condition: option.value }))}
                />
              ))}
            </View>
          </View>

          <GlassInput
            label={t.addItem.description}
            value={description}
            onChangeText={(value) => setDraft((current) => ({ ...current, description: value }))}
            placeholder={t.addItem.descriptionPlaceholder}
            multiline
            style={{ minHeight: 104, textAlignVertical: 'top' }}
            returnKeyType="default"
            testID="item-description"
          />

          <PillButton
            label={editMode ? t.addItem.update : t.addItem.submit}
            onPress={() => void saveItem()}
            loading={busy}
            disabled={editMode && !item}
            testID="item-save"
          />
        </KeyboardAwareScrollViewCompat>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pageHeader: { minHeight: 54, marginHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconButton: { width: 44, height: 44, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'IBMPlexSansArabic_600SemiBold', fontSize: 16 },
  fieldLabel: { fontFamily: 'IBMPlexSansArabic_500Medium', fontSize: 13, textAlign: 'right' },
  photoCard: { height: 210, justifyContent: 'center', alignItems: 'center' },
  photoPlaceholder: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' },
  photoActions: { flexDirection: rtlRowDirection, gap: 9, marginTop: -7 },
  chipWrap: { flexDirection: rtlRowDirection, flexWrap: 'wrap', gap: 8 },
});
