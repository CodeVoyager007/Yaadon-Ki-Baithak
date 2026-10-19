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

/**
 * Scenes to paint when the story writer couldn't run and the book is the elder's own words.
 * Calm places and objects only (no people's faces), one per page, so every page still gets
 * its own painting.
 */
export const DRAFT_SCENES: Record<Theme, string[]> = {
  Childhood: [
    "a sunlit courtyard of an old house with a neem tree and a charpai",
    "children's marbles and a spinning top on a dusty lane at dusk",
    "a kite caught in the evening sky above flat rooftops",
    "a brass water pot beside a hand pump in a quiet courtyard",
    "a school satchel and a slate resting on a wooden bench",
    "a grandmother's shawl folded on a charpai under a lantern",
  ],
  "My city back then": [
    "a busy old bazaar street with cloth shops and hanging lanterns at dusk",
    "an old tram passing an arched colonial building in soft evening light",
    "a single-screen cinema with a painted film poster and a ticket window",
    "a tonga waiting beside a fountain in an old city square",
    "a tea stall with steaming kettles on a narrow street corner",
    "an old clock tower above a crowded market at sunset",
  ],
  "1947": [
    "an old steam train waiting at a quiet railway platform at dusk, a single lantern glowing",
    "a tin trunk and a bundle of belongings resting on a station bench",
    "a long country road at dawn with bullock carts in the distance",
    "an old wooden doorway with a lock, a lantern glowing beside it",
    "a field of wheat under a wide evening sky",
    "a family photograph in a frame resting on a windowsill",
  ],
  "Wedding day": [
    "a courtyard strung with marigold garlands and fairy lights at night",
    "a dholak drum and bangles on a colorful rug",
    "hands decorated with henna patterns holding a small lamp",
    "a decorated wedding car with flowers outside an old house",
    "trays of sweets and dried fruit on a low table under lanterns",
    "a red embroidered dupatta draped over a carved wooden chest",
  ],
  "Kitchen and recipes": [
    "a clay stove with a pot of simmering curry in an old kitchen",
    "spices in brass bowls on a wooden board, warm light",
    "fresh round rotis stacked on a cloth beside a tawa",
    "a kitchen window with jars of pickles in the sun",
    "a family dastarkhwan spread with dishes on a floor mat",
    "a copper pot of tea steaming on a small stove at dusk",
  ],
  "Folk tales": [
    "a river bank at dusk with a small wooden boat and fireflies",
    "a wise old banyan tree with lanterns hanging from its branches",
    "a parrot and a hoopoe sitting on the edge of a palace window",
    "a winding path through a moonlit forest toward a distant fort",
    "a village well under a starry sky with a single lamp",
    "an open storybook glowing in lantern light",
  ],
  "Free talk": [
    "an old wooden doorway of a courtyard house at dusk, a lantern glowing beside it",
    "a cup of tea and a pair of spectacles on a windowsill at evening",
    "a rooftop at sunset with pigeons and drying laundry",
    "a garden path with rose bushes and a wooden bench",
    "a shelf of old books and a radio in warm lamplight",
    "a quiet street with an old lamppost after rain",
  ],
};
