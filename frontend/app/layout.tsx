import type { Metadata, Viewport } from "next";
import "@fontsource-variable/fraunces/soft.css";
import "@fontsource-variable/fraunces/soft-italic.css";
import "@fontsource-variable/nunito/index.css";
import "@fontsource-variable/noto-nastaliq-urdu/index.css";
import "@fontsource-variable/caveat/index.css";
import "./globals.css";
import { SoundProvider } from "@/components/sound/SoundProvider";
import { PixelSparkles } from "@/components/effects/PixelSparkles";

const description =
  "Hudhud sits with your grandparents, asks gentle questions in their own language, and turns their memories into an illustrated family storybook.";

export const metadata: Metadata = {
  // Absolute links for WhatsApp and social previews. Set NEXT_PUBLIC_SITE_URL on Vercel.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "Yaadon ki Baithak", template: "%s | Baithak" },
  description,
  openGraph: { title: "Yaadon ki Baithak", description, siteName: "Baithak", type: "website" },
  twitter: { card: "summary_large_image" },
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
        </SoundProvider>
      </body>
    </html>
  );
}
