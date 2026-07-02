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
  finalMessage: `Every second with you is something I never want to forget.\nThank you for being my person, My Loooove.\nHere's to forever with you. 🌸`,

  // Memory spots — glowing orbs she walks toward
  memorySpots: [
    {
      id: 'sm',
      icon: '✨',
      title: 'Legazpi SM',
      message: 'This is where we finally met in person — and the moment I saw you, everything felt different. Worth every second of the wait, Moncakesss.',
      position: { x: 18, z: -14 },
    },
    {
      id: 'blvd',
      icon: '🌅',
      title: 'Legazpi Boulevard · 3PM',
      message: 'A walk at 3PM. Just us, the breeze, and no rush at all. I already knew I never wanted that walk to end.',
      position: { x: -20, z: -22 },
    },
    {
      id: 'bench',
      icon: '🪑',
      title: 'That Bench',
      message: 'We sat right here. I don\'t know how long — I lost track of time completely. This spot will always mean something to me.',
      position: { x: -5, z: -38 },
      // Heart photo frame will be placed near this spot (see photoFrames below)
    },
    {
      id: 'memory4',
      icon: '😂',
      title: 'Your Smile',
      message: 'I\'m still not over it. I hope I never am. — tell me another memory and I\'ll put it here! 💬',
      position: { x: 28, z: -30 },
    },
    {
      id: 'memory5',
      icon: '🌠',
      title: 'Us in the Future',
      message: 'I can\'t wait for all the places we haven\'t been yet and all the walks we haven\'t taken. Let\'s collect them all.',
      position: { x: 8, z: -50 },
    },
    {
      id: 'heart',
      icon: '💖',
      title: 'Happy Anniversary 💖',
      message: 'You are my favorite feeling in the world. Happy Anniversary, Moncakesss — I love you.',
      position: { x: 0, z: -65 },
      isFinal: true,
    },
  ],

  // Dog companion
  dogName: 'Bubbles',
  dogColor: 0xc68642,     // golden brown — change to match real fur color

  // Photo frames
  // heartShape: true → renders a glowing heart-shaped frame (no real photo needed)
  // src: 'file.jpg' → uses a real photo from /public/photos/
  photoFrames: [],
}
