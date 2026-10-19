"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Check, Copy, Download, Mic, Plus, Share2, Upload, X } from "lucide-react";
import { AJRAK_BORDER, AppBackdrop } from "@/components/app/AppBackdrop";
import { AppHeader } from "@/components/app/AppHeader";
import { BookNav } from "@/components/app/BookNav";
import { SceneByName } from "@/components/illustrations/SceneByName";
import { PixelLantern } from "@/components/effects/PixelLantern";
import { Birdy } from "@/components/mascots/Birdy";
import { elderLabel, loadBook, newShareToken, updateBook, type Elder, type FamilyBook, type Theme } from "@/lib/book-store";
import { BookCover } from "@/components/book/BookCover";
import { listChapters, type StoredChapter } from "@/lib/chapter-store";
import { pushShareLink } from "@/lib/data/remote";
import { syncBook } from "@/lib/data/sync";
import { hasSupabase } from "@/lib/supabase/client";
import { THEMES } from "@/lib/themes";

export default function BookPage() {
  const router = useRouter();
  const [book, setBook] = useState<FamilyBook | null | undefined>(undefined);
  const [chapters, setChapters] = useState<StoredChapter[]>([]);
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Restore this account's book from Supabase (new phone, cleared browser);
      // a different account's book on a shared phone is dropped first.
      await syncBook();
      if (cancelled) return;
      const b = loadBook();
      if (!b) router.replace("/onboarding");
      else {
        setBook(b);
        setChapters(listChapters());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!book) {
    return (
      <div className="grid min-h-[100svh] place-items-center">
        <AppBackdrop />
        <PixelLantern size={56} />
      </div>
    );
  }

  const first = book.elders[0];
  const firstTheme = THEMES.find((t) => t.id === book.theme) ?? THEMES[THEMES.length - 1];
  const coverScene = chapters[0]?.scene ?? firstTheme.scene;

  return (
    <div className="relative min-h-[100svh]">
      <AppBackdrop />
      <AppHeader />

      <main className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-6 px-5 pb-20 pt-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        {/* The book cover: the one bold thing on this screen */}
        <section className="flex rounded-[34px] p-[10px] shadow-[0_30px_60px_-30px_rgba(5,5,30,0.8)]" style={AJRAK_BORDER}>
          <div className="relative flex-1 overflow-hidden rounded-[26px] bg-dusk text-moon">
            <SceneByName name={coverScene} className="absolute inset-0 h-full w-full opacity-90" />
            <div className="absolute inset-0 bg-gradient-to-t from-raat via-raat/60 to-transparent" />
            <div className="relative flex h-full min-h-[440px] flex-col justify-end p-7 sm:p-10">
              <p className="font-urdu text-2xl text-lantern-soft" dir="rtl" lang="ur" style={{ textAlign: "left" }}>
                یادوں کی بیٹھک
              </p>
              <h1 className="font-display mt-2 text-4xl leading-[1.05] sm:text-5xl">{book.familyName}</h1>
              <p className="mt-3 max-w-md text-moon/80">
                {chapters.length === 0 && first
                  ? `No storybooks yet. The first one starts when ${elderLabel(first)} begins telling a story about ${firstTheme.id.toLowerCase()}.`
                  : `${chapters.length} ${chapters.length === 1 ? "storybook" : "storybooks"} from ${book.elders.length} ${book.elders.length === 1 ? "storyteller" : "storytellers"}.`}
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                {chapters.length === 0 && first ? (
                  <Link
                    href={`/record?elder=${first.id}&theme=${encodeURIComponent(firstTheme.id)}`}
                    className="btn-lantern pixel-corners inline-flex h-14 items-center gap-2.5 px-7 text-base font-extrabold"
                  >
                    <Mic size={20} />
                    Start {elderLabel(first)}&apos;s first story
                  </Link>
                ) : (
                  <button type="button" onClick={() => setPicking(true)} className="btn-lantern pixel-corners inline-flex h-14 items-center gap-2.5 px-7 text-base font-extrabold">
                    <Mic size={20} />
                    Record a new story
                  </button>
                )}
                {chapters.length > 0 && (
                  <Link href="/book/print" className="glass-night inline-flex h-14 items-center gap-2 rounded-2xl px-5 font-bold text-moon hover:bg-white/15">
                    <Download size={18} /> Download PDF
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>

        <div className="flex min-w-0 flex-col gap-6">
          <section className="glass-night rounded-[28px] p-6">
            <h2 className="font-display text-2xl text-moon">Storytellers</h2>
            <ul className="mt-4 space-y-3">
              {book.elders.map((e) => (
                <ElderRow key={e.id} elder={e} count={chapters.filter((c) => c.elderId === e.id).length} />
              ))}
            </ul>
            <Link
              href="/book/elders/new"
              className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/20 font-bold text-moon/80 hover:border-lantern hover:text-moon"
            >
              <Plus size={18} /> Add another elder
            </Link>
          </section>

          <SharePanel book={book} onChange={setBook} />

          <section className="glass-night flex items-center gap-4 rounded-[28px] p-6 opacity-80">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-leaf/15 text-leaf">
              <Upload size={22} />
            </span>
            <div className="flex-1">
              <h2 className="font-bold text-moon">Upload an old voice note</h2>
              <p className="text-sm text-moon/70">Turn a WhatsApp voice note into a storybook.</p>
            </div>
            <span className="rounded-md bg-white/10 px-1.5 text-[11px] font-bold text-moon">Soon</span>
          </section>
        </div>

        {picking && <StartPicker elders={book.elders} onClose={() => setPicking(false)} />}

        <BookNav />

        <section className="lg:col-span-2">
          {chapters.length === 0 ? (
            <div className="glass-night flex flex-col items-center gap-3 rounded-[28px] px-6 py-12 text-center">
              <Birdy mood="listening" size={96} />
              <h2 className="font-display text-2xl text-moon">Your storybooks will stand here</h2>
              <p className="max-w-md text-moon/70">
                Every story {first ? elderLabel(first) : "your elder"} tells becomes its own illustrated storybook in Urdu and English, with their real voice
                inside.
              </p>
            </div>
          ) : (
            <Bookshelf chapters={chapters} elders={book.elders} />
          )}
        </section>
      </main>
    </div>
  );
}

function ElderRow({ elder, count }: { elder: Elder; count: number }) {
  return (
    <li className="flex items-center gap-4 rounded-2xl bg-white/5 p-3">
      {elder.photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={elder.photo} alt={elderLabel(elder)} className="h-14 w-14 shrink-0 rounded-full border border-white/20 object-cover" />
      ) : (
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-terracotta/20 font-display text-2xl text-terracotta">
          {elder.name.slice(0, 1).toUpperCase()}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block font-bold text-moon">{elderLabel(elder)}</span>
        <span className="block truncate text-sm text-moon/70">
          {count} {count === 1 ? "storybook" : "storybooks"}, speaks {elder.language}
          {elder.birthplace ? `, from ${elder.birthplace}` : ""}
        </span>
      </span>
      <Link
        href={`/record?elder=${elder.id}`}
        aria-label={`Record ${elderLabel(elder)}`}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-lantern text-ink hover:bg-lantern-soft"
      >
        <Mic size={18} />
      </Link>
    </li>
  );
}

/** Every storybook the family has made, as covers on shelves. Filter by storyteller when there are many. */
function Bookshelf({ chapters, elders }: { chapters: StoredChapter[]; elders: Elder[] }) {
  const [who, setWho] = useState<string>("all");
  const tellers = elders.filter((e) => chapters.some((c) => c.elderId === e.id));
  const shown = who === "all" ? chapters : chapters.filter((c) => c.elderId === who);
  const nameOf = (id: string) => {
    const e = elders.find((x) => x.id === id);
    return e ? elderLabel(e) : "Storyteller";
  };

  return (
    <>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl text-moon">The family bookshelf</h2>
          <p className="mt-1 text-moon/65">
            {chapters.length} {chapters.length === 1 ? "storybook" : "storybooks"}. Tap one to open it and turn the pages.
          </p>
        </div>
        {tellers.length > 1 && (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Show storybooks by">
            {[{ id: "all", label: "Everyone" }, ...tellers.map((e) => ({ id: e.id, label: elderLabel(e) }))].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setWho(f.id)}
                aria-pressed={who === f.id}
                className={`h-10 rounded-full px-4 text-sm font-bold transition ${who === f.id ? "bg-lantern text-ink" : "bg-white/5 text-moon hover:bg-white/15"}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <ul className="mt-6 grid grid-cols-2 gap-x-5 gap-y-10 border-b-[10px] border-[#3a2016] pb-6 shadow-[0_14px_20px_-14px_rgba(0,0,0,0.8)] sm:grid-cols-3 lg:grid-cols-4">
        {shown.map((c) => (
          <li key={c.id}>
            <Link href={`/book/chapter/${c.id}`} className="block rounded-[14px] focus-visible:outline-4 focus-visible:outline-lantern">
              <BookCover stored={c} teller={nameOf(c.elderId)} />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

/** Choose who is telling the next story and what about. */
function StartPicker({ elders, onClose }: { elders: Elder[]; onClose: () => void }) {
  const [elderId, setElderId] = useState(elders[0]?.id ?? "");
  const [theme, setTheme] = useState<Theme>("Free talk");
  return (
    <section className="glass-night relative rounded-[28px] p-6 sm:p-8 lg:col-span-2" aria-label="Record a new story">
      <button type="button" onClick={onClose} aria-label="Close" className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full text-moon/70 hover:bg-white/10 hover:text-moon">
        <X size={18} />
      </button>
      <h2 className="font-display text-2xl text-moon">Who&apos;s telling tonight&apos;s story?</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {elders.map((e) => (
          <button
            key={e.id}
            type="button"
            onClick={() => setElderId(e.id)}
            aria-pressed={elderId === e.id}
            className={`h-11 rounded-full px-5 font-bold transition ${elderId === e.id ? "bg-lantern text-ink" : "bg-white/5 text-moon hover:bg-white/15"}`}
          >
            {elderLabel(e)}
          </button>
        ))}
      </div>
      <h3 className="font-display mt-7 text-xl text-moon">What about?</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {THEMES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTheme(t.id)}
            aria-pressed={theme === t.id}
            className={`flex items-center gap-3 rounded-[18px] border-2 bg-white/5 p-2 pr-3 text-left transition ${
              theme === t.id ? "border-lantern" : "border-transparent hover:border-white/15"
            }`}
          >
            <SceneByName name={t.scene} className="h-12 w-16 shrink-0 rounded-xl" />
            <span className="font-display leading-tight text-moon">{t.id}</span>
          </button>
        ))}
      </div>
      <div className="mt-7 flex justify-end">
        <Link href={`/record?elder=${elderId}&theme=${encodeURIComponent(theme)}`} className="btn-lantern pixel-corners inline-flex h-14 items-center gap-2.5 px-7 font-extrabold">
          <Mic size={20} /> Start recording
        </Link>
      </div>
    </section>
  );
}

/** Share the book by link. Turning sharing off makes the old link stop working. */
function SharePanel({ book, onChange }: { book: FamilyBook; onChange: (b: FamilyBook) => void }) {
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const url = book.shareToken ? `${origin}/share/${book.shareToken}` : "";

  function set(shareToken: string | undefined) {
    updateBook({ shareToken });
    onChange({ ...book, shareToken });
    setCopied(false);
    // Mirror into share_links so the server can check the token (revoked = dead link).
    if (hasSupabase) void pushShareLink(book.id, shareToken).catch(() => {});
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="glass-night rounded-[28px] p-6">
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-lantern/15 text-lantern">
          <Share2 size={22} />
        </span>
        <div>
          <h2 className="font-bold text-moon">Share with family</h2>
          <p className="text-sm text-moon/70">{book.shareToken ? "Anyone with this link can read and listen." : "Private. Only you can see it."}</p>
        </div>
      </div>
      {book.shareToken ? (
        <>
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-[#0c0d2e]/60 p-2 pl-4">
            <span className="min-w-0 flex-1 truncate text-sm text-moon/80">{url}</span>
            <button type="button" onClick={copy} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white/10 px-3 text-sm font-bold text-moon hover:bg-white/20">
              {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Our family book, in Nani and Dada's own voices: ${url}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center rounded-full bg-leaf px-4 text-sm font-bold text-moon hover:brightness-110"
            >
              Send on WhatsApp
            </a>
            <button type="button" onClick={() => set(undefined)} className="text-sm font-bold text-moon/60 hover:text-terracotta">
              Stop sharing
            </button>
          </div>
        </>
      ) : (
        <button type="button" onClick={() => set(newShareToken())} className="mt-4 h-11 w-full rounded-2xl bg-white/10 font-bold text-moon hover:bg-white/15">
          Create a share link
        </button>
      )}
    </section>
  );
}
