/**
 * Sample chapters for the home page. They are written for this demo in
 * the voice of Pakistani elders; they are not real families' stories,
 * and the page says so. The folk tales are the bedtime stories most
 * Pakistani children heard from a Nani or Dadi, retold in our own words.
 */
import type { StaticImageData } from "next/image";
import aliBaba from "@/components/illustrations/tales/ali-baba.jpg";
import chiriya from "@/components/illustrations/tales/chiriya-kawwa.jpg";
import gulBakawali from "@/components/illustrations/tales/gul-bakawali.jpg";
import hatimTai from "@/components/illustrations/tales/hatim-tai.jpg";
import sheikhChilli from "@/components/illustrations/tales/sheikh-chilli.jpg";
import umroAyyar from "@/components/illustrations/tales/umro-ayyar.jpg";

export type SampleChapter = {
  slug: string;
  title: string;
  /** Title in Urdu, shown under the English one. */
  urdu?: string;
  teller: string;
  year: string;
  place: string;
  voice: string;
  excerpt: string;
  scene: "train" | "doorway" | "tram" | "river" | "eid" | "dholki";
  /** A painted illustration; when set it replaces the drawn scene. */
  image?: StaticImageData;
};

/** The memory shown in the hero: what a real family chapter looks like. */
export const HERO_CHAPTER: SampleChapter = {
  slug: "last-train-from-ambala",
  title: "The last train from Ambala",
  teller: "Dadi Zubaida",
  year: "1947",
  place: "Ambala to Lahore",
  voice: "4:12",
  excerpt:
    "Abba worked for the railway, so we always lived near stations. That August, Ammi sewed our gold into the hem of my kurta. I held my little brother's hand the whole night.",
  scene: "train",
};

/** Bedtime tales on the story shelf. */
export const SAMPLE_CHAPTERS: SampleChapter[] = [
  {
    slug: "umro-ayyar-ki-zambil",
    title: "Umro Ayyar's magic zambil",
    urdu: "عمرو عیار کی زنبیل",
    teller: "Nana Abdul Rasheed",
    year: "Dastan",
    place: "Dastan-e-Amir Hamza",
    voice: "6:02",
    excerpt:
      "Nana would pat his kurta pocket and say, this is my zambil. Umro Ayyar's bag looked tiny, but anything he wished for came out of it, and no one ever caught him, because every night he wore a new disguise.",
    scene: "doorway",
    image: umroAyyar,
  },
  {
    slug: "ali-baba-aur-chalis-chor",
    title: "Ali Baba and the forty thieves",
    urdu: "علی بابا اور چالیس چور",
    teller: "Dadi Zubaida",
    year: "Alif Laila",
    place: "Alif Laila",
    voice: "7:45",
    excerpt:
      "Khul ja sim sim! Dadi always whispered it so the thieves wouldn't hear. But the real hero was Marjina, the clever servant girl, who found the thieves hiding in the oil jars and outsmarted all forty.",
    scene: "doorway",
    image: aliBaba,
  },
  {
    slug: "shahzadi-gul-bakawali",
    title: "Princess Gul Bakawali",
    urdu: "شہزادی گل بکاولی",
    teller: "Nani Sughra",
    year: "Qissa",
    place: "Qissa Gul Bakawali",
    voice: "8:10",
    excerpt:
      "The old king had lost his sight, and only one flower in the whole world could bring it back. Prince Taj-ul-Mulook crossed into fairy land to find it, and the fairy princess Bakawali came looking for the boy who took it.",
    scene: "river",
    image: gulBakawali,
  },
  {
    slug: "hatim-tai-ke-saat-sawal",
    title: "Hatim Tai's seven questions",
    urdu: "حاتم طائی کے سات سوال",
    teller: "Dada Ghulam Nabi",
    year: "Qissa",
    place: "Qissa Hatim Tai",
    voice: "9:30",
    excerpt:
      "Husn Bano would only marry the man who answered her seven questions. Hatim didn't want to marry her at all. He went on all seven journeys just to help a heartbroken prince who couldn't.",
    scene: "doorway",
    image: hatimTai,
  },
  {
    slug: "sheikh-chilli-ka-khayali-pulao",
    title: "Sheikh Chilli's daydream",
    urdu: "شیخ چلی کا خیالی پلاؤ",
    teller: "Nana Abdul Rasheed",
    year: "Kahani",
    place: "Told in every mohalla",
    voice: "3:15",
    excerpt:
      "He was carrying a pot of ghee and already planning: sell it, buy hens, then goats, then a big house. Then he shook his head to scold his imaginary son, and the whole pot of ghee fell on the road.",
    scene: "eid",
    image: sheikhChilli,
  },
  {
    slug: "chiriya-aur-kawwa",
    title: "The sparrow and the crow",
    urdu: "چڑیا اور کوا",
    teller: "Nani Sughra",
    year: "Kahani",
    place: "Nani's bedtime story",
    voice: "4:40",
    excerpt:
      "The crow built his house from salt and mud, the sparrow built hers from twigs. When the rain came, the crow's house washed away, and he came knocking on the sparrow's door, dripping wet.",
    scene: "river",
    image: chiriya,
  },
];
