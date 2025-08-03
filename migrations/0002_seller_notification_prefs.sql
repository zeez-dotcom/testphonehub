-- 0002_seller_notification_prefs.sql
ALTER TABLE sellers
  ADD COLUMN email_notifications BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN sms_notifications BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN low_stock_alerts BOOLEAN NOT NULL DEFAULT true;
