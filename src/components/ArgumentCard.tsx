"use client";

import { useState } from "react";
import {
  Avatar, Badge, Box, Button, Card, DropdownMenu, Flex, IconButton, Text,
} from "@radix-ui/themes";
import {
  CaretSortIcon, ChatBubbleIcon, CheckCircledIcon, CrossCircledIcon,
  Pencil2Icon, QuestionMarkCircledIcon, ThickArrowDownIcon, ThickArrowUpIcon,
} from "@radix-ui/react-icons";
import type { Argument, ArgumentKind, Question } from "@/types/argument";
import { timeAgo } from "@/lib/timeAgo";

// Count all nested replies across the entire subtree
function deepReplyCount(arg: Argument): number {
  let count = arg.questions.length + arg.supports.length + arg.counters.length;
  for (const q of arg.questions) {
    count += q.replies.length;
    for (const r of q.replies) count += deepReplyCount(r);
  }
  for (const s of arg.supports) count += deepReplyCount(s);
  for (const c of arg.counters) count += deepReplyCount(c);
  return count;
}

function deepQuestionReplyCount(q: Question): number {
  let count = q.replies.length;
  for (const r of q.replies) count += deepReplyCount(r);
  return count;
}

// For root posts with >= 10 replies, find level-1 children with >= 1/3 of total replies
function getHotChildren(arg: Argument): MergedItem[] {
  const total = deepReplyCount(arg);
  if (total < 10) return [];

  const threshold = total / 3;
  const hot: MergedItem[] = [];

  for (const q of arg.questions) {
    if (deepQuestionReplyCount(q) >= threshold) {
      hot.push({ kind: "question", question: q });
    }
  }
  for (const s of arg.supports) {
    if (deepReplyCount(s) >= threshold) {
      hot.push({ kind: "support", argument: s });
    }
  }
  for (const c of arg.counters) {
    if (deepReplyCount(c) >= threshold) {
      hot.push({ kind: "counter", argument: c });
    }
  }

  return hot;
}
import QuestionCard from "./QuestionCard";
import PostForm from "./PostForm";

type FormType = "question" | "support" | "counter";
type Section = "questions" | "supports" | "counters" | "all" | "nested";
type SortOrder = "votes" | "newest" | "oldest";

interface ArgumentCardProps {
  argument: Argument;
  isSignedIn: boolean;
  expandAll?: boolean;
  onAddQuestion: (argumentId: string, content: string, imageUrl?: string) => void;
  onAddSupport: (argumentId: string, content: string, imageUrl?: string) => void;
  onAddCounter: (argumentId: string, content: string, imageUrl?: string) => void;
  onAddReply: (questionId: string, content: string, imageUrl?: string) => void;
  onVoteArgument: (argumentId: string, value: number) => void;
  onVoteQuestion: (questionId: string, value: number) => void;
}

const kindBadge: Record<ArgumentKind, { label: string; color: "green" | "red" | "cyan" } | null> = {
  ROOT: null,
  SUPPORT: { label: "Supporting", color: "green" },
  COUNTER: { label: "Counter", color: "red" },
  REPLY: { label: "Reply", color: "cyan" },
};

const tagColors: Record<string, "red" | "blue" | "green" | "orange" | "purple" | "cyan" | "yellow" | "pink"> = {
  NEWS: "red",
  TECH: "blue",
  EDUCATION: "green",
  POLITICS: "orange",
  RELIGION: "purple",
  GAMING: "cyan",
  SPORTS: "yellow",
  ENTERTAINMENT: "pink",
};

const formPlaceholders: Record<FormType, string> = {
  question: "Ask a question...",
  support: "Write a supporting argument...",
  counter: "Write a counter-argument...",
};

const sortLabels: Record<SortOrder, string> = {
  votes: "Top voted",
  newest: "Newest first",
  oldest: "Oldest first",
};

type MergedItem =
  | { kind: "question"; question: Question }
  | { kind: "support" | "counter"; argument: Argument };

function getMergedItems(argument: Argument, sort: SortOrder): MergedItem[] {
  const items: MergedItem[] = [
    ...argument.questions.map((q) => ({ kind: "question" as const, question: q })),
    ...argument.supports.map((a) => ({ kind: "support" as const, argument: a })),
    ...argument.counters.map((a) => ({ kind: "counter" as const, argument: a })),
  ];

  const getScore = (item: MergedItem) =>
    item.kind === "question" ? item.question.score : item.argument.score;
  const getDate = (item: MergedItem) =>
    item.kind === "question" ? item.question.createdAt : item.argument.createdAt;

  return items.sort((a, b) => {
    if (sort === "votes") return getScore(b) - getScore(a);
    if (sort === "newest") return getDate(b).localeCompare(getDate(a));
    return getDate(a).localeCompare(getDate(b));
  });
}

function sortArguments(args: Argument[], sort: SortOrder): Argument[] {
  return [...args].sort((a, b) => {
    if (sort === "votes") return b.score - a.score;
    if (sort === "newest") return b.createdAt.localeCompare(a.createdAt);
    return a.createdAt.localeCompare(b.createdAt);
  });
}

function sortQuestions(qs: Question[], sort: SortOrder): Question[] {
  return [...qs].sort((a, b) => {
    if (sort === "votes") return b.score - a.score;
    if (sort === "newest") return b.createdAt.localeCompare(a.createdAt);
    return a.createdAt.localeCompare(b.createdAt);
  });
}

export default function ArgumentCard({
  argument,
  isSignedIn,
  onAddQuestion,
  onAddSupport,
  onAddCounter,
  onAddReply,
  onVoteArgument,
  onVoteQuestion,
  expandAll,
}: ArgumentCardProps) {
  const [expanded, setExpanded] = useState<Section | null>(null);
  const effectiveExpanded = expandAll ? "nested" : expanded;
  const [sortOrder, setSortOrder] = useState<SortOrder>("oldest");
  const [activeForm, setActiveForm] = useState<FormType | null>(null);

  function toggleSection(section: Section) {
    setExpanded((prev) => (prev === section ? null : section));
  }

  function handleFormSubmit(content: string, imageUrl?: string) {
    if (activeForm === "question") onAddQuestion(argument.id, content, imageUrl);
    else if (activeForm === "support") onAddSupport(argument.id, content, imageUrl);
    else if (activeForm === "counter") onAddCounter(argument.id, content, imageUrl);
    setActiveForm(null);
  }

  const badge = kindBadge[argument.kind];
  const childProps = { isSignedIn, onAddQuestion, onAddSupport, onAddCounter, onAddReply, onVoteArgument, onVoteQuestion, expandAll: effectiveExpanded === "nested" };
  const totalChildren = argument.questions.length + argument.supports.length + argument.counters.length;
  const hotChildren = argument.kind === "ROOT" ? getHotChildren(argument) : [];

  return (
    <Flex direction="column" gap="3">
      <Card>
        <Flex gap="3">
          {isSignedIn && (
            <Flex direction="column" align="center" gap="0" style={{ minWidth: 32 }}>
              <IconButton
                size="1"
                variant={argument.userVote === 1 ? "solid" : "ghost"}
                color="green"
                onClick={() => onVoteArgument(argument.id, 1)}
              >
                <ThickArrowUpIcon />
              </IconButton>
              <Text size="2" weight="medium" color={argument.score > 0 ? "green" : argument.score < 0 ? "red" : "gray"}>
                {argument.score}
              </Text>
              <IconButton
                size="1"
                variant={argument.userVote === -1 ? "solid" : "ghost"}
                color="red"
                onClick={() => onVoteArgument(argument.id, -1)}
              >
                <ThickArrowDownIcon />
              </IconButton>
            </Flex>
          )}
          <Flex direction="column" gap="3" flexGrow="1">
            <Flex gap="2" align="center">
              {badge && (
                <Badge color={badge.color} variant="soft" size="1">
                  {badge.label}
                </Badge>
              )}
              <Avatar
                size="1"
                radius="full"
                src={argument.author.image ?? undefined}
                fallback={argument.author.name?.[0] ?? "?"}
              />
              <Text size="1" color="gray">{argument.author.name}</Text>
              <Text size="1" color="gray">·</Text>
              <Text size="1" color="gray">{timeAgo(argument.createdAt)}</Text>
              {argument.tag && (
                <>
                  <Text size="1" color="gray">·</Text>
                  <Badge color={tagColors[argument.tag]} variant="outline" size="1">
                    {argument.tag.charAt(0) + argument.tag.slice(1).toLowerCase()}
                  </Badge>
                </>
              )}
            </Flex>
            <Text size="3">{argument.content}</Text>
            {argument.imageUrl && (
              <Box style={{ borderRadius: 6, overflow: "hidden", maxWidth: 400 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={argument.imageUrl} alt="" style={{ width: "100%", display: "block" }} />
              </Box>
            )}
            <Flex gap="4" align="center">
              <Flex gap="1" align="center">
                <IconButton
                  size="1"
                  variant={expanded === "questions" ? "solid" : "ghost"}
                  color="purple"
                  disabled={argument.questions.length === 0}
                  onClick={() => toggleSection("questions")}
                >
                  <QuestionMarkCircledIcon />
                </IconButton>
                <Text size="1" color="gray">{argument.questions.length}</Text>
              </Flex>

              <Flex gap="1" align="center">
                <IconButton
                  size="1"
                  variant={expanded === "supports" ? "solid" : "ghost"}
                  color="green"
                  disabled={argument.supports.length === 0}
                  onClick={() => toggleSection("supports")}
                >
                  <CheckCircledIcon />
                </IconButton>
                <Text size="1" color="gray">{argument.supports.length}</Text>
              </Flex>

              <Flex gap="1" align="center">
                <IconButton
                  size="1"
                  variant={expanded === "counters" ? "solid" : "ghost"}
                  color="red"
                  disabled={argument.counters.length === 0}
                  onClick={() => toggleSection("counters")}
                >
                  <CrossCircledIcon />
                </IconButton>
                <Text size="1" color="gray">{argument.counters.length}</Text>
              </Flex>

              <Flex gap="1" align="center">
                <IconButton
                  size="1"
                  variant={effectiveExpanded === "nested" ? "solid" : "ghost"}
                  color="gray"
                  disabled={deepReplyCount(argument) === 0}
                  onClick={() => toggleSection("nested")}
                >
                  <ChatBubbleIcon />
                </IconButton>
                <Text size="1" color="gray">{deepReplyCount(argument)}</Text>
              </Flex>

              {effectiveExpanded && (
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger>
                    <Button variant="ghost" color="gray" size="1">
                      <CaretSortIcon />
                      {sortLabels[sortOrder]}
                    </Button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content size="1">
                    <DropdownMenu.Item onClick={() => setSortOrder("votes")}>Top voted</DropdownMenu.Item>
                    <DropdownMenu.Item onClick={() => setSortOrder("newest")}>Newest first</DropdownMenu.Item>
                    <DropdownMenu.Item onClick={() => setSortOrder("oldest")}>Oldest first</DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Root>
              )}

              {isSignedIn && (
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger>
                    <IconButton size="1" variant={activeForm ? "solid" : "ghost"} color="gray">
                      <Pencil2Icon />
                    </IconButton>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content size="1">
                    <DropdownMenu.Item color="purple" onClick={() => setActiveForm("question")}>
                      Question
                    </DropdownMenu.Item>
                    <DropdownMenu.Item color="green" onClick={() => setActiveForm("support")}>
                      Support
                    </DropdownMenu.Item>
                    <DropdownMenu.Item color="red" onClick={() => setActiveForm("counter")}>
                      Counter
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Root>
              )}
            </Flex>
          </Flex>
        </Flex>
      </Card>

      {activeForm && (
        <Box className="thread-indent">
          <PostForm
            placeholder={formPlaceholders[activeForm]}
            submitLabel="Submit"
            onSubmit={handleFormSubmit}
            onCancel={() => setActiveForm(null)}
          />
        </Box>
      )}

      {effectiveExpanded === null && hotChildren.length > 0 && (
        <Flex direction="column" gap="2">
          {hotChildren.map((item) => {
            const borderColor =
              item.kind === "question" ? "var(--purple-6)" :
              item.kind === "support" ? "var(--green-6)" : "var(--red-6)";
            return (
              <Box key={item.kind === "question" ? item.question.id : item.argument.id} className="thread-indent" style={{ borderLeft: `2px solid ${borderColor}` }}>
                {item.kind === "question" ? (
                  <QuestionCard question={item.question} {...childProps} />
                ) : (
                  <ArgumentCard argument={item.argument} {...childProps} />
                )}
              </Box>
            );
          })}
        </Flex>
      )}

      {effectiveExpanded === "all" && totalChildren > 0 && (
        <Flex direction="column" gap="2">
          {getMergedItems(argument, sortOrder).map((item) => {
            const borderColor =
              item.kind === "question" ? "var(--purple-6)" :
              item.kind === "support" ? "var(--green-6)" : "var(--red-6)";
            return (
              <Box key={item.kind === "question" ? item.question.id : item.argument.id} className="thread-indent" style={{ borderLeft: `2px solid ${borderColor}` }}>
                {item.kind === "question" ? (
                  <QuestionCard question={item.question} {...childProps} />
                ) : (
                  <ArgumentCard argument={item.argument} {...childProps} />
                )}
              </Box>
            );
          })}
        </Flex>
      )}

      {effectiveExpanded === "questions" && argument.questions.length > 0 && (
        <Box className="thread-indent" style={{ borderLeft: "2px solid var(--purple-6)" }}>
          <Flex direction="column" gap="2">
            {sortQuestions(argument.questions, sortOrder).map((q) => (
              <QuestionCard key={q.id} question={q} {...childProps} />
            ))}
          </Flex>
        </Box>
      )}

      {effectiveExpanded === "supports" && argument.supports.length > 0 && (
        <Box className="thread-indent" style={{ borderLeft: "2px solid var(--green-6)" }}>
          <Flex direction="column" gap="2">
            {sortArguments(argument.supports, sortOrder).map((s) => (
              <ArgumentCard key={s.id} argument={s} {...childProps} />
            ))}
          </Flex>
        </Box>
      )}

      {effectiveExpanded === "counters" && argument.counters.length > 0 && (
        <Box className="thread-indent" style={{ borderLeft: "2px solid var(--red-6)" }}>
          <Flex direction="column" gap="2">
            {sortArguments(argument.counters, sortOrder).map((c) => (
              <ArgumentCard key={c.id} argument={c} {...childProps} />
            ))}
          </Flex>
        </Box>
      )}

      {effectiveExpanded === "nested" && (
        <Flex direction="column" gap="2">
          {argument.questions.length > 0 && (
            <Box className="thread-indent" style={{ borderLeft: "2px solid var(--purple-6)" }}>
              <Flex direction="column" gap="2">
                {sortQuestions(argument.questions, sortOrder).map((q) => (
                  <QuestionCard key={q.id} question={q} {...childProps} />
                ))}
              </Flex>
            </Box>
          )}
          {argument.supports.length > 0 && (
            <Box className="thread-indent" style={{ borderLeft: "2px solid var(--green-6)" }}>
              <Flex direction="column" gap="2">
                {sortArguments(argument.supports, sortOrder).map((s) => (
                  <ArgumentCard key={s.id} argument={s} {...childProps} />
                ))}
              </Flex>
            </Box>
          )}
          {argument.counters.length > 0 && (
            <Box className="thread-indent" style={{ borderLeft: "2px solid var(--red-6)" }}>
              <Flex direction="column" gap="2">
                {sortArguments(argument.counters, sortOrder).map((c) => (
                  <ArgumentCard key={c.id} argument={c} {...childProps} />
                ))}
              </Flex>
            </Box>
          )}
        </Flex>
      )}
    </Flex>
  );
}
