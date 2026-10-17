import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "A family book on Baithak",
  description: "Stories told by our elders, in their own voices, in Urdu and English.",
  // Family books are private links: keep them out of search engines.
  robots: { index: false, follow: false },
  openGraph: {
    title: "A family book on Baithak",
    description: "Stories told by our elders, in their own voices, in Urdu and English.",
  },
};

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return children;
}
