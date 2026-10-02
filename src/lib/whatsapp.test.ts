import { describe, expect, it } from "vitest";
import { normalizeWhatsAppNumber, whatsAppLink } from "./whatsapp";

describe("normalizeWhatsAppNumber", () => {
  it("accepts international digits with or without separators", () => {
    expect(normalizeWhatsAppNumber("6281234567890")).toBe("6281234567890");
    expect(normalizeWhatsAppNumber("+62 812-3456-7890")).toBe("6281234567890");
    expect(normalizeWhatsAppNumber(" +44 (20) 7946.0958 ")).toBe("442079460958");
  });

  it("rejects local, short, long and non-numeric values", () => {
    for (const value of [
      "",
      null,
      undefined,
      "081234567890",
      "1234567",
      "1234567890123456",
      "62812abc7890",
      "++6281234567890",
      "62812345678;90",
    ]) {
      expect(normalizeWhatsAppNumber(value), String(value)).toBeNull();
    }
  });
});

describe("whatsAppLink", () => {
  it("builds a wa.me link and percent-encodes the message", () => {
    expect(whatsAppLink("6281234567890")).toBe("https://wa.me/6281234567890");
    expect(
      whatsAppLink(
        "6281234567890",
        'Halo, tentang "Jejak Desa & Kopi": https://etnojourney.id/tours/a?b=1#c',
      ),
    ).toBe(
      "https://wa.me/6281234567890?text=Halo%2C%20tentang%20%22Jejak%20Desa%20%26%20Kopi%22%3A%20https%3A%2F%2Fetnojourney.id%2Ftours%2Fa%3Fb%3D1%23c",
    );
  });

  it("encodes non-ASCII text and drops an empty message", () => {
    expect(whatsAppLink("6281234567890", "Kecak Uluwatu")).toBe(
      "https://wa.me/6281234567890?text=Kecak%20Uluwatu",
    );
    expect(whatsAppLink("6281234567890", "café")).toBe(
      "https://wa.me/6281234567890?text=caf%C3%A9",
    );
    expect(whatsAppLink("6281234567890", "   ")).toBe("https://wa.me/6281234567890");
  });

  it("returns null when the number is missing or invalid", () => {
    expect(whatsAppLink(undefined, "hi")).toBeNull();
    expect(whatsAppLink("0812345678", "hi")).toBeNull();
  });
});
