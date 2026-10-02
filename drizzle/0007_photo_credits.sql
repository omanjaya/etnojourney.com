CREATE TABLE "photo_credits" (
	"path" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"author" text NOT NULL,
	"license" text NOT NULL,
	"license_url" text,
	"source_url" text NOT NULL,
	"source" text NOT NULL
);
