import { readFile } from "node:fs/promises";
import path from "node:path";
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
  const logo = await readFile(path.join(process.cwd(), "public/brand/logo-full-white.png"));
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#7a654f",
          color: "#fbf8f3",
        }}
      >
        <img src={logoSrc} alt="" width={348} height={170} />
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 22, letterSpacing: 6, color: "#e9dcc8", textTransform: "uppercase" }}>
            {locale === "en" ? "Cultural journeys" : "Wisata budaya"}
          </div>
          <div style={{ fontSize: 62, lineHeight: 1.08, maxWidth: 1000 }}>{t("tagline")}</div>
        </div>
      </div>
    ),
    size,
  );
}
