import type { Theme } from "./book-store";
import type { SampleChapter } from "./samples";

/** Story themes, each with an illustration and an opening question. */
export const THEMES: { id: Theme; ur: string; scene: SampleChapter["scene"]; blurb: string; firstQuestion: { ur: string; en: string } }[] = [
  {
    id: "Childhood",
    ur: "بچپن",
    scene: "doorway",
    blurb: "The house, the street, the games",
    firstQuestion: { ur: "آپ کا بچپن کہاں گزرا؟", en: "Where did you spend your childhood?" },
  },
  {
    id: "My city back then",
    ur: "میرا پرانا شہر",
    scene: "tram",
    blurb: "Bazaars, trams, the cinema",
    firstQuestion: { ur: "آپ کے زمانے میں شہر کیسا تھا؟", en: "What was the city like in your time?" },
  },
  {
    id: "1947",
    ur: "انیس سو سینتالیس",
    scene: "train",
    blurb: "Partition and the journey",
    firstQuestion: { ur: "انیس سو سینتالیس میں آپ کہاں تھے؟", en: "Where were you in 1947?" },
  },
  {
    id: "Wedding day",
    ur: "شادی کا دن",
    scene: "dholki",
    blurb: "Dholki nights, the baraat",
    firstQuestion: { ur: "آپ کی شادی کا دن کیسا تھا؟", en: "What was your wedding day like?" },
  },
  {
    id: "Kitchen and recipes",
    ur: "باورچی خانہ اور کھانے",
    scene: "eid",
    blurb: "Food that tastes like home",
    firstQuestion: { ur: "آپ کی امی کون سا کھانا سب سے اچھا بناتی تھیں؟", en: "Which dish did your mother make best?" },
  },
  {
    id: "Folk tales",
    ur: "لوک کہانیاں",
    scene: "river",
    blurb: "Stories they were told",
    firstQuestion: { ur: "بچپن میں آپ کو کون سی کہانی سنائی جاتی تھی؟", en: "Which story were you told as a child?" },
  },
  {
    id: "Free talk",
    ur: "کھلی بات",
    scene: "doorway",
    blurb: "Wherever the memory goes",
    firstQuestion: { ur: "آج آپ کس بارے میں بات کرنا چاہیں گی؟", en: "What would you like to talk about today?" },
  },
];

/** Follow-ups used until the interviewer agent is connected. */
/** Practice clarifications, used when the AI isn't available after a story is told. */
export const PRACTICE_CLARIFY = [
  { ur: "اس کہانی میں آپ کے ساتھ اور کون کون تھا؟", en: "Who else was with you in this story?" },
  { ur: "یہ سب کس شہر میں ہوا تھا؟", en: "Which town did all this happen in?" },
];

export const PRACTICE_FOLLOW_UPS = [
  { ur: "اس وقت آپ کے ساتھ کون تھا؟", en: "Who was with you then?" },
  { ur: "وہاں کی کوئی خوشبو یاد ہے؟", en: "Do you remember a smell from there?" },
  { ur: "اس دن کے بعد کیا ہوا؟", en: "What happened after that day?" },
  { ur: "اس وقت لوگ کیا پہنتے تھے؟", en: "What did people wear back then?" },
  { ur: "اس جگہ کی کوئی آواز یاد ہے؟", en: "Is there a sound from that place you still remember?" },
  { ur: "اس بارے میں آپ کے گھر والے کیا کہتے تھے؟", en: "What did your family say about it?" },
];
