-- Folders were renamed to a zero-padded sequence in the order production
-- applied them, so a fresh database replays them in that order too.
DO $$
BEGIN
  IF to_regclass('_prisma_migrations') IS NULL THEN
    RETURN;
  END IF;
  UPDATE _prisma_migrations AS applied
  SET migration_name = renamed.new_name
  FROM (VALUES
    ('0_init', '000_init'),
    ('1_add_recurring_tasks', '001_add_recurring_tasks'),
    ('2_task_privacy', '002_task_privacy'),
    ('3_email_verifications', '003_email_verifications'),
    ('4_notifications', '004_notifications'),
    ('5_api_keys', '005_api_keys'),
    ('6_carry_over', '006_carry_over'),
    ('7_user_timezone', '007_user_timezone'),
    ('8_task_recurring_unique', '008_task_recurring_unique'),
    ('9_user_avatar', '009_user_avatar'),
    ('10_scheduled_jobs', '010_scheduled_jobs'),
    ('11_subscriptions', '011_subscriptions'),
    ('12_usage_events', '012_usage_events'),
    ('13_calendar_events', '013_calendar_events'),
    ('14_calendar_sync', '014_calendar_sync'),
    ('15_channel_identities', '015_channel_identities'),
    ('10_checkout_intents', '016_checkout_intents'),
    ('16_list_pagination_indexes', '017_list_pagination_indexes'),
    ('10_subtasks', '018_subtasks'),
    ('17_channel_identity_target', '019_channel_identity_target'),
    ('18_multi_calendar', '020_multi_calendar'),
    ('19_subscription_cancel', '021_subscription_cancel'),
    ('20_reminder_channels', '022_reminder_channels'),
    ('10_billing_customers', '023_billing_customers'),
    ('21_calendar_occurrence_exceptions', '024_calendar_occurrence_exceptions'),
    ('10_user_weather_location', '025_user_weather_location'),
    ('22_assistant_profile', '026_assistant_profile'),
    ('23_habits', '027_habits'),
    ('24_nudge_log', '028_nudge_log'),
    ('25_calendar_credentials', '029_calendar_credentials'),
    ('26_weather_location_to_home', '030_weather_location_to_home'),
    ('27_push_devices', '031_push_devices')
  ) AS renamed(old_name, new_name)
  WHERE applied.migration_name = renamed.old_name;
END
$$;
