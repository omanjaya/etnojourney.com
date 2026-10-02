import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import enEmails from "../../../../messages/en/emails.json";
import idEmails from "../../../../messages/id/emails.json";
import type { EmailTranslator } from "./index";
import { departureManifestEmail, type ManifestEmailData } from "./departure";

const translator = (locale: "id" | "en"): EmailTranslator => {
  const t = createTranslator({
    locale,
    messages: { emails: locale === "en" ? enEmails : idEmails },
    namespace: "emails",
  });
  return (key, values) => t(key as never, values as never);
};

const data: ManifestEmailData = {
  guideName: "Made Sukarta",
  tourTitle: "Fajar di Penglipuran",
  destination: "Penglipuran",
  travelDate: "Senin, 12 Oktober 2026",
  meetingPoint: "Balai Desa <Penglipuran>",
  note: "Kumpul pukul 04.30, mobil Hiace putih.",
  totalParticipants: "5 orang",
  bookingCount: 2,
  rows: [
    {
      code: "EJ-ABC234",
      contactName: "Nadia Putri",
      contactPhone: "081234567890",
      participants: "3 orang",
      notes: "Vegetarian",
      pending: false,
    },
    {
      code: "EJ-XYZ789",
      contactName: "Budi",
      contactPhone: "081300000000",
      participants: "2 orang",
      notes: null,
      pending: true,
    },
  ],
};

describe("departureManifestEmail", () => {
  it("lists every booking with contact, participants and notes (id)", () => {
    const email = departureManifestEmail(translator("id"), data);
    expect(email.subject).toBe("Manifest Fajar di Penglipuran, Senin, 12 Oktober 2026");
    expect(email.text).toContain("Halo Made Sukarta,");
    expect(email.text).toContain(
      "1. EJ-ABC234 - Nadia Putri - 3 orang - telp. 081234567890. Catatan tamu: Vegetarian",
    );
    expect(email.text).toContain(
      "2. EJ-XYZ789 - Budi - 2 orang - telp. 081300000000 - menunggu konfirmasi",
    );
    expect(email.text).toContain("Catatan dari tim: Kumpul pukul 04.30, mobil Hiace putih.");
    expect(email.text).toContain("Titik kumpul: Balai Desa <Penglipuran>");
    expect(email.text).toContain("Total peserta: 5 orang");
    expect(email.html).toContain("Balai Desa &lt;Penglipuran&gt;");
  });

  it("never mentions prices or payments", () => {
    const email = departureManifestEmail(translator("id"), data);
    for (const word of ["Rp", "Total harga", "Pembayaran", "bayar"]) {
      expect(email.text).not.toContain(word);
    }
  });

  it("omits the team note when there is none and translates to English", () => {
    const email = departureManifestEmail(translator("en"), { ...data, note: null });
    expect(email.text).not.toContain("Note from the team");
    expect(email.text).toContain("Guests (2 bookings):");
    expect(email.text).toContain("awaiting confirmation");
  });
});
