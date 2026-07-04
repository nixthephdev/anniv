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

  // Memory spots — glowing orbs she collects in Chapter 2 (after SM Legazpi).
  // Order here = story order. The final (isFinal) spot only unlocks after
  // all the others are collected — that's where he is waiting.
  memorySpots: [
    {
      id: 'sm',
      icon: '✨',
      title: 'Legazpi SM',
      message: 'This is where we finally met in person — and the moment I saw you, everything felt different. Worth every second of the wait, Moncakesss.',
      position: { x: 10, z: -80 },
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
    },
    {
      id: 'smile',
      icon: '😊',
      title: 'Your Smile',
      message: 'The first time I saw you smile in person, I forgot every word I was about to say. It\'s still my favorite view in the whole world — and I plan on seeing it every day, forever.',
      position: { x: 28, z: -30 },
    },
    {
      id: 'future',
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
    { heartShape: true, label: 'Us 💕', position: { x: -9, z: -38 } },          // beside That Bench
    { src: 'photo1.jpg', label: 'Our first photo', position: { x: -23, z: -19 } }, // near the Boulevard
    { src: 'photo2.jpg', label: 'My favorite one', position: { x: 25, z: -33 } },  // near Your Smile
    { src: 'photo3.jpg', label: 'Forever mood',    position: { x: 4, z: -23 } },   // near the finale
  ],
}
