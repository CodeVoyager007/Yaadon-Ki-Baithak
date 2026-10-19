import type { Metadata } from "next";

// Nested under /book, so the root "| Baithak" template doesn't reach here on its own.
export const metadata: Metadata = { title: { absolute: "Storybook | Baithak" } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
