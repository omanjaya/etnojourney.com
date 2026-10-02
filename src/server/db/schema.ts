import { relations } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { LocalizedText } from "@/lib/i18n-text";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/* ---------------------------------------------------------------- */
/* Auth (Better Auth)                                                */
/* ---------------------------------------------------------------- */

/**
 * `admin` is the owner (everything, incl. users, refunds, reports, activity
 * log); `staff` runs day-to-day operations. See src/server/auth/permissions.ts.
 */
export const userRole = pgEnum("user_role", ["user", "staff", "admin"]);

export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    role: userRole("role").notNull().default("user"),
    /** Preferred language for transactional emails. */
    locale: text("locale").notNull().default("id"),
    /** Set by an admin to block sign-in and end all sessions. */
    disabledAt: timestamp("disabled_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    check("user_locale_valid", sql`${t.locale} in ('id', 'en')`),
    // Defense in depth: forms cap names at 80; reject anything absurd at the DB.
    check("user_name_length", sql`char_length(${t.name}) between 1 and 120`),
    check("user_image_length", sql`${t.image} is null or char_length(${t.image}) <= 2048`),
  ],
);

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (t) => [index("session_user_id_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    ...timestamps,
  },
  (t) => [index("account_user_id_idx").on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  // Better Auth looks up reset/verification tokens by identifier.
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

/* ---------------------------------------------------------------- */
/* Catalog                                                           */
/* ---------------------------------------------------------------- */

export const tourDifficulty = pgEnum("tour_difficulty", ["easy", "moderate", "challenging"]);

export const tourCategory = pgEnum("tour_category", [
  "ritual",
  "craft",
  "culinary",
  "village",
  "trekking",
]);

export const destinations = pgTable("destinations", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  province: text("province").notNull(),
  tagline: jsonb("tagline").$type<LocalizedText>().notNull(),
  description: jsonb("description").$type<LocalizedText>().notNull(),
  heroImage: text("hero_image").notNull(),
  /** How travellers usually reach the destination (airport, harbour, road). */
  gettingThere: jsonb("getting_there").$type<LocalizedText>(),
  ...timestamps,
});

export const tours = pgTable(
  "tours",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    destinationId: integer("destination_id")
      .notNull()
      .references(() => destinations.id, { onDelete: "restrict" }),
    title: jsonb("title").$type<LocalizedText>().notNull(),
    summary: jsonb("summary").$type<LocalizedText>().notNull(),
    description: jsonb("description").$type<LocalizedText>().notNull(),
    category: tourCategory("category").notNull(),
    durationDays: integer("duration_days").notNull(),
    pricePerPerson: integer("price_per_person").notNull(),
    maxParticipants: integer("max_participants").notNull(),
    rating: numeric("rating", { precision: 2, scale: 1, mode: "number" }).notNull().default(0),
    reviewCount: integer("review_count").notNull().default(0),
    coverImage: text("cover_image").notNull(),
    gallery: text("gallery")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    highlights: jsonb("highlights").$type<LocalizedText[]>().notNull().default([]),
    included: jsonb("included").$type<LocalizedText[]>().notNull().default([]),
    meetingPoint: text("meeting_point").notNull(),
    difficulty: tourDifficulty("difficulty").notNull().default("easy"),
    /** Practical "before you go" info, shown next to the itinerary. */
    notIncluded: jsonb("not_included").$type<LocalizedText[]>().notNull().default([]),
    whatToBring: jsonb("what_to_bring").$type<LocalizedText[]>().notNull().default([]),
    etiquette: jsonb("etiquette").$type<LocalizedText[]>().notNull().default([]),
    isPublished: boolean("is_published").notNull().default(true),
    isFeatured: boolean("is_featured").notNull().default(false),
    ...timestamps,
  },
  (t) => [
    index("tours_destination_idx").on(t.destinationId),
    index("tours_category_idx").on(t.category),
    check("tours_price_positive", sql`${t.pricePerPerson} > 0`),
    check("tours_duration_positive", sql`${t.durationDays} > 0`),
    check("tours_capacity_positive", sql`${t.maxParticipants} > 0`),
  ],
);

export const itineraryDays = pgTable(
  "itinerary_days",
  {
    id: serial("id").primaryKey(),
    tourId: integer("tour_id")
      .notNull()
      .references(() => tours.id, { onDelete: "cascade" }),
    day: integer("day").notNull(),
    title: jsonb("title").$type<LocalizedText>().notNull(),
    description: jsonb("description").$type<LocalizedText>().notNull(),
  },
  (t) => [uniqueIndex("itinerary_tour_day_uq").on(t.tourId, t.day)],
);

export const reviews = pgTable(
  "reviews",
  {
    id: serial("id").primaryKey(),
    tourId: integer("tour_id")
      .notNull()
      .references(() => tours.id, { onDelete: "cascade" }),
    /** Null for curated/imported reviews; set for reviews written by travellers. */
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    /** One review per completed booking. */
    bookingId: integer("booking_id")
      .unique()
      .references(() => bookings.id, { onDelete: "set null" }),
    authorName: text("author_name").notNull(),
    country: text("country").notNull(),
    rating: integer("rating").notNull(),
    /** Traveller reviews store the same text under both locales. */
    body: jsonb("body").$type<LocalizedText>().notNull(),
    /** Locale the review was originally written in. */
    language: text("language").notNull().default("id"),
    isPublished: boolean("is_published").notNull().default(true),
    /** Public reply from the team, shown under the review. */
    reply: text("reply"),
    repliedAt: timestamp("replied_at", { withTimezone: true }),
    repliedBy: text("replied_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("reviews_tour_idx").on(t.tourId),
    check("reviews_reply_length", sql`${t.reply} is null or char_length(${t.reply}) <= 2000`),
    index("reviews_user_idx").on(t.userId),
    check("reviews_rating_range", sql`${t.rating} between 1 and 5`),
  ],
);

/* ---------------------------------------------------------------- */
/* Commerce                                                          */
/* ---------------------------------------------------------------- */

export const bookingStatus = pgEnum("booking_status", [
  "pending",
  "confirmed",
  "cancelled",
  "completed",
]);

export const bookings = pgTable(
  "bookings",
  {
    id: serial("id").primaryKey(),
    code: text("code").notNull().unique(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    tourId: integer("tour_id")
      .notNull()
      .references(() => tours.id, { onDelete: "restrict" }),
    travelDate: date("travel_date", { mode: "string" }).notNull(),
    participants: integer("participants").notNull(),
    unitPrice: integer("unit_price").notNull(),
    totalPrice: integer("total_price").notNull(),
    status: bookingStatus("status").notNull().default("pending"),
    contactName: text("contact_name").notNull(),
    contactPhone: text("contact_phone").notNull(),
    notes: text("notes"),
    /** Times the traveller moved the date themselves (capped by the policy). */
    rescheduleCount: integer("reschedule_count").notNull().default(0),
    /** Idempotency for scheduled emails (pre-trip reminder, post-trip review request). */
    reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
    reviewRequestSentAt: timestamp("review_request_sent_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("bookings_user_idx").on(t.userId),
    index("bookings_tour_date_idx").on(t.tourId, t.travelDate),
    // Admin list default order (newest first) without a full sort. NULLS FIRST
    // matches plain `ORDER BY ... DESC`; otherwise Postgres cannot use the index.
    index("bookings_created_idx").on(t.createdAt.desc().nullsFirst(), t.id.desc().nullsFirst()),
    check("bookings_participants_positive", sql`${t.participants} > 0`),
  ],
);

export const paymentStatus = pgEnum("payment_status", [
  "pending",
  "paid",
  "failed",
  "expired",
  "refunded",
]);

export const payments = pgTable(
  "payments",
  {
    id: serial("id").primaryKey(),
    bookingId: integer("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    /** `midtrans` in production; `mock` only in development. */
    provider: text("provider").notNull(),
    /** Unique order id sent to the gateway, e.g. `EJ-7K2Q9A-1712345678`. */
    orderId: text("order_id").notNull().unique(),
    amount: integer("amount").notNull(),
    status: paymentStatus("status").notNull().default("pending"),
    redirectUrl: text("redirect_url"),
    /** Payment method reported by the gateway (bank_transfer, qris, ...). */
    method: text("method"),
    /** Last raw notification payload, kept for audit. */
    rawNotification: jsonb("raw_notification").$type<Record<string, unknown>>(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    /**
     * Money was taken but must go back (booking cancelled after payment, or a
     * duplicate charge). Cleared when an admin records the refund.
     */
    refundRequired: boolean("refund_required").notNull().default(false),
    refundedAt: timestamp("refunded_at", { withTimezone: true }),
    refundedBy: text("refunded_by").references(() => user.id, { onDelete: "set null" }),
    /** Bank reference or reason recorded with the refund. */
    refundNote: text("refund_note"),
    /** Amount owed back when it is less than the full payment (policy tiers); null = full amount. */
    refundAmount: integer("refund_amount"),
    ...timestamps,
  },
  (t) => [
    index("payments_booking_idx").on(t.bookingId),
    index("payments_refund_required_idx").on(t.refundRequired).where(sql`${t.refundRequired}`),
    check("payments_amount_positive", sql`${t.amount} > 0`),
  ],
);

/* ---------------------------------------------------------------- */
/* Operations                                                        */
/* ---------------------------------------------------------------- */

/** Internal notes on a booking, visible to staff only. */
export const bookingNotes = pgTable(
  "booking_notes",
  {
    id: serial("id").primaryKey(),
    bookingId: integer("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    authorId: text("author_id").references(() => user.id, { onDelete: "set null" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("booking_notes_booking_idx").on(t.bookingId, t.createdAt),
    check("booking_notes_body_length", sql`char_length(${t.body}) between 1 and 2000`),
  ],
);

/**
 * Dates on which a tour (or, with a null tour, every tour) takes no bookings:
 * ceremonies, weather, guide leave. Respected by the availability rules.
 */
export const tourClosures = pgTable(
  "tour_closures",
  {
    id: serial("id").primaryKey(),
    tourId: integer("tour_id").references(() => tours.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    reason: text("reason"),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("tour_closures_tour_date_uq").on(t.tourId, t.date).where(sql`${t.tourId} is not null`),
    uniqueIndex("tour_closures_all_date_uq").on(t.date).where(sql`${t.tourId} is null`),
    index("tour_closures_date_idx").on(t.date),
    check("tour_closures_reason_length", sql`${t.reason} is null or char_length(${t.reason}) <= 200`),
  ],
);

/** Photos travellers attach to their review (re-encoded uploads, moderated). */
export const reviewPhotos = pgTable(
  "review_photos",
  {
    id: serial("id").primaryKey(),
    reviewId: integer("review_id")
      .notNull()
      .references(() => reviews.id, { onDelete: "cascade" }),
    /** Public path under /media/, as produced by the storage layer. */
    path: text("path").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    position: integer("position").notNull().default(0),
    isHidden: boolean("is_hidden").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("review_photos_review_idx").on(t.reviewId, t.position),
    check("review_photos_path_media", sql`${t.path} like '/media/%'`),
  ],
);

/** Who changed what in the back office, and when. Append-only. */
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    /** Null for system actions (payment webhooks). */
    actorId: text("actor_id").references(() => user.id, { onDelete: "set null" }),
    /** Dotted verb, e.g. `booking.status_changed`; see AuditAction. */
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    /** Small structured details (old/new values), never secrets. */
    details: jsonb("details").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("audit_logs_created_idx").on(t.createdAt.desc(), t.id.desc()),
    index("audit_logs_entity_idx").on(t.entityType, t.entityId, t.createdAt),
    index("audit_logs_actor_idx").on(t.actorId, t.createdAt),
  ],
);

/* ---------------------------------------------------------------- */
/* Media                                                             */
/* ---------------------------------------------------------------- */

/**
 * Attribution for curated content photos (public/images/content), required by
 * CC BY / BY-SA licenses and shown next to the images. Seeded from content/photos.
 */
export const photoCredits = pgTable("photo_credits", {
  path: text("path").primaryKey(),
  title: text("title").notNull(),
  author: text("author").notNull(),
  license: text("license").notNull(),
  licenseUrl: text("license_url"),
  sourceUrl: text("source_url").notNull(),
  source: text("source").notNull(),
});

export const wishlists = pgTable(
  "wishlists",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    tourId: integer("tour_id")
      .notNull()
      .references(() => tours.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.tourId] }),
    // The PK leads with user_id; cascades and lookups by tour need their own index.
    index("wishlists_tour_idx").on(t.tourId),
  ],
);

/* ---------------------------------------------------------------- */
/* Relations                                                         */
/* ---------------------------------------------------------------- */

export const destinationsRelations = relations(destinations, ({ many }) => ({
  tours: many(tours),
}));

export const toursRelations = relations(tours, ({ one, many }) => ({
  destination: one(destinations, {
    fields: [tours.destinationId],
    references: [destinations.id],
  }),
  itinerary: many(itineraryDays),
  reviews: many(reviews),
  bookings: many(bookings),
}));

export const itineraryDaysRelations = relations(itineraryDays, ({ one }) => ({
  tour: one(tours, { fields: [itineraryDays.tourId], references: [tours.id] }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  tour: one(tours, { fields: [reviews.tourId], references: [tours.id] }),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  tour: one(tours, { fields: [bookings.tourId], references: [tours.id] }),
  user: one(user, { fields: [bookings.userId], references: [user.id] }),
  payments: many(payments),
  review: one(reviews, { fields: [bookings.id], references: [reviews.bookingId] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  booking: one(bookings, { fields: [payments.bookingId], references: [bookings.id] }),
}));

export const wishlistsRelations = relations(wishlists, ({ one }) => ({
  tour: one(tours, { fields: [wishlists.tourId], references: [tours.id] }),
}));

export type Destination = typeof destinations.$inferSelect;
export type Tour = typeof tours.$inferSelect;
export type NewTour = typeof tours.$inferInsert;
export type ItineraryDay = typeof itineraryDays.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type PhotoCredit = typeof photoCredits.$inferSelect;
export type PaymentStatus = (typeof paymentStatus.enumValues)[number];
export type BookingStatus = (typeof bookingStatus.enumValues)[number];
export type TourCategory = (typeof tourCategory.enumValues)[number];
export type TourDifficulty = (typeof tourDifficulty.enumValues)[number];
export type UserRole = (typeof userRole.enumValues)[number];
export type BookingNote = typeof bookingNotes.$inferSelect;
export type TourClosure = typeof tourClosures.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type ReviewPhoto = typeof reviewPhotos.$inferSelect;
export type User = typeof user.$inferSelect;
