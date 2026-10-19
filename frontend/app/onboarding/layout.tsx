import type { Metadata } from "next";

export const metadata: Metadata = { title: "Start your family book" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
