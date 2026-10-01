CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "wishlists_tour_idx" ON "wishlists" USING btree ("tour_id");