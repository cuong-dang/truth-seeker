import { prisma } from "./prisma";
import type { Argument, Question } from "@/types/argument";

const authorSelect = { id: true, name: true, image: true } as const;

// ─── Internal: build full tree in memory ─────────

interface FullArgument extends Argument {
  _questions: FullQuestion[];
  _supports: FullArgument[];
  _counters: FullArgument[];
}

interface FullQuestion extends Question {
  _replies: FullArgument[];
}

function deepCount(arg: FullArgument): number {
  let count = arg._questions.length + arg._supports.length + arg._counters.length;
  for (const q of arg._questions) {
    count += q._replies.length;
    for (const r of q._replies) count += deepCount(r);
  }
  for (const s of arg._supports) count += deepCount(s);
  for (const c of arg._counters) count += deepCount(c);
  return count;
}

function questionDeepCount(q: FullQuestion): number {
  let count = q._replies.length;
  for (const r of q._replies) count += deepCount(r);
  return count;
}

// Strips a FullArgument down to a shallow Argument (counts only, no children)
function toShallow(arg: FullArgument): Argument {
  return {
    id: arg.id,
    content: arg.content,
    imageUrl: arg.imageUrl,
    kind: arg.kind,
    tag: arg.tag,
    author: arg.author,
    createdAt: arg.createdAt,
    score: arg.score,
    userVote: arg.userVote,
    questionCount: arg._questions.length,
    supportCount: arg._supports.length,
    counterCount: arg._counters.length,
    totalReplyCount: deepCount(arg),
    questions: [],
    supports: [],
    counters: [],
  };
}

function questionToShallow(q: FullQuestion): Question {
  return {
    id: q.id,
    content: q.content,
    imageUrl: q.imageUrl,
    author: q.author,
    createdAt: q.createdAt,
    score: q.score,
    userVote: q.userVote,
    replyCount: q._replies.length,
    totalReplyCount: questionDeepCount(q),
    replies: [],
  };
}

async function buildFullTree(userId?: string): Promise<FullArgument[]> {
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

  const argScores = new Map<string, number>();
  const userArgVotes = new Map<string, number>();
  for (const v of allArgVotes) {
    argScores.set(v.argumentId, (argScores.get(v.argumentId) ?? 0) + v.value);
    if (userId && v.userId === userId) userArgVotes.set(v.argumentId, v.value);
  }

  const qScores = new Map<string, number>();
  const userQVotes = new Map<string, number>();
  for (const v of allQVotes) {
    qScores.set(v.questionId, (qScores.get(v.questionId) ?? 0) + v.value);
    if (userId && v.userId === userId) userQVotes.set(v.questionId, v.value);
  }

  const questionsByArgId = new Map<string, typeof allQuestions>();
  for (const q of allQuestions) {
    const list = questionsByArgId.get(q.argumentId) ?? [];
    list.push(q);
    questionsByArgId.set(q.argumentId, list);
  }

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

  function buildArg(row: (typeof allArguments)[number]): FullArgument {
    const children = childrenByParentId.get(row.id) ?? [];
    const questions = questionsByArgId.get(row.id) ?? [];
    const builtQuestions = questions.map(buildQ);
    const builtSupports = children.filter((c: { kind: string }) => c.kind === "SUPPORT").map(buildArg);
    const builtCounters = children.filter((c: { kind: string }) => c.kind === "COUNTER").map(buildArg);

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
      questionCount: builtQuestions.length,
      supportCount: builtSupports.length,
      counterCount: builtCounters.length,
      totalReplyCount: 0, // computed after construction
      questions: [],
      supports: [],
      counters: [],
      _questions: builtQuestions,
      _supports: builtSupports,
      _counters: builtCounters,
    };
  }

  function buildQ(row: (typeof allQuestions)[number]): FullQuestion {
    const replies = repliesByQuestionId.get(row.id) ?? [];
    const builtReplies = replies.map(buildArg);
    return {
      id: row.id,
      content: row.content,
      imageUrl: row.imageUrl,
      author: row.author,
      createdAt: row.createdAt.toISOString(),
      score: qScores.get(row.id) ?? 0,
      userVote: userQVotes.get(row.id) ?? null,
      replyCount: builtReplies.length,
      totalReplyCount: 0,
      replies: [],
      _replies: builtReplies,
    };
  }

  const roots = allArguments
    .filter((a) => a.kind === "ROOT")
    .map(buildArg)
    .reverse();

  // Fill in totalReplyCount and questionTotalReplyCount
  function fillCounts(arg: FullArgument) {
    for (const q of arg._questions) {
      for (const r of q._replies) fillCounts(r);
      q.totalReplyCount = questionDeepCount(q);
    }
    for (const s of arg._supports) fillCounts(s);
    for (const c of arg._counters) fillCounts(c);
    arg.totalReplyCount = deepCount(arg);
  }
  roots.forEach(fillCounts);

  return roots;
}

// Find an argument anywhere in the tree
function findArg(roots: FullArgument[], id: string): FullArgument | null {
  for (const root of roots) {
    if (root.id === id) return root;
    for (const q of root._questions) {
      for (const r of q._replies) {
        const found = findArg([r], id);
        if (found) return found;
      }
    }
    for (const s of root._supports) {
      const found = findArg([s], id);
      if (found) return found;
    }
    for (const c of root._counters) {
      const found = findArg([c], id);
      if (found) return found;
    }
  }
  return null;
}

function findQuestion(roots: FullArgument[], id: string): FullQuestion | null {
  for (const root of roots) {
    for (const q of root._questions) {
      if (q.id === id) return q;
      for (const r of q._replies) {
        const found = findQuestion([r], id);
        if (found) return found;
      }
    }
    for (const s of root._supports) {
      const found = findQuestion([s], id);
      if (found) return found;
    }
    for (const c of root._counters) {
      const found = findQuestion([c], id);
      if (found) return found;
    }
  }
  return null;
}

// Convert a FullArgument to Argument with full nested children
function toDeep(arg: FullArgument): Argument {
  return {
    id: arg.id,
    content: arg.content,
    imageUrl: arg.imageUrl,
    kind: arg.kind,
    tag: arg.tag,
    author: arg.author,
    createdAt: arg.createdAt,
    score: arg.score,
    userVote: arg.userVote,
    questionCount: arg._questions.length,
    supportCount: arg._supports.length,
    counterCount: arg._counters.length,
    totalReplyCount: arg.totalReplyCount,
    questions: arg._questions.map(questionToDeep),
    supports: arg._supports.map(toDeep),
    counters: arg._counters.map(toDeep),
  };
}

function questionToDeep(q: FullQuestion): Question {
  return {
    id: q.id,
    content: q.content,
    imageUrl: q.imageUrl,
    author: q.author,
    createdAt: q.createdAt,
    score: q.score,
    userVote: q.userVote,
    replyCount: q._replies.length,
    totalReplyCount: q.totalReplyCount,
    replies: q._replies.map(toDeep),
  };
}

// ─── Public API ──────────────────────────────────

export async function getRootArguments(userId?: string, skip = 0, limit = 10) {
  const [rootRows, total] = await Promise.all([
    prisma.argument.findMany({
      where: { kind: "ROOT" },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: { author: { select: authorSelect } },
    }),
    prisma.argument.count({ where: { kind: "ROOT" } }),
  ]);

  // For each root, compute counts with targeted queries
  const rootIds = rootRows.map((r) => r.id);

  const [questionCounts, supportCounts, counterCounts] = await Promise.all([
    prisma.question.groupBy({ by: ["argumentId"], where: { argumentId: { in: rootIds } }, _count: true }),
    prisma.argument.groupBy({ by: ["parentId"], where: { parentId: { in: rootIds }, kind: "SUPPORT" }, _count: true }),
    prisma.argument.groupBy({ by: ["parentId"], where: { parentId: { in: rootIds }, kind: "COUNTER" }, _count: true }),
  ]);

  const qCountMap = new Map(questionCounts.map((r: { argumentId: string; _count: number }) => [r.argumentId, r._count]));
  const sCountMap = new Map(supportCounts.map((r: { parentId: string | null; _count: number }) => [r.parentId!, r._count]));
  const cCountMap = new Map(counterCounts.map((r: { parentId: string | null; _count: number }) => [r.parentId!, r._count]));

  // Get vote scores and user votes for these roots
  const argVotes = await prisma.argumentVote.findMany({
    where: { argumentId: { in: rootIds } },
  });

  const scoreMap = new Map<string, number>();
  const userVoteMap = new Map<string, number>();
  for (const v of argVotes) {
    scoreMap.set(v.argumentId, (scoreMap.get(v.argumentId) ?? 0) + v.value);
    if (userId && v.userId === userId) userVoteMap.set(v.argumentId, v.value);
  }

  // Compute totalReplyCount per root via recursive CTE
  // Single recursive term using a UNION inside a subquery joined to the tree
  const totalReplyCounts = await Promise.all(
    rootIds.map(async (id: string) => {
      const result = await prisma.$queryRaw<[{ count: bigint }]>`
        WITH RECURSIVE tree AS (
          SELECT ${id}::text AS nid
          UNION
          SELECT child.nid FROM (
            SELECT a.id::text AS nid, a."parentId"::text AS pid FROM "Argument" a WHERE a."parentId" IS NOT NULL
            UNION ALL
            SELECT a.id::text AS nid, a."questionId"::text AS pid FROM "Argument" a WHERE a."questionId" IS NOT NULL
            UNION ALL
            SELECT q.id::text AS nid, q."argumentId"::text AS pid FROM "Question" q
          ) child
          INNER JOIN tree t ON child.pid = t.nid
        )
        SELECT COUNT(*) - 1 AS count FROM tree
      `;
      return { id, count: Number(result[0].count) };
    })
  );
  const totalReplyMap = new Map(totalReplyCounts.map((r: { id: string; count: number }) => [r.id, r.count]));

  const arguments_: Argument[] = rootRows.map((row: typeof rootRows[number]) => ({
    id: row.id,
    content: row.content,
    imageUrl: row.imageUrl,
    kind: row.kind,
    tag: row.tag,
    author: row.author,
    createdAt: row.createdAt.toISOString(),
    score: scoreMap.get(row.id) ?? 0,
    userVote: userVoteMap.get(row.id) ?? null,
    questionCount: qCountMap.get(row.id) ?? 0,
    supportCount: sCountMap.get(row.id) ?? 0,
    counterCount: cCountMap.get(row.id) ?? 0,
    totalReplyCount: totalReplyMap.get(row.id) ?? 0,
    questions: [],
    supports: [],
    counters: [],
  }));

  return { arguments: arguments_, total };
}

export async function getChildArguments(
  argumentId: string,
  section: "questions" | "supports" | "counters",
  userId?: string,
  skip = 0,
  limit = 10
) {
  const roots = await buildFullTree(userId);
  const arg = findArg(roots, argumentId);
  if (!arg) return { items: [], total: 0 };

  if (section === "questions") {
    const items = arg._questions;
    return {
      items: items.slice(skip, skip + limit).map(questionToShallow),
      total: items.length,
    };
  }

  const items = section === "supports" ? arg._supports : arg._counters;
  return {
    items: items.slice(skip, skip + limit).map(toShallow),
    total: items.length,
  };
}

export async function getQuestionReplies(
  questionId: string,
  userId?: string,
  skip = 0,
  limit = 10
) {
  const roots = await buildFullTree(userId);
  const q = findQuestion(roots, questionId);
  if (!q) return { items: [], total: 0 };

  return {
    items: q._replies.slice(skip, skip + limit).map(toShallow),
    total: q._replies.length,
  };
}

export async function getFullSubtree(argumentId: string, userId?: string): Promise<Argument | null> {
  const roots = await buildFullTree(userId);
  const arg = findArg(roots, argumentId);
  if (!arg) return null;
  return toDeep(arg);
}

// ─── Mutations ───────────────────────────────────

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
