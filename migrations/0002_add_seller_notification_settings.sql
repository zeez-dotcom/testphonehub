ALTER TABLE sellers ADD COLUMN email_notifications boolean DEFAULT true NOT NULL;
ALTER TABLE sellers ADD COLUMN sms_notifications boolean DEFAULT true NOT NULL;
ALTER TABLE sellers ADD COLUMN low_stock_alerts boolean DEFAULT true NOT NULL;
