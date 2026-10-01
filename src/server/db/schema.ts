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

export const userRole = pgEnum("user_role", ["user", "admin"]);

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
    ...timestamps,
  },
  (t) => [check("user_locale_valid", sql`${t.locale} in ('id', 'en')`)],
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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("reviews_tour_idx").on(t.tourId),
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
    ...timestamps,
  },
  (t) => [
    index("bookings_user_idx").on(t.userId),
    index("bookings_tour_date_idx").on(t.tourId, t.travelDate),
    check("bookings_participants_positive", sql`${t.participants} > 0`),
  ],
);

export const paymentStatus = pgEnum("payment_status", ["pending", "paid", "failed", "expired"]);

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
    ...timestamps,
  },
  (t) => [
    index("payments_booking_idx").on(t.bookingId),
    check("payments_amount_positive", sql`${t.amount} > 0`),
  ],
);

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
export type PaymentStatus = (typeof paymentStatus.enumValues)[number];
export type BookingStatus = (typeof bookingStatus.enumValues)[number];
export type TourCategory = (typeof tourCategory.enumValues)[number];
export type UserRole = (typeof userRole.enumValues)[number];
