// ─────────────────────────────────────────────
//  ANNIVERSARY GAME · PERSONAL CONFIG
//  Fill in your details here!
// ─────────────────────────────────────────────

export const CONFIG = {
  // Names
  herName: 'Moncakesss',
  yourName: 'My Loooove',
  anniversaryDate: 'July 5',

  // Final screen
  finalTitle: 'Happy Anniversary, Moncakesss 💖',
  finalMessage: `Bawat segundong kasama ka, ayaw kong makalimutan.\nSalamat sa pagiging tahanan ko, My Loooove.\nHere's to forever with you. 🌸`,

  // Memory spots — glowing orbs she collects in Chapter 2 (after SM Legazpi).
  // Order here = story order. The final (isFinal) spot only unlocks after
  // all the others are collected — that's where he is waiting.
  //
  // Each spot can have a quiz: she has to answer to continue!
  //   correct: index of the right option (0-based), or 'all' if every answer wins
  //   right: shown when she gets it — make it sweet
  //   wrong: shown when she misses — make it funny
  memorySpots: [
    {
      id: 'sm',
      icon: '✨',
      title: 'Legazpi SM',
      message: 'Dito tayo sa wakas nagkita nang personal — at noong makita kita, iba na agad ang pakiramdam ng lahat. Sulit ang bawat segundo ng paghihintay, Moncakesss.',
      position: { x: 10, z: -80 },
      quiz: {
        question: 'First message ko sa\'yo noong April 30?',
        options: ['"Uy haha"', '"Hi po, pwede makilala? 😇"', '"Gusto kita HAHAHA"'],
        correct: 0,
        right: 'HAHAHA yes. Two words lang — pero yun na pala ang simula ng lahat. 💚',
        wrong: 'Weh?? I-scroll mo ulit ang chat natin HAHAHA 😂',
      },
    },
    {
      id: 'blvd',
      icon: '🌅',
      title: 'Legazpi Boulevard · 3PM',
      message: 'Lakad tayo nang 3PM. Tayong dalawa lang, yung hangin, at walang nagmamadali. Alam ko na noon pa lang — ayaw kong matapos yung lakad na \'yun.',
      position: { x: -20, z: -22 },
      quiz: {
        question: 'Anong oras tayo naglakad sa Boulevard?',
        options: ['6 AM jogging daw', '3 PM 🌅', 'Midnight HAHAHA'],
        correct: 1,
        right: '3PM. Golden hour. Pinaka-peaceful na lakad ng buhay ko.',
        wrong: 'Hindi ah HAHAHA. Isipin mo ulit — golden hour yun. 😌',
      },
    },
    {
      id: 'bench',
      icon: '🪑',
      title: 'Yung Bench Na \'Yun',
      message: 'Dito mismo tayo umupo. Hindi ko alam kung gaano katagal — nawala talaga ako sa oras. May kahulugan sa akin ang lugar na \'to, habang-buhay.',
      position: { x: -5, z: -38 },
      quiz: {
        question: 'Gaano tayo katagal sa bench na \'yun?',
        options: ['Mga 30 minutes', 'Isang oras siguro', 'Nawala sa oras... walang nakakaalam'],
        correct: 2,
        right: 'Exactly. Time stopped. Hanggang ngayon hindi ko pa rin alam kung gaano katagal. 💕',
        wrong: 'Mali HAHAHA. Mas matagal pa d\'yan — sobrang tagal na hindi ko na namalayan.',
      },
    },
    {
      id: 'smile',
      icon: '😊',
      title: 'Yung Ngiti Mo',
      message: 'Noong una kitang nakitang ngumiti nang personal, nakalimutan ko lahat ng sasabihin ko. Hanggang ngayon, \'yun pa rin ang paborito kong view sa buong mundo — at plano kong makita \'yun araw-araw, habang-buhay.',
      position: { x: 28, z: -30 },
      quiz: {
        question: 'Ano ang paborito kong view sa buong mundo?',
        options: ['Mayon Volcano', 'Ang smile mo', 'SM Legazpi fountain'],
        correct: 1,
        right: 'Correct. Sorry, Mayon — talo ka. 😊💖',
        wrong: 'CLOSE! Pero hindi HAHAHA. Nasa harap ko lang ang sagot kapag magkasama tayo.',
      },
    },
    {
      id: 'future',
      icon: '🌠',
      title: 'Tayo sa Hinaharap',
      message: 'Excited na ako sa lahat ng lugar na hindi pa natin napupuntahan at lahat ng lakad na hindi pa natin nagagawa. Kolektahin natin silang lahat.',
      position: { x: 8, z: -50 },
      quiz: {
        question: 'Saan tayo pupunta next?',
        options: ['Kahit saan', 'Kahit kailan', 'Basta\'t kasama kita'],
        correct: 'all',
        right: 'Trick question HAHAHA — lahat tama. Basta\'t ikaw, G ako. 🌠',
        wrong: '',
      },
    },
    {
      id: 'heart',
      icon: '💖',
      title: 'Happy Anniversary 💖',
      message: 'Ikaw ang paborito kong pakiramdam sa buong mundo. Happy Anniversary, Moncakesss — mahal na mahal kita.',
      position: { x: 0, z: -26 },
      isFinal: true,
    },
  ],

  // Dog companion
  dogName: 'Bubbles',
  dogColor: 0xc68642,     // golden brown — change to match real fur color

  // Photo frames — drop your photos into  public/photos/  with these exact
  // file names and they appear in the world automatically. Frames whose photo
  // file is missing simply don't show (no ugly empty frames).
  // heartShape: true → glowing heart-shaped frame (works with no photo too)
  photoFrames: [
    { heartShape: true, label: 'Tayo 💕', position: { x: -9, z: -38 } },              // beside That Bench
    { src: 'photo1.jpg', label: 'Unang picture natin', position: { x: -23, z: -19 } }, // near the Boulevard
    { src: 'photo2.jpg', label: 'Paborito ko \'to',    position: { x: 25, z: -33 } },  // near Your Smile
    { src: 'photo3.jpg', label: 'Forever tayo',        position: { x: 4, z: -23 } },   // near the finale
  ],
}
