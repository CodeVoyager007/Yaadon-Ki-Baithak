import type { Metadata } from "next";

export const metadata: Metadata = { title: "Family bookshelf", robots: { index: false, follow: false } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
