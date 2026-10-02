ALTER TYPE "public"."payment_status" ADD VALUE 'refunded';--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'staff' BEFORE 'admin';--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_id" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"booking_id" integer NOT NULL,
	"author_id" text,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "booking_notes_body_length" CHECK (char_length("booking_notes"."body") between 1 and 2000)
);
--> statement-breakpoint
CREATE TABLE "tour_closures" (
	"id" serial PRIMARY KEY NOT NULL,
	"tour_id" integer,
	"date" date NOT NULL,
	"reason" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tour_closures_reason_length" CHECK ("tour_closures"."reason" is null or char_length("tour_closures"."reason") <= 200)
);
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "refund_required" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "refunded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "refunded_by" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "refund_note" text;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "reply" text;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "replied_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "replied_by" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "disabled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_notes" ADD CONSTRAINT "booking_notes_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_notes" ADD CONSTRAINT "booking_notes_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour_closures" ADD CONSTRAINT "tour_closures_tour_id_tours_id_fk" FOREIGN KEY ("tour_id") REFERENCES "public"."tours"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour_closures" ADD CONSTRAINT "tour_closures_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_created_idx" ON "audit_logs" USING btree ("created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_idx" ON "audit_logs" USING btree ("actor_id","created_at");--> statement-breakpoint
CREATE INDEX "booking_notes_booking_idx" ON "booking_notes" USING btree ("booking_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "tour_closures_tour_date_uq" ON "tour_closures" USING btree ("tour_id","date") WHERE "tour_closures"."tour_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "tour_closures_all_date_uq" ON "tour_closures" USING btree ("date") WHERE "tour_closures"."tour_id" is null;--> statement-breakpoint
CREATE INDEX "tour_closures_date_idx" ON "tour_closures" USING btree ("date");--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_refunded_by_user_id_fk" FOREIGN KEY ("refunded_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_replied_by_user_id_fk" FOREIGN KEY ("replied_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payments_refund_required_idx" ON "payments" USING btree ("refund_required") WHERE "payments"."refund_required";--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reply_length" CHECK ("reviews"."reply" is null or char_length("reviews"."reply") <= 2000);