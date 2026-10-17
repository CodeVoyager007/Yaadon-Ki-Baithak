import ogPoster from "@/app/opengraph-image.jpg";
import { Reveal } from "@/components/effects/Reveal";
import { SkyLantern } from "@/components/effects/SkyLantern";
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
 * how it works, why it matters, sample chapters and the promise. Sections
 * lift into view once as you scroll; the intro and lanterns play on a real
 * page load only.
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
        {/* The poster from the site's own OG image, with lanterns drifting past it. */}
        <section aria-label="Yaadon ki Baithak poster" className="relative px-5 pb-4 pt-6">
          <div className="relative mx-auto max-w-4xl">
            <div className="overflow-hidden rounded-[30px] border border-moon/15 shadow-[0_36px_80px_-40px_rgba(2,2,18,0.95)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ogPoster.src}
                alt="Yaadon ki Baithak — every elder is a library"
                width={1200}
                height={630}
                className="h-auto w-full"
              />
            </div>
            <SkyLantern delay={0.6} duration={14} className="-bottom-[4vh] -left-[5vw]" />
            <SkyLantern delay={3.4} duration={13} className="-bottom-[2vh] -right-[6vw]" />
          </div>
        </section>
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
