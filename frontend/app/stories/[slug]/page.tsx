import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StoryBook } from "@/components/book/StoryBook";
import { NightSky } from "@/components/scene/NightSky";
import { SAMPLE_SLUGS, sampleBook } from "@/lib/sample-books";

export function generateStaticParams() {
  return SAMPLE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const book = sampleBook((await params).slug);
  if (!book) return {};
  return {
    title: book.sample.title,
    description: `${book.sample.title}, as ${book.sample.teller} told it: a sample storybook from Yaadon ki Baithak, in Urdu and English.`,
    alternates: { canonical: `/stories/${book.sample.slug}` },
    openGraph: { images: book.sample.image ? [book.sample.image.src] : undefined },
  };
}

/** A sample tale from the home page, open to everyone as a real storybook. */
export default async function SampleStoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const book = sampleBook((await params).slug);
  if (!book) notFound();
  return (
    <div className="relative isolate min-h-[100svh] overflow-hidden text-moon">
      <NightSky full={false} skyline="dim" />
      <main className="relative z-10 mx-auto max-w-6xl px-5 pb-16 pt-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link href="/#stories" className="text-sm font-bold text-lantern-soft hover:text-lantern">
            ← Back to the stories
          </Link>
          <p className="glass-night rounded-full px-4 py-2 text-xs text-moon/75">
            A sample storybook, written for this demo in an elder’s voice. Your book will hold your own family’s recordings.
          </p>
        </div>
        <h1 className="sr-only">{book.sample.title}</h1>
        <StoryBook stored={book.stored} elder={book.elder} family="Yaadon ki Baithak sample" />
        <div className="mt-12 flex flex-col items-center gap-3 text-center">
          <p className="font-display text-2xl">Every family has stories like this one.</p>
          <Link href="/signup" className="btn-lantern pixel-corners inline-flex h-12 items-center px-6 font-extrabold">
            Start your family book
          </Link>
        </div>
      </main>
    </div>
  );
}
