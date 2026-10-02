import "server-only";
import { getEnv } from "@/server/env";

export type MailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export interface Mailer {
  send(message: MailMessage): Promise<void>;
}

/** Sends through the Resend HTTP API. */
class ResendMailer implements Mailer {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async send(message: MailMessage) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: this.from, ...message }),
    });
    if (!response.ok) {
      throw new Error(`Resend responded ${response.status}: ${await response.text()}`);
    }
  }
}

/** Development fallback: prints the whole email (including links) to the server log. */
class ConsoleMailer implements Mailer {
  async send(message: MailMessage) {
    console.info(
      `\n[mail] to=${message.to}\n[mail] subject=${message.subject}\n${message.text}\n[mail] end\n`,
    );
  }
}

/**
 * Production fallback when no provider is configured. Bodies are never logged:
 * they can contain password-reset links, and logs are readable by more people
 * than the mailbox owner.
 */
class DroppingMailer implements Mailer {
  async send(message: MailMessage) {
    console.warn(
      `[mail] not sent (no provider configured): to=${message.to} subject=${message.subject}`,
    );
  }
}

function createMailer(): Mailer {
  const env = getEnv();
  if (env.RESEND_API_KEY)
    return new ResendMailer(
      env.RESEND_API_KEY,
      env.MAIL_FROM ?? "EtnoJourney <noreply@etnojourney.id>",
    );
  if (env.NODE_ENV === "production") {
    console.warn("[mail] RESEND_API_KEY is not set; emails will not be delivered.");
    return new DroppingMailer();
  }
  return new ConsoleMailer();
}

/**
 * Created on first use, not at import: reading the validated env at import time
 * would run during `next build`, where production-only variables are absent.
 */
let instance: Mailer | undefined;

export const mailer: Mailer = {
  send(message) {
    instance ??= createMailer();
    return instance.send(message);
  },
};
