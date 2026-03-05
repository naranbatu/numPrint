export const TEAMS = [
  "naraa",
  "SEA",
  "NUM-GZB",
  "B2",
  "treaple",
  "INC",
  "Mongolz_MNC",
  "NUM_ZDH",
] as const;

export const PROBLEMS = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L",
] as const;

export const LANGUAGES = ["C", "C++", "Python", "Java"] as const;

export type Team = (typeof TEAMS)[number];
export type Problem = (typeof PROBLEMS)[number];
export type Language = (typeof LANGUAGES)[number];
