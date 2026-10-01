DROP INDEX "bookings_created_idx";--> statement-breakpoint
CREATE INDEX "bookings_created_idx" ON "bookings" USING btree ("created_at" DESC NULLS FIRST,"id" DESC NULLS FIRST);