import { SCENE_IMAGES } from "@/components/illustrations/SceneByName";
import { bookPages, coverImage } from "@/lib/book-pages";
import type { StoredChapter } from "@/lib/chapter-store";
import { StoryImage } from "./StoryImage";

/** One storybook standing on the family's shelf: painted cover, cloth spine, title, page count. */
export function BookCover({ stored, teller }: { stored: StoredChapter; teller: string }) {
  const { title } = stored.chapter;
  const pages = bookPages(stored).length;
  return (
    <div className="group [perspective:1200px]">
      <div className="relative aspect-[3/4] overflow-hidden rounded-r-[14px] rounded-l-[4px] bg-[#3a2016] shadow-[10px_14px_30px_-12px_rgba(5,5,20,0.9)] transition-transform duration-300 group-hover:[transform:rotateY(-8deg)] motion-reduce:transition-none">
        <StoryImage src={coverImage(stored)} fallback={SCENE_IMAGES[stored.scene].src} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1a0f0a]/95 via-[#1a0f0a]/25 to-transparent" />
        {/* spine and page edges */}
        <div aria-hidden className="absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-[#9e2b25] via-[#7a2416] to-[#3a2016]/0" />
        <div aria-hidden className="absolute inset-y-2 right-0 w-1 bg-[repeating-linear-gradient(to_bottom,#f1e0bd_0_2px,#d9c296_2px_3px)] opacity-70" />
        <div className="absolute inset-x-0 bottom-0 p-4 pl-6">
          {title.ur && (
            <p className="font-urdu text-lg leading-[1.9] text-lantern-soft" dir="rtl" lang="ur" style={{ textAlign: "left" }}>
              {title.ur}
            </p>
          )}
          <h3 className="font-display text-xl leading-tight text-moon">{title.en}</h3>
          <p className="mt-1 text-xs text-moon/70">
            {teller} · {pages} {pages === 1 ? "page" : "pages"}
          </p>
        </div>
        {stored.draft && <span className="absolute right-3 top-3 rounded-md bg-lantern/90 px-2 py-0.5 text-[11px] font-bold text-ink">Draft</span>}
      </div>
    </div>
  );
}
