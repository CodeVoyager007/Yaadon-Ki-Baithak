/**
 * The home page's sample tales as complete storybooks anyone can open, no account needed. Like the
 * cards, they are written for this demo in the voice of Pakistani elders, not real families'
 * recordings; the page says so. The folk tales are retold in our own words.
 */
import type { StaticImageData } from "next/image";
import trailerListen from "@/components/illustrations/trailer/listen.webp";
import umroAyyar2 from "@/components/illustrations/tales/pages/umro-ayyar-2.webp";
import umroAyyar3 from "@/components/illustrations/tales/pages/umro-ayyar-3.webp";
import aliBaba from "@/components/illustrations/tales/ali-baba.webp";
import aliBaba2 from "@/components/illustrations/tales/pages/ali-baba-2.webp";
import aliBaba3 from "@/components/illustrations/tales/pages/ali-baba-3.webp";
import gulBakawali from "@/components/illustrations/tales/gul-bakawali.webp";
import gulBakawali2 from "@/components/illustrations/tales/pages/gul-bakawali-2.webp";
import gulBakawali3 from "@/components/illustrations/tales/pages/gul-bakawali-3.webp";
import hatimTai from "@/components/illustrations/tales/hatim-tai.webp";
import hatimTai2 from "@/components/illustrations/tales/pages/hatim-tai-2.webp";
import hatimTai3 from "@/components/illustrations/tales/pages/hatim-tai-3.webp";
import sheikhChilli2 from "@/components/illustrations/tales/pages/sheikh-chilli-2.webp";
import sheikhChilli3 from "@/components/illustrations/tales/pages/sheikh-chilli-3.webp";
import chiriyaKawwa from "@/components/illustrations/tales/chiriya-kawwa.webp";
import chiriyaKawwa2 from "@/components/illustrations/tales/pages/chiriya-kawwa-2.webp";
import chiriyaKawwa3 from "@/components/illustrations/tales/pages/chiriya-kawwa-3.webp";
import type { Elder, Relation } from "./book-store";
import type { StoredChapter } from "./chapter-store";
import { SAMPLE_CHAPTERS, type SampleChapter } from "./samples";

type SamplePage = { ur: string; en: string };

const PAGES: Record<string, { pages: SamplePage[]; art: StaticImageData[] }> = {
  "umro-ayyar-ki-zambil": {
    art: [umroAyyar2, umroAyyar3, trailerListen],
    pages: [
      {
        ur: "نانا اپنے کرتے کی جیب تھپتھپا کر کہتے، یہ میری زنبیل ہے۔ عمرو عیار کی زنبیل چھوٹی سی لگتی تھی، مگر جو چیز وہ مانگتا، اس میں سے نکل آتی: رسی، چراغ، یہاں تک کہ پورا خیمہ۔",
        en: "Nana would pat the pocket of his kurta and say, “This is my zambil.” Umro Ayyar’s bag looked tiny, but whatever he wished for came out of it: a rope, a lamp, even a whole tent.",
      },
      {
        ur: "عمرو، امیر حمزہ کا سب سے چالاک دوست تھا۔ وہ ہوا سے تیز دوڑتا تھا، اور ہر رات نیا بھیس بدلتا: کبھی فقیر، کبھی سوداگر، اور ایک بار تو شاہی باورچی بھی۔",
        en: "Umro was the cleverest friend of Amir Hamza. He could run faster than the wind, and every night he wore a new disguise: a beggar, a merchant, once even a royal cook.",
      },
      {
        ur: "ایک رات جادوگروں نے امیر حمزہ کے لشکر کو جادو کے قلعے میں بند کر دیا۔ عمرو سقّے کا بھیس بدل کر اندر جا پہنچا، اور زنبیل سے ایسا چراغ نکالا جو کبھی نہیں بجھتا تھا۔",
        en: "One night the sorcerers locked Amir Hamza’s army inside a magic fort. Umro slipped in dressed as a water carrier, and from his zambil he pulled a lamp that never went out.",
      },
      {
        ur: "اسی روشنی میں لشکر نے چھپا ہوا دروازہ ڈھونڈ لیا اور آزاد ہو گیا۔ نانا ہمیں رضائی اوڑھاتے ہوئے کہتے، اسی لیے کہتے ہیں کہ تیز دماغ مضبوط بازو سے بہتر ہے۔",
        en: "By its light the army found the hidden door and walked out free. “And that,” Nana said, tucking the blanket round us, “is why a clever head is better than a strong arm.”",
      },
    ],
  },
  "ali-baba-aur-chalis-chor": {
    art: [aliBaba2, aliBaba3, aliBaba],
    pages: [
      {
        ur: "علی بابا ایک غریب لکڑہارا تھا۔ ایک دن جنگل میں اس نے درخت کے پیچھے چھپ کر دیکھا کہ چالیس چور ایک بڑی چٹان کے پاس رکے۔ ان کے سردار نے پکارا، کھل جا سم سم! اور چٹان کھل گئی۔",
        en: "Ali Baba was a poor woodcutter. One day in the forest he hid behind a tree and watched forty thieves stop at a great rock. Their leader called out, “Khul ja sim sim!” and the rock opened.",
      },
      {
        ur: "اندر سونے اور جواہرات سے بھرا غار تھا۔ دادی یہ جادو کے الفاظ ہمیشہ سرگوشی میں کہتیں، تاکہ چور نہ سن لیں۔ علی بابا صرف اشرفیوں کی ایک چھوٹی سی تھیلی گھر لایا۔",
        en: "Inside was a cave full of gold and jewels. Dadi always whispered the magic words, so the thieves wouldn’t hear. Ali Baba took only one small bag of coins home.",
      },
      {
        ur: "مگر چوروں کو پتا چل گیا۔ ان کا سردار تیل کا سوداگر بن کر علی بابا کے گھر آیا، اونٹوں پر چالیس بڑے مٹکے لدے تھے، اور ہر مٹکے میں ایک چور چھپا تھا۔",
        en: "But the thieves found out. Their leader came to Ali Baba’s house as an oil merchant, with forty big jars on his camels, and a thief hidden in every one.",
      },
      {
        ur: "اصل ہیروئن مرجینا تھی، گھر کی ذہین ملازمہ۔ اس نے مٹکوں میں چھپے چوروں کو ڈھونڈ لیا اور چالیسوں کو مات دے دی۔ دادی کہتیں، یاد رکھو، گھر میں سب سے عقل مند اکثر وہی ہوتا ہے جس پر کسی کی نظر نہیں جاتی۔",
        en: "The real hero was Marjina, the clever servant girl. She found the thieves hiding in the jars and outsmarted all forty. “Remember,” Dadi said, “the cleverest one in the house is often the one nobody notices.”",
      },
    ],
  },
  "shahzadi-gul-bakawali": {
    art: [gulBakawali2, gulBakawali3, gulBakawali],
    pages: [
      {
        ur: "بوڑھے بادشاہ کی آنکھوں کی روشنی چلی گئی تھی، اور حکیموں نے کہا کہ دنیا میں صرف ایک پھول اسے واپس لا سکتا ہے: گلِ بکاولی، جو پریوں کے باغ میں کھلتا تھا۔",
        en: "The old king had lost his sight, and the hakeems said only one flower in the whole world could bring it back: the gul-e-bakawali, which grew in the garden of the fairies.",
      },
      {
        ur: "اس کا سب سے چھوٹا بیٹا، شہزادہ تاج الملوک، اکیلا نکل پڑا۔ وہ صحراؤں اور گھنے جنگلوں سے گزرا، یہاں تک کہ ایک چاندنی رات پریوں کے باغ پہنچا اور چمکتا ہوا پھول توڑ لیا۔",
        en: "His youngest son, Prince Taj-ul-Mulook, set out alone. He crossed deserts and dark forests until, one moonlit night, he reached the fairy garden and picked the glowing flower.",
      },
      {
        ur: "جب پری شہزادی بکاولی جاگی اور اپنا پھول غائب پایا، تو وہ اس لڑکے کو ڈھونڈنے انسانوں کی دنیا میں اتر آئی جس نے اسے توڑا تھا۔",
        en: "When the fairy princess Bakawali woke and found her flower gone, she came down to the world of people, looking for the boy who took it.",
      },
      {
        ur: "پھول بادشاہ کی آنکھوں سے لگا اور اس کی بینائی لوٹ آئی۔ ہم ہمیشہ پوچھتے، اور بکاولی؟ نانی مسکرا کر کہتیں، اس نے شہزادے کو ڈھونڈ لیا، مگر وہ کہانی کل رات کی ہے۔",
        en: "The flower touched the king’s eyes and he could see again. “And Bakawali?” we always asked. Nani would smile: “She found the prince, and that is a story for tomorrow night.”",
      },
    ],
  },
  "hatim-tai-ke-saat-sawal": {
    art: [hatimTai2, hatimTai3, hatimTai],
    pages: [
      {
        ur: "حسن بانو امیر بھی تھی اور عقل مند بھی، اور وہ صرف اس سے شادی کرتی جو اس کے سات سوالوں کے جواب لے آئے۔ بہت سے شہزادوں نے کوشش کی، مگر کوئی ساتوں جواب لے کر نہیں لوٹا۔",
        en: "Husn Bano was rich and wise, and she would only marry the man who answered her seven questions. Many princes tried. Not one came back with all seven answers.",
      },
      {
        ur: "ان میں سے ایک، شہزادہ منیر، ایک درخت کے نیچے بیٹھا رو رہا تھا۔ یمن کا سب سے سخی آدمی حاتم طائی رکا اور اس سے حال پوچھا۔ حاتم کو حسن بانو سے شادی کی کوئی خواہش نہیں تھی۔",
        en: "One of them, Prince Munir, sat crying under a tree. Hatim Tai, the kindest man in Yemen, stopped and asked what was wrong. Hatim didn’t want to marry Husn Bano at all.",
      },
      {
        ur: "پھر بھی وہ اس کی خاطر ساتوں سفر پر نکلا: پہاڑوں کے پار، جادو کے صحرا میں، ایک بے تہہ کنویں تک، اور راستے میں جو ملا اس کی مدد کرتا گیا۔",
        en: "Still he went on all seven journeys for him: across mountains, through a desert of magic, to a well with no bottom, helping whoever he met along the way.",
      },
      {
        ur: "وہ ہر سوال کا جواب لے آیا اور سب منیر کو دے دیے۔ دادا کہتے، اصل سخاوت یہی ہے: مشکل کام خود کرو، اور انعام کسی اور کو دے دو۔",
        en: "He brought back every answer and gave them all to Munir. “That,” Dada said, “is what real generosity looks like: do the hard part yourself, and let someone else have the prize.”",
      },
    ],
  },
  "sheikh-chilli-ka-khayali-pulao": {
    art: [sheikhChilli2, sheikhChilli3, trailerListen],
    pages: [
      {
        ur: "شیخ چلی سر پر گھی کا مٹکا رکھے بازار جا رہا تھا، اور ابھی سے منصوبے بنا رہا تھا۔ یہ گھی بیچ کر میں کچھ مرغیاں خریدوں گا۔",
        en: "Sheikh Chilli was carrying a pot of ghee to the market on his head, and already he was planning. “I’ll sell this ghee and buy some hens.”",
      },
      {
        ur: "مرغیاں انڈے دیں گی، انڈے بیچ کر بکریاں لوں گا۔ بکریوں سے بھینس آئے گی، اور بھینس سے ایک بڑا سا صحن والا گھر۔",
        en: "“The hens will lay eggs, I’ll sell the eggs and buy goats. The goats will become a buffalo, and the buffalo will buy me a big house with a courtyard.”",
      },
      {
        ur: "پھر میری شادی ہو گی، بیٹا ہو گا، اور جب بیٹا شرارت کرے گا تو میں سر ہلا کر کہوں گا، نہیں، نہیں، نہیں! اور شیخ چلی نے سر ہلا دیا۔",
        en: "“Then I’ll marry and have a son, and when my son is naughty I’ll shake my head and say, no, no, no!” And Sheikh Chilli shook his head.",
      },
      {
        ur: "گھی کا پورا مٹکا سڑک پر گر گیا۔ نہ مرغیاں، نہ بکریاں، نہ گھر۔ نانا ہنستے ہنستے کھانسنے لگتے، بیٹا، خیالی پلاؤ مت پکاؤ، پہلے مٹکا تو سنبھالو۔",
        en: "The whole pot of ghee fell on the road. No hens, no goats, no house. Nana would laugh until he coughed: “Don’t cook khayali pulao, beta. Carry the pot first.”",
      },
    ],
  },
  "chiriya-aur-kawwa": {
    art: [chiriyaKawwa2, chiriyaKawwa3, chiriyaKawwa],
    pages: [
      {
        ur: "ایک تھی چڑیا، ایک تھا کوا۔ دونوں ساتھ ساتھ رہتے تھے۔ کوے نے جلدی جلدی نمک اور مٹی سے اپنا گھر بنایا، اور چڑیا پر ہنسا۔",
        en: "Once there was a sparrow and there was a crow, and they lived side by side. The crow built his house quickly, from salt and mud, and laughed at the sparrow.",
      },
      {
        ur: "چڑیا نے جلدی نہیں کی۔ تنکا تنکا جوڑ کر، ایک ایک تیلی سے، اس نے چھوٹا سا مضبوط گھر بنایا اور اس میں نرم پر بچھا دیے۔",
        en: "The sparrow took her time. Twig by twig, straw by straw, she built a small, strong house and lined it with soft feathers.",
      },
      {
        ur: "پھر بارش آئی۔ کوے کا نمک اور مٹی کا گھر بہہ گیا، اور وہ بھیگا ہوا چڑیا کے دروازے پر آ کر بولا، چڑیا بہن، چڑیا بہن، دروازہ کھولو!",
        en: "Then the rain came. The crow’s house of salt and mud washed away, and he came knocking on the sparrow’s door, dripping wet. “Sister sparrow, sister sparrow, open the door!”",
      },
      {
        ur: "چڑیا بار بار کہتی، ذرا ٹھہرو، میں بچوں کو کھانا کھلا رہی ہوں۔ نانی ہر رات کوے کو تھوڑا اور انتظار کرواتیں، یہاں تک کہ ہم ہنستے ہنستے سو ہی نہ پاتے۔",
        en: "“Wait, I’m feeding my babies,” said the sparrow, again and again. Every night Nani made the crow wait a little longer, until we were laughing too hard to sleep.",
      },
    ],
  },
};

export const SAMPLE_SLUGS = SAMPLE_CHAPTERS.map((c) => c.slug);

/** A sample tale as a stored storybook plus its teller, ready for the StoryBook reader. */
export function sampleBook(slug: string): { sample: SampleChapter; stored: StoredChapter; elder: Elder } | null {
  const sample = SAMPLE_CHAPTERS.find((c) => c.slug === slug);
  const book = PAGES[slug];
  if (!sample || !book) return null;
  const [relation, ...rest] = sample.teller.split(" ");
  const elder: Elder = {
    id: `sample-${slug}`,
    name: rest.join(" "),
    relation: (["Nani", "Nana", "Dadi", "Dada"].includes(relation) ? relation : "Other") as Relation,
    language: "Urdu",
  };
  const cover = sample.image?.src;
  const pageImages = [cover ?? null, ...book.art.map((a) => a.src)];
  const stored: StoredChapter = {
    id: `sample-${slug}`,
    sessionId: `sample-${slug}`,
    elderId: elder.id,
    theme: "Folk tales",
    scene: sample.scene,
    createdAt: "2026-10-19T00:00:00.000Z",
    chapter: {
      title: { en: sample.title, ur: sample.urdu ?? "" },
      body: { ur: book.pages.map((p) => p.ur).join("\n\n"), en: book.pages.map((p) => p.en).join("\n\n") },
      sourceTurns: [],
      place: sample.place,
      pages: book.pages.map((p) => ({ ...p, sourceTurns: [] })),
    },
    // A sample has no recording, so the reader shows no voice player or voice length.
    turns: [],
    imageUrl: cover,
    pageImages,
    draft: false,
  };
  return { sample, stored, elder };
}
