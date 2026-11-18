# Wetriva

Wetriva helps friends and communities lend and borrow personal belongings with clear requests, handover tracking, and return dates. The app is built with Expo Router and Arabic RTL screens; Supabase stores accounts, items, connections, loans, and item photos.

## Set up Supabase

1. Create a Supabase project.
2. In the project settings, copy the **Project URL** and the **publishable/anon key**.
3. Add these two values in Replit Secrets:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
4. Never put a Supabase `service_role` key in the app or in an `EXPO_PUBLIC_` variable. Wetriva uses only the public anon key from the mobile app.
5. Open **SQL Editor**, paste the contents of `supabase/schema.sql`, and run it. The script creates the tables, profile trigger, RLS policies, photo bucket, loan transition functions, daily overdue job, and Realtime publication.
6. In **Authentication → Providers**, enable Email. If email confirmation is enabled, users need to confirm their address before logging in.
7. Optional demo content: create two accounts in Wetriva, replace the two example email addresses in `supabase/seed.sql` with those accounts, then run that file in the SQL Editor.

### Push notifications

The app asks for notification permission only when a user chooses **تشغيل الإشعارات** in their profile. It stores that user's Expo push token in their own profile row. The Supabase Edge Function in `supabase/functions/notify-loan` verifies the caller and loan before sending a push notification to the owner. Its service-role key is read only inside the Edge Function and is never included in the mobile app or EAS client variables.

Deploy `notify-loan` from the Supabase Dashboard's Edge Functions area or with the Supabase CLI. Supabase supplies the function's project URL, anon key, and service-role key as server-side environment variables. Remote push delivery requires a compatible installed app build and an EAS project ID. Expo Go can be used to test screens, auth, data, and local device permissions; remote push delivery may require a development or store build.

## Run on a device

1. Install or open Expo Go on an iOS or Android device.
2. Start the **Wetriva** mobile workflow in Replit.
3. Scan the QR code shown for the running app. On the first native launch, Wetriva enables RTL and reloads once.
4. Sign up with an email and password. Add a friend by their email, accept the connection from the other account, then add or request an item.

If the Supabase values are missing, the app shows an Arabic setup message instead of attempting an unauthenticated connection.

## EAS Build preparation

`eas.json` includes internal preview and production profiles. Before building for distribution:

1. Create/link the Wetriva project in your Expo account and copy its EAS project ID into `expo.extra.eas.projectId` in `app.json`.
2. Confirm the starter identifier `com.wetriva.app` is available in both stores; change it in `app.json` if it is already in use.
3. Add `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` as public build environment variables in EAS.
4. Configure the iOS and Android signing credentials and push-notification credentials for the linked EAS project.
5. Select the preview or production profile in EAS Build. Android and iOS builds are configured separately by EAS based on the app's platform configuration.

This project intentionally contains no generated native `ios/` or `android/` folders, so Expo Go and cloud builds use the same app code.
