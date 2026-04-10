import { prisma } from "./prisma";
import type { Argument, Question } from "@/types/argument";

const authorSelect = { id: true, name: true, image: true } as const;

// Fetch all arguments and questions, build the nested tree in memory.
// Four flat queries regardless of tree depth.
export async function getArgumentTree(userId?: string): Promise<Argument[]> {
  const [allArguments, allQuestions, allArgVotes, allQVotes] = await Promise.all([
    prisma.argument.findMany({
      include: { author: { select: authorSelect } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.question.findMany({
      include: { author: { select: authorSelect } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.argumentVote.findMany(),
    prisma.questionVote.findMany(),
  ]);

  // Compute argument scores and current user's votes
  const argScores = new Map<string, number>();
  const userArgVotes = new Map<string, number>();
  for (const v of allArgVotes) {
    argScores.set(v.argumentId, (argScores.get(v.argumentId) ?? 0) + v.value);
    if (userId && v.userId === userId) userArgVotes.set(v.argumentId, v.value);
  }

  // Compute question scores and current user's votes
  const qScores = new Map<string, number>();
  const userQVotes = new Map<string, number>();
  for (const v of allQVotes) {
    qScores.set(v.questionId, (qScores.get(v.questionId) ?? 0) + v.value);
    if (userId && v.userId === userId) userQVotes.set(v.questionId, v.value);
  }

  // Index questions by the argument they belong to
  const questionsByArgId = new Map<string, typeof allQuestions>();
  for (const q of allQuestions) {
    const list = questionsByArgId.get(q.argumentId) ?? [];
    list.push(q);
    questionsByArgId.set(q.argumentId, list);
  }

  // Index child arguments by parent, and replies by question
  const childrenByParentId = new Map<string, typeof allArguments>();
  const repliesByQuestionId = new Map<string, typeof allArguments>();

  for (const arg of allArguments) {
    if (arg.parentId) {
      const list = childrenByParentId.get(arg.parentId) ?? [];
      list.push(arg);
      childrenByParentId.set(arg.parentId, list);
    }
    if (arg.questionId) {
      const list = repliesByQuestionId.get(arg.questionId) ?? [];
      list.push(arg);
      repliesByQuestionId.set(arg.questionId, list);
    }
  }

  // Recursively build a single argument node
  function buildArgument(row: (typeof allArguments)[number]): Argument {
    const children = childrenByParentId.get(row.id) ?? [];
    const questions = questionsByArgId.get(row.id) ?? [];

    return {
      id: row.id,
      content: row.content,
      imageUrl: row.imageUrl,
      kind: row.kind,
      tag: row.tag,
      author: row.author,
      createdAt: row.createdAt.toISOString(),
      score: argScores.get(row.id) ?? 0,
      userVote: userArgVotes.get(row.id) ?? null,
      questions: questions.map(buildQuestion),
      supports: children.filter((c) => c.kind === "SUPPORT").map(buildArgument),
      counters: children.filter((c) => c.kind === "COUNTER").map(buildArgument),
    };
  }

  function buildQuestion(row: (typeof allQuestions)[number]): Question {
    const replies = repliesByQuestionId.get(row.id) ?? [];
    return {
      id: row.id,
      content: row.content,
      imageUrl: row.imageUrl,
      author: row.author,
      createdAt: row.createdAt.toISOString(),
      score: qScores.get(row.id) ?? 0,
      userVote: userQVotes.get(row.id) ?? null,
      replies: replies.map(buildArgument),
    };
  }

  // Root arguments, newest first
  return allArguments
    .filter((a) => a.kind === "ROOT")
    .map(buildArgument)
    .reverse();
}

export async function createRootArgument(authorId: string, content: string, imageUrl?: string, tag?: string) {
  return prisma.argument.create({
    data: { content, imageUrl, kind: "ROOT", authorId, tag: tag as any },
  });
}

export async function addSupport(parentId: string, authorId: string, content: string, imageUrl?: string) {
  return prisma.argument.create({
    data: { content, imageUrl, kind: "SUPPORT", authorId, parentId },
  });
}

export async function addCounter(parentId: string, authorId: string, content: string, imageUrl?: string) {
  return prisma.argument.create({
    data: { content, imageUrl, kind: "COUNTER", authorId, parentId },
  });
}

export async function addQuestion(argumentId: string, authorId: string, content: string, imageUrl?: string) {
  return prisma.question.create({
    data: { content, imageUrl, authorId, argumentId },
  });
}

export async function addReply(questionId: string, authorId: string, content: string, imageUrl?: string) {
  return prisma.argument.create({
    data: { content, imageUrl, kind: "REPLY", authorId, questionId },
  });
}

// Toggle vote: same value again removes the vote, different value flips it
export async function voteOnArgument(argumentId: string, userId: string, value: number) {
  const existing = await prisma.argumentVote.findUnique({
    where: { userId_argumentId: { userId, argumentId } },
  });

  if (existing?.value === value) {
    await prisma.argumentVote.delete({ where: { id: existing.id } });
  } else {
    await prisma.argumentVote.upsert({
      where: { userId_argumentId: { userId, argumentId } },
      update: { value },
      create: { userId, argumentId, value },
    });
  }
}

export async function voteOnQuestion(questionId: string, userId: string, value: number) {
  const existing = await prisma.questionVote.findUnique({
    where: { userId_questionId: { userId, questionId } },
  });

  if (existing?.value === value) {
    await prisma.questionVote.delete({ where: { id: existing.id } });
  } else {
    await prisma.questionVote.upsert({
      where: { userId_questionId: { userId, questionId } },
      update: { value },
      create: { userId, questionId, value },
    });
  }
}
