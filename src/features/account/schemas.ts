import { z } from "zod";
import { routing } from "@/i18n/routing";

export const profileSchema = z.object({
  name: z.string().trim().min(2, "nameMin").max(80, "invalid"),
  locale: z.enum(routing.locales, "invalid"),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "required").max(128, "invalid"),
    newPassword: z.string().min(8, "passwordMin").max(128, "invalid"),
    confirmPassword: z.string().min(1, "required"),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "passwordMismatch",
  });
