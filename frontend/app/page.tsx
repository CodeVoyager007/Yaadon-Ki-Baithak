import { EveningSky } from "@/components/home/EveningSky";
import { HomeHero } from "@/components/home/HomeHero";
import { HowItWorks } from "@/components/home/HowItWorks";
import { IntroFilm } from "@/components/home/IntroFilm";
import { Promise } from "@/components/home/Promise";
import { QuietLine } from "@/components/home/QuietLine";
import { SiteFooter } from "@/components/home/SiteFooter";
import { SiteNav } from "@/components/home/SiteNav";
import { StoryShelf } from "@/components/home/StoryShelf";

/**
 * The home page: Dadi's book in the hero (write to it, it writes back), then
 * how it works, why it matters, sample chapters and the promise. The page
 * itself scrolls normally; the only animation is inside the book.
 */
export default function HomePage() {
  return (
    <div className="relative min-h-screen bg-[#0a0a24]">
      <a href="#main" className="sr-only z-[60] rounded-xl bg-lantern px-4 py-2 font-bold text-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      <EveningSky />
      <IntroFilm />
      <SiteNav />
      <main id="main" className="relative">
        <HomeHero />
        <HowItWorks />
        <QuietLine />
        <StoryShelf />
        <Promise />
      </main>
      <div className="relative">
        <SiteFooter />
      </div>
    </div>
  );
}
