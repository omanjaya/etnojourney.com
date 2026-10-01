import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";

export const alt = "EtnoJourney";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Default social card used by pages without their own photo. */
export default async function OpengraphImage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: requested } = await params;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: "common" });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          background: "#1e2a44",
          color: "#fbf8f3",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              background: "#fbf8f3",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ width: 28, height: 28, borderRadius: 14, background: "#b4532a" }} />
          </div>
          <div style={{ fontSize: 40, fontWeight: 600 }}>EtnoJourney</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 22, letterSpacing: 6, color: "#c4963f", textTransform: "uppercase" }}>
            {locale === "en" ? "Cultural journeys" : "Wisata budaya"}
          </div>
          <div style={{ fontSize: 68, lineHeight: 1.08, maxWidth: 980 }}>{t("tagline")}</div>
        </div>
        <div style={{ display: "flex", height: 8, width: 160, background: "#b4532a", borderRadius: 4 }} />
      </div>
    ),
    size,
  );
}
