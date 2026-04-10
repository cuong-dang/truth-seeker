export type ArgumentKind = "ROOT" | "SUPPORT" | "COUNTER" | "REPLY";

export type Tag = "NEWS" | "TECH" | "EDUCATION" | "POLITICS" | "RELIGION" | "GAMING" | "SPORTS" | "ENTERTAINMENT";

export const ALL_TAGS: Tag[] = ["NEWS", "TECH", "EDUCATION", "POLITICS", "RELIGION", "GAMING", "SPORTS", "ENTERTAINMENT"];

export interface Author {
  id: string;
  name: string | null;
  image: string | null;
}

export interface Argument {
  id: string;
  content: string;
  imageUrl: string | null;
  kind: ArgumentKind;
  tag: Tag | null;
  author: Author;
  createdAt: string;
  score: number;
  userVote: number | null;
  questionCount: number;
  supportCount: number;
  counterCount: number;
  totalReplyCount: number;
  questions: Question[];
  supports: Argument[];
  counters: Argument[];
}

export interface Question {
  id: string;
  content: string;
  imageUrl: string | null;
  author: Author;
  createdAt: string;
  score: number;
  userVote: number | null;
  replyCount: number;
  totalReplyCount: number;
  replies: Argument[];
}
