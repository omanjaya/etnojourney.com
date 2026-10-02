import type { routing } from "@/i18n/routing";
import type common from "../messages/id/common.json";
import type errors from "../messages/id/errors.json";
import type home from "../messages/id/home.json";
import type tours from "../messages/id/tours.json";
import type destinations from "../messages/id/destinations.json";
import type auth from "../messages/id/auth.json";
import type booking from "../messages/id/booking.json";
import type account from "../messages/id/account.json";
import type admin from "../messages/id/admin.json";
import type payment from "../messages/id/payment.json";
import type reviews from "../messages/id/reviews.json";
import type media from "../messages/id/media.json";
import type emails from "../messages/id/emails.json";
import type pages from "../messages/id/pages.json";
import type adminBooking from "../messages/id/adminBooking.json";
import type adminPayments from "../messages/id/adminPayments.json";
import type adminAvailability from "../messages/id/adminAvailability.json";
import type adminUsers from "../messages/id/adminUsers.json";
import type adminInsights from "../messages/id/adminInsights.json";
import type selfService from "../messages/id/selfService.json";
import type trip from "../messages/id/trip.json";
import type community from "../messages/id/community.json";

declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: {
      common: typeof common;
      errors: typeof errors;
      home: typeof home;
      tours: typeof tours;
      destinations: typeof destinations;
      auth: typeof auth;
      booking: typeof booking;
      account: typeof account;
      admin: typeof admin;
      payment: typeof payment;
      reviews: typeof reviews;
      media: typeof media;
      emails: typeof emails;
      pages: typeof pages;
      adminBooking: typeof adminBooking;
      adminPayments: typeof adminPayments;
      adminAvailability: typeof adminAvailability;
      adminUsers: typeof adminUsers;
      adminInsights: typeof adminInsights;
      selfService: typeof selfService;
      trip: typeof trip;
      community: typeof community;
    };
  }
}
