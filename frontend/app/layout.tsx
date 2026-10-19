import type { Metadata, Viewport } from "next";
import { SITE_URL } from "@/lib/site";
import "@fontsource-variable/fraunces/soft.css";
import "@fontsource-variable/fraunces/soft-italic.css";
import "@fontsource-variable/nunito/index.css";
import "@fontsource-variable/noto-nastaliq-urdu/index.css";
import "@fontsource-variable/caveat/index.css";
import "./globals.css";
import { SoundProvider } from "@/components/sound/SoundProvider";
import { PixelSparkles } from "@/components/effects/PixelSparkles";
import { WakeBackend } from "@/components/app/WakeBackend";

const description =
  "Hudhud sits with your grandparents, asks gentle questions in their own language, and turns their memories into an illustrated family storybook.";

export const metadata: Metadata = {
  // Absolute links for WhatsApp and social previews.
  metadataBase: new URL(SITE_URL),
  title: { default: "Yaadon ki Baithak: your grandparents' stories as a family storybook", template: "%s | Baithak" },
  description,
  applicationName: "Yaadon ki Baithak",
  keywords: [
    "Yaadon ki Baithak",
    "یادوں کی بیٹھک",
    "family storybook",
    "grandparents stories",
    "Urdu storytelling",
    "oral history",
    "AI storybook",
    "family memories",
    "Partition 1947 stories",
    "Nani Dadi kahani",
  ],
  category: "family",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Yaadon ki Baithak",
    description,
    siteName: "Yaadon ki Baithak",
    type: "website",
    url: "/",
    locale: "en_PK",
    alternateLocale: ["ur_PK"],
  },
  twitter: { card: "summary_large_image", title: "Yaadon ki Baithak", description },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#12133a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SoundProvider>
          {children}
          <PixelSparkles />
          <WakeBackend />
        </SoundProvider>
      </body>
    </html>
  );
}
