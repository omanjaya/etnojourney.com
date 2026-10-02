ALTER TYPE "public"."user_role" ADD VALUE 'partner' BEFORE 'staff';--> statement-breakpoint
CREATE TABLE "departure_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"tour_id" integer NOT NULL,
	"date" date NOT NULL,
	"guide_id" integer,
	"note" text,
	"assigned_by" text,
	"notified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "departure_assignments_note_length" CHECK ("departure_assignments"."note" is null or char_length("departure_assignments"."note") <= 1000)
);
--> statement-breakpoint
CREATE TABLE "guide_destinations" (
	"guide_id" integer NOT NULL,
	"destination_id" integer NOT NULL,
	CONSTRAINT "guide_destinations_guide_id_destination_id_pk" PRIMARY KEY("guide_id","destination_id")
);
--> statement-breakpoint
CREATE TABLE "guides" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"organization" text,
	"phone" text,
	"email" text,
	"languages" text[] DEFAULT '{}'::text[] NOT NULL,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guides_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "guides_name_length" CHECK (char_length("guides"."name") between 2 and 120),
	CONSTRAINT "guides_notes_length" CHECK ("guides"."notes" is null or char_length("guides"."notes") <= 2000)
);
--> statement-breakpoint
ALTER TABLE "departure_assignments" ADD CONSTRAINT "departure_assignments_tour_id_tours_id_fk" FOREIGN KEY ("tour_id") REFERENCES "public"."tours"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departure_assignments" ADD CONSTRAINT "departure_assignments_guide_id_guides_id_fk" FOREIGN KEY ("guide_id") REFERENCES "public"."guides"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departure_assignments" ADD CONSTRAINT "departure_assignments_assigned_by_user_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_destinations" ADD CONSTRAINT "guide_destinations_guide_id_guides_id_fk" FOREIGN KEY ("guide_id") REFERENCES "public"."guides"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_destinations" ADD CONSTRAINT "guide_destinations_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guides" ADD CONSTRAINT "guides_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "departure_assignments_tour_date_uq" ON "departure_assignments" USING btree ("tour_id","date");--> statement-breakpoint
CREATE INDEX "departure_assignments_guide_date_idx" ON "departure_assignments" USING btree ("guide_id","date");--> statement-breakpoint
CREATE INDEX "departure_assignments_date_idx" ON "departure_assignments" USING btree ("date");--> statement-breakpoint
CREATE INDEX "guide_destinations_destination_idx" ON "guide_destinations" USING btree ("destination_id");