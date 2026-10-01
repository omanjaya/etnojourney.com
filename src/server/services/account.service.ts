import "server-only";
import type { Locale } from "@/i18n/routing";
import { accountRepository } from "@/server/repositories/account.repository";
import { DomainError } from "./errors";

export const accountService = {
  async profile(userId: string) {
    const profile = await accountRepository.findProfile(userId);
    if (!profile) throw new DomainError("notFound");
    return profile;
  },

  async updateProfile(userId: string, values: { name: string; locale: Locale }) {
    const updated = await accountRepository.updateProfile(userId, values);
    if (!updated) throw new DomainError("notFound");
  },

  /** Throws `notFound` for unknown codes and for bookings owned by someone else. */
  async bookingDetail(userId: string, code: string) {
    const booking = await accountRepository.findBookingForUser(userId, code);
    if (!booking) throw new DomainError("notFound");
    return booking;
  },
};
