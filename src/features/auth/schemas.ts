import { z } from "zod";

export const signInSchema = z.object({
  email: z.email("email").trim().toLowerCase(),
  password: z.string().min(1, "required").max(128, "invalid"),
  next: z.string().optional(),
});

const newPasswordFields = {
  password: z.string().min(8, "passwordMin").max(128, "invalid"),
  confirmPassword: z.string().min(1, "required"),
};

const passwordsMatch = {
  check: (v: { password: string; confirmPassword: string }) => v.password === v.confirmPassword,
  params: { path: ["confirmPassword"], message: "passwordMismatch" },
};

export const signUpSchema = z
  .object({
    name: z.string().trim().min(2, "nameMin").max(80, "invalid"),
    email: z.email("email").trim().toLowerCase(),
    ...newPasswordFields,
    next: z.string().optional(),
  })
  .refine(passwordsMatch.check, passwordsMatch.params);

export const forgotPasswordSchema = z.object({
  email: z.email("email").trim().toLowerCase(),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "required").max(200, "invalid"),
    ...newPasswordFields,
  })
  .refine(passwordsMatch.check, passwordsMatch.params);
