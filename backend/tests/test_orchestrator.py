from agents import MAX_ANSWERS, ElderProfile, Orchestrator

from .conftest import FakeModel, birdy, run, said
from .test_agents import CHAPTER, GOOD, TURNS

ELDER = ElderProfile(name="Zubaida", relation="Nani", language="Urdu")


def test_a_normal_turn_has_no_handoff():
    out = run(Orchestrator(FakeModel(GOOD)).interview_turn(ELDER, "Free talk", [said("Near Anarkali")]))
    assert out.decision.action == "follow_up" and out.handoff is None
    assert out.trace[0].agent == "interviewer"


def test_wrap_up_hands_off_to_the_story_writer():
    turns = [t for i in range(MAX_ANSWERS) for t in (birdy(f"q{i}"), said(f"a{i}"))]
    out = run(Orchestrator(FakeModel()).interview_turn(ELDER, "Free talk", turns))
    assert out.handoff == "story_writer"
    assert out.trace[-1].outcome == "hand-off to story writer"


def test_cues_show_up_in_the_trace():
    out = run(Orchestrator(FakeModel(GOOD)).interview_turn(ELDER, "1947", [said("My mother passed away that year")]))
    assert "grief" in out.trace[0].detail
    assert out.signals.sensitive and out.signals.answers == 1


def test_pipeline_passes_the_writers_scene_to_the_illustrator():
    painted = []

    async def painter(req):
        painted.append(req)
        return "https://img.example/1.png"

    out = run(Orchestrator(FakeModel(CHAPTER), painter).write_chapter(ELDER, "Free talk", TURNS, 42))
    assert out.image_url == "https://img.example/1.png"
    assert painted[0].prompt.startswith("a small tea shop") and painted[0].seed == 42
    assert [t.agent for t in out.trace] == ["story_writer", "illustrator"]


def test_a_failed_painting_keeps_the_chapter():
    async def broken(_req):
        raise RuntimeError("Cloudflare answered 429")

    out = run(Orchestrator(FakeModel(CHAPTER), broken).write_chapter(ELDER, "Free talk", TURNS, 1))
    assert out.chapter is not None and out.image_url is None
    assert out.trace[-1].outcome.startswith("failed; book kept")


def test_no_chapter_means_no_painting():
    async def painter(_req):
        raise AssertionError("must not paint without a chapter")

    out = run(Orchestrator(FakeModel({}, {}), painter).write_chapter(ELDER, "Free talk", TURNS, 1))
    assert out.chapter is None


def test_without_an_illustrator_the_chapter_still_comes_back():
    out = run(Orchestrator(FakeModel(CHAPTER)).write_chapter(ELDER, "Free talk", TURNS, 1))
    assert out.chapter and out.image_url is None


BOOK = {
    **CHAPTER,
    "pages": [
        {"ur": "ہم انارکلی کے پاس رہتے تھے۔", "en": "We lived near Anarkali.", "scene": "a narrow bazaar at dusk", "sourceTurns": [1]},
        {"ur": "بارش کے بعد الائچی کی خوشبو آتی تھی۔", "en": "After rain it smelled of cardamom.", "scene": "a tea shop after rain", "sourceTurns": [3]},
        {"ur": "ابا چائے لاتے تھے۔", "en": "Abba brought tea.", "scene": "a brass teapot on a wooden bench", "sourceTurns": [1]},
    ],
}


def test_every_page_is_painted_and_one_failure_keeps_the_rest():
    painted = []

    async def painter(req):
        painted.append(req)
        if "teapot" in req.prompt:
            raise RuntimeError("Cloudflare answered 429")
        return f"https://img/{len(painted)}"

    out = run(Orchestrator(FakeModel(BOOK), painter).write_chapter(ELDER, "Free talk", TURNS, 42))
    assert len(out.chapter.pages) == 3 and len(out.page_images) == 3
    assert out.page_images[2] is None and out.page_images[0] and out.image_url == out.page_images[0]
    assert len({r.seed for r in painted}) == 3  # each page its own composition, same family style
    assert painted[0].width == 768 and painted[0].height == 576
    assert out.trace[-1].outcome == "painted 2 of 3 pages"


def test_a_failed_book_says_why():
    async def broken(_req):
        raise RuntimeError("Cloudflare answered 401: Authentication error")

    out = run(Orchestrator(FakeModel(BOOK), broken).write_chapter(ELDER, "Free talk", TURNS, 1))
    assert out.page_images == [None, None, None]
    assert out.trace[-1].detail == "Cloudflare answered 401: Authentication error"
