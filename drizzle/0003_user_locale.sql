ALTER TABLE "user" ADD COLUMN "locale" text DEFAULT 'id' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_locale_valid" CHECK ("user"."locale" in ('id', 'en'));