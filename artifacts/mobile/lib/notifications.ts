import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { getSupabase } from '@/lib/supabase';
import { t } from '@/lib/i18n';

export async function enableLoanNotifications(userId: string): Promise<void> {
  if (!Device.isDevice || Platform.OS === 'web') {
    throw new Error('PUSH_NOT_AVAILABLE');
  }

  const existing = await Notifications.getPermissionsAsync();
  const permission =
    existing.granted || existing.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
      ? existing
      : await Notifications.requestPermissionsAsync();
  if (!permission.granted && permission.ios?.status !== Notifications.IosAuthorizationStatus.PROVISIONAL) {
    throw new Error('PUSH_PERMISSION_DENIED');
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: t.notifications.channelName,
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;
  const token = projectId
    ? await Notifications.getExpoPushTokenAsync({ projectId })
    : await Notifications.getExpoPushTokenAsync();

  const { error } = await getSupabase()
    .from('profiles')
    .update({ push_token: token.data })
    .eq('id', userId);
  if (error) throw error;
}

export async function disableLoanNotifications(userId: string): Promise<void> {
  const { error } = await getSupabase()
    .from('profiles')
    .update({ push_token: null })
    .eq('id', userId);
  if (error) throw error;
}
