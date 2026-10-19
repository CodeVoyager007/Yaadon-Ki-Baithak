from agents.page_setter import MAX_PAGES, WORDS_PER_PAGE, draft_chapter, lay_out, sentences
from agents.types import ElderProfile, Page, Turn

ELDER = ElderProfile(name="Zubaida", relation="Dadi", language="Urdu")


def test_sentences_split_at_urdu_and_english_marks():
    assert sentences("ہم لاہور گئے۔ کیوں؟ Because! Yes.") == ["ہم لاہور گئے۔", "کیوں؟", "Because!", "Yes."]


def test_a_run_on_transcript_is_cut_into_page_sized_pieces():
    run_on = " ".join(["لفظ"] * (WORDS_PER_PAGE * 2 + 5))
    assert [len(s.split()) for s in sentences(run_on)] == [WORDS_PER_PAGE, WORDS_PER_PAGE, 5]


def test_short_paragraphs_share_a_page_and_long_ones_split_in_step():
    short = [Page(ur="ایک جملہ۔", en="One line.", source_turns=[n]) for n in range(10)]
    pages = lay_out(short)
    assert len(pages) == 4 and [n for p in pages for n in p.source_turns] == list(range(10))
    long = Page(ur="یہ ایک لمبا جملہ ہے جو چلتا رہتا ہے۔ " * 30, en="This is a long sentence that keeps going. " * 30)
    pages = lay_out([long])
    assert 2 <= len(pages) <= MAX_PAGES
    # Each page has both languages, cut at the same points.
    assert all(p.ur and p.en for p in pages)
    assert abs(sum(len(p.ur.split()) for p in pages) - len(long.ur.split())) == 0


def test_never_more_than_max_pages():
    many = [Page(en="A sentence of a story that fills a page well enough. " * 8) for _ in range(20)]
    pages = lay_out(many)
    assert MAX_PAGES - 2 <= len(pages) <= MAX_PAGES
    assert sum(len(p.en.split()) for p in pages) == sum(len(p.en.split()) for p in many)  # nothing dropped


def test_a_draft_keeps_their_words_and_a_short_quote():
    long = "میری امی بہت اچھا کھانا بناتی تھیں۔ عید پر سارا خاندان ہمارے گھر آتا تھا۔ " * 20
    turns = [Turn(role="birdy", text="?", lang="ur", index=0), Turn(role="elder", text=long, lang="ur", index=1)]
    c = draft_chapter(ELDER, "Kitchen and recipes", turns)
    assert len(c.pages) > 1 and all(p.source_turns == [1] for p in c.pages)
    assert c.title.ur == "دادی کی یادیں" and c.pull_quote and len(c.pull_quote.text) <= 160
    assert "".join(p.ur for p in c.pages).replace(" ", "").replace("\n", "") == long.replace(" ", "")


def test_a_short_story_still_gets_a_page_per_moment():
    moments = [Page(ur=f"لمحہ {i}۔", en=f"Moment {i} of the story, a short one.", source_turns=[i]) for i in range(4)]
    assert [p.source_turns for p in lay_out(moments)] == [[0], [1], [2], [3]]
