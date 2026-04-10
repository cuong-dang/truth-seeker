export type ArgumentKind = "ROOT" | "SUPPORT" | "COUNTER" | "REPLY";

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
  author: Author;
  createdAt: string;
  score: number;
  userVote: number | null;
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
  replies: Argument[];
}
