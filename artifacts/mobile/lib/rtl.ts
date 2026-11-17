import { I18nManager, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { reloadAppAsync } from 'expo';

const RELOAD_KEY = 'wetriva.rtlReloadRequested';

export const rtlRowDirection: 'row' | 'row-reverse' =
  Platform.OS !== 'web' && I18nManager.isRTL ? 'row' : 'row-reverse';

export async function prepareArabicLayout(): Promise<void> {
  I18nManager.allowRTL(true);
  if (Platform.OS === 'web' || I18nManager.isRTL) return;

  const requested = await AsyncStorage.getItem(RELOAD_KEY);
  I18nManager.forceRTL(true);
  if (requested !== '1') {
    await AsyncStorage.setItem(RELOAD_KEY, '1');
    try {
      await reloadAppAsync();
    } catch {
      // Direction styles still keep the first session readable if a reload is unavailable.
    }
  }
}
