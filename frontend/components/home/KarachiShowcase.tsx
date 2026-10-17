import ogImage from "@/app/opengraph-image.jpg";
import { SkyLantern } from "@/components/effects/SkyLantern";
import { AJRAK_BORDER } from "@/components/app/AppBackdrop";

/**
 * A cinematic showcase of the night painting (old Karachi rooftops and
 * Mazar-e-Quaid) under the stars, framed in ajrak, with warm sky lanterns
 * floating up on both sides. The copy speaks to every family, not only
 * Karachi: the painting is one example of the nights we keep.
 */
export function KarachiShowcase() {
  return (
    <section className="relative isolate overflow-clip px-5 py-20" aria-label="Night painting showcase">
      {/* Sky lanterns floating on the left side */}
      <SkyLantern delay={0.2} duration={13} className="bottom-[10%] left-[3vw]" />
      <SkyLantern delay={2.5} duration={12} className="bottom-[4%] left-[12vw]" />
      <SkyLantern delay={5.0} duration={14} className="bottom-[16%] left-[6vw]" />

      {/* Sky lanterns floating on the right side */}
      <SkyLantern delay={1.2} duration={12} className="bottom-[8%] right-[4vw]" />
      <SkyLantern delay={3.8} duration={13} className="bottom-[2%] right-[14vw]" />
      <SkyLantern delay={6.2} duration={11} className="bottom-[18%] right-[8vw]" />

      <div className="relative z-10 mx-auto max-w-5xl">
        <div className="sd-focus mb-8 text-center">
          <p className="font-urdu text-2xl leading-[2] text-lantern-soft sm:text-3xl" dir="rtl" lang="ur">
            کراچی سے ہر گھر تک — جہاں کہانیاں جاگتی ہیں
          </p>
          <h2 className="font-display mt-1 text-3xl font-semibold text-moon sm:text-4xl">
            From Karachi to every home that remembers.
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-moon/75 sm:text-base">
            Saddar&apos;s tram lines, a rooftop in Lahore, a courtyard in Hyderabad — wherever your elders grew up, their
            stories deserve to be kept in their own voice.
          </p>
        </div>

        {/* Framed opengraph painting */}
        <div className="sd-unroll overflow-clip rounded-[32px] p-[8px] shadow-[0_30px_70px_-20px_rgba(5,5,30,0.9)]" style={AJRAK_BORDER}>
          <div className="relative aspect-[1200/630] w-full overflow-clip rounded-[25px] bg-[#12133a]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ogImage.src}
              alt="Mazar-e-Quaid and old Karachi rooftops at night, painted for Baithak"
              className="sd-kenburns h-full w-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-raat/90 via-raat/20 to-transparent pointer-events-none" />
            {/* A line over the sky, so the painting speaks to every family */}
            <div className="absolute inset-x-0 top-0 z-10 flex flex-col items-center gap-2 px-6 pt-5 text-center sm:pt-7">
              <span
                className="font-urdu rounded-full border border-lantern/25 bg-raat/70 px-4 py-1 text-lg text-lantern-soft backdrop-blur sm:text-xl"
                dir="rtl"
                lang="ur"
              >
                ہر شہر کی اپنی کہانی ہے
              </span>
              <p className="font-display text-sm font-semibold text-moon drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] sm:text-base">
                Keep the night your family remembers.
              </p>
            </div>
            <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between sm:bottom-6 sm:left-8 sm:right-8">
              <div>
                <span className="font-pixel rounded-md bg-raat/80 px-2.5 py-1 text-xs text-lantern-soft">
                  کراچی کا منظر
                </span>
                <p className="font-display mt-2 text-xl font-semibold text-moon sm:text-2xl">
                  Old Karachi at Night
                </p>
              </div>
              <span className="text-xs text-moon/60 hidden sm:inline">
                Painted for Yaadon ki Baithak
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
