import { CinemaFrame } from "@/components/home/CinemaFrame";
import { Hero } from "@/components/home/Hero";
import { IntroFilm } from "@/components/home/IntroFilm";
import { Trailer } from "@/components/home/Trailer";
import { HowItWorks } from "@/components/home/HowItWorks";
import { Promise } from "@/components/home/Promise";
import { SiteFooter } from "@/components/home/SiteFooter";
import { SiteNav } from "@/components/home/SiteNav";
import { StoryShelf } from "@/components/home/StoryShelf";
import { Atmosphere } from "@/components/scene/Atmosphere";
import { StarDust } from "@/components/scene/StarDust";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#100f2e]">
      <IntroFilm />
      <div className="film-grain" aria-hidden />
      <SiteNav />
      <CinemaFrame />
      <main>
        <Hero />
        <Trailer />
        <div className="relative bg-[linear-gradient(180deg,#100f2e_0%,#16173f_45%,#14133a_100%)]">
          <Atmosphere />
          <StarDust count={110} />
          <HowItWorks />
          <StoryShelf />
          <Promise />
        </div>
      </main>
      <div className="bg-[#14133a]">
        <SiteFooter />
      </div>
    </div>
  );
}
