ALTER TABLE "orders" ALTER COLUMN "customer_id" DROP NOT NULL;
ALTER TABLE "user_settings" ALTER COLUMN "marketing_enabled" SET DEFAULT false;
ALTER TABLE "user_settings" ADD COLUMN "marketing_consent_at" TIMESTAMP(3);
