import { Reveal } from "@/components/effects/Reveal";
import { EveningSky } from "@/components/home/EveningSky";
import { HomeHero } from "@/components/home/HomeHero";
import { HowItWorks } from "@/components/home/HowItWorks";
import { IntroFilm } from "@/components/home/IntroFilm";
import { KarachiShowcase } from "@/components/home/KarachiShowcase";
import { Promise } from "@/components/home/Promise";
import { QuietLine } from "@/components/home/QuietLine";
import { SiteFooter } from "@/components/home/SiteFooter";
import { SiteNav } from "@/components/home/SiteNav";
import { StoryShelf } from "@/components/home/StoryShelf";

/**
 * The home page: Dadi's book in the hero (write to it, it writes back), then
 * the night painting, how it works, why it matters, sample chapters and the
 * promise. Sections lift into view once as you scroll; the intro plays on
 * every real page load and can be skipped.
 */
export default function HomePage() {
  return (
    <div className="home-sky relative min-h-screen overflow-x-clip bg-[#0a0a24]">
      <a href="#main" className="sr-only z-[60] rounded-xl bg-lantern px-4 py-2 font-bold text-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      <div aria-hidden className="sd-progress pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px] bg-gradient-to-r from-terracotta via-lantern to-lantern-soft shadow-[0_0_12px_rgba(255,214,102,0.8)]" />
      <EveningSky />
      <IntroFilm />
      <SiteNav />
      <main id="main" className="relative">
        <HomeHero />
        <Reveal>
          <KarachiShowcase />
        </Reveal>
        <Reveal>
          <HowItWorks />
        </Reveal>
        <Reveal>
          <QuietLine />
        </Reveal>
        <Reveal>
          <StoryShelf />
        </Reveal>
        <Reveal>
          <Promise />
        </Reveal>
      </main>
      <div className="relative">
        <SiteFooter />
      </div>
    </div>
  );
}
