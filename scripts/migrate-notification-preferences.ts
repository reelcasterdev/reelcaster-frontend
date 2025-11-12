/**
 * Migration script to populate notification_preferences table from existing user metadata
 *
 * This script reads user preferences from auth.users.raw_user_meta_data.preferences
 * and creates corresponding records in the notification_preferences table.
 *
 * Run with: npx tsx scripts/migrate-notification-preferences.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface UserMetadata {
  preferences?: {
    favoriteLocation?: string;
    favoriteHotspot?: string;
    favoriteSpecies?: string;
    favoriteLat?: number;
    favoriteLon?: number;
    notificationsEnabled?: boolean;
    emailForecasts?: boolean;
    notificationTime?: string;
    timezone?: string;
  };
}

async function migrateNotificationPreferences() {
  console.log('🚀 Starting notification preferences migration...\n');

  try {
    // Fetch all users using admin API
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    console.log(`📊 Found ${users.length} users to migrate\n`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const user of users) {
      const userId = user.id;
      const email = user.email || 'unknown';
      const metadata = user.user_metadata as UserMetadata;
      const prefs = metadata?.preferences || {};

      console.log(`Processing user: ${email}`);

      // Check if preference already exists
      const { data: existing, error: checkError } = await supabase
        .from('notification_preferences')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (checkError) {
        console.error(`  ❌ Error checking existing preferences: ${checkError.message}`);
        errorCount++;
        continue;
      }

      if (existing) {
        console.log(`  ⏭️  Preferences already exist, skipping`);
        skippedCount++;
        continue;
      }

      // Map old preferences to new schema
      const notificationPrefs = {
        user_id: userId,
        notification_enabled: prefs.notificationsEnabled || false,
        email_enabled: prefs.emailForecasts || true,
        notification_time: prefs.notificationTime || '06:00:00',
        timezone: prefs.timezone || 'America/Vancouver',
        location_lat: prefs.favoriteLat || null,
        location_lng: prefs.favoriteLon || null,
        location_name: prefs.favoriteLocation || null,
        // Convert single species to array
        favorite_species: prefs.favoriteSpecies ? [prefs.favoriteSpecies] : [],
        // Set default thresholds
        wind_speed_threshold_kph: 30.0,
        wave_height_threshold_m: 1.5,
        precipitation_threshold_mm: 5.0,
        temperature_min_c: 5.0,
        temperature_max_c: 25.0,
        fishing_score_threshold: 60,
        uv_index_threshold: 6,
        alert_on_thunderstorm: true,
        alert_on_gale_warning: true,
        alert_on_pressure_drop: true,
        include_regulation_changes: true,
      };

      // Insert notification preferences
      const { error: insertError } = await supabase
        .from('notification_preferences')
        .insert(notificationPrefs);

      if (insertError) {
        console.error(`  ❌ Error inserting preferences: ${insertError.message}`);
        errorCount++;
        continue;
      }

      console.log(`  ✅ Successfully migrated preferences`);
      migratedCount++;
    }

    // Print summary
    console.log('\n' + '='.repeat(50));
    console.log('📈 Migration Summary:');
    console.log('='.repeat(50));
    console.log(`✅ Migrated:  ${migratedCount} users`);
    console.log(`⏭️  Skipped:   ${skippedCount} users (already migrated)`);
    console.log(`❌ Errors:    ${errorCount} users`);
    console.log('='.repeat(50));

    if (errorCount > 0) {
      console.log('\n⚠️  Some users failed to migrate. Please check errors above.');
      process.exit(1);
    } else {
      console.log('\n🎉 Migration completed successfully!');
      process.exit(0);
    }
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateNotificationPreferences();
