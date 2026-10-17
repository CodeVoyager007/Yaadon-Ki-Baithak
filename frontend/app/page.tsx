import { Conversation } from "@/components/home/Conversation";
import { EveningSky } from "@/components/home/EveningSky";
import { HomeHero } from "@/components/home/HomeHero";
import { IntroFilm } from "@/components/home/IntroFilm";
import { Promise } from "@/components/home/Promise";
import { QuietLine } from "@/components/home/QuietLine";
import { SiteFooter } from "@/components/home/SiteFooter";
import { SiteNav } from "@/components/home/SiteNav";
import { StoryShelf } from "@/components/home/StoryShelf";

/**
 * Ek Shaam: the home page is one evening. Sunset in the hero, dusk on the
 * quiet line, a sitting with Dadi at nightfall, then the stars and lanterns.
 * The sky behind it all is one static gradient, so scrolling down is the
 * evening passing. Nothing pins the page; the conversation's chat panel is
 * sticky beside its steps, which keep scrolling.
 */
export default function HomePage() {
  return (
    <div className="relative min-h-screen bg-[#0a0a24]">
      <EveningSky />
      <IntroFilm />
      <SiteNav />
      <main className="relative">
        <HomeHero />
        <QuietLine />
        <Conversation />
        <StoryShelf />
        <Promise />
      </main>
      <div className="relative">
        <SiteFooter />
      </div>
    </div>
  );
}
