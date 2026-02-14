/**
 * Mnemonic word list for ngrok-style random subdomains (e.g. happy-blue-frog).
 * Short, memorable, URL-safe words.
 */
const WORDS = [
  "angel", "apple", "arrow", "beach", "bear", "bird", "blue", "boat", "bold",
  "bone", "book", "boss", "bush", "cake", "cash", "cat", "cave", "cold",
  "cord", "crab", "cube", "dark", "demo", "dice", "dock", "door", "dove",
  "dusk", "edge", "echo", "elm", "fall", "fern", "fire", "fish", "flag",
  "flat", "fog", "fork", "frog", "gold", "gray", "grey", "grid", "gulf",
  "harp", "hill", "hope", "iris", "iron", "java", "jazz", "key", "kite",
  "lake", "lamp", "lane", "leaf", "lime", "lion", "log", "map", "mask",
  "mint", "mist", "moon", "nova", "oak", "ocean", "olive", "opal", "pine",
  "pink", "pool", "port", "rain", "reed", "rock", "rose", "rust", "sand",
  "seed", "sky", "snow", "star", "sun", "surf", "swan", "tide", "tree",
  "vine", "wave", "wolf", "wood", "zen",
];

export function randomMnemonicId(): string {
  const picks: string[] = [];
  for (let i = 0; i < 3; i++) {
    picks.push(WORDS[Math.floor(Math.random() * WORDS.length)]!);
  }
  return picks.join("-");
}
