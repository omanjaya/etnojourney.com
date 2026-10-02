CREATE TYPE "public"."tour_difficulty" AS ENUM('easy', 'moderate', 'challenging');--> statement-breakpoint
ALTER TABLE "destinations" ADD COLUMN "getting_there" jsonb;--> statement-breakpoint
ALTER TABLE "tours" ADD COLUMN "difficulty" "tour_difficulty" DEFAULT 'easy' NOT NULL;--> statement-breakpoint
ALTER TABLE "tours" ADD COLUMN "not_included" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "tours" ADD COLUMN "what_to_bring" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "tours" ADD COLUMN "etiquette" jsonb DEFAULT '[]'::jsonb NOT NULL;